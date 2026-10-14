import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER } from '../../infrastructure/payment/payment-provider.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanTier, SubscriptionStatus, PaymentStatus } from '@prisma/client';

describe('SubscriptionsService (Phase 3 Acceptance Tests)', () => {
  let service: SubscriptionsService;
  let prisma: any;
  let paymentProvider: any;
  let configService: any;

  const mockFreePlan = {
    id: 'plan_free_id',
    name: 'Free Tier',
    code: PlanTier.FREE,
    priceMonthly: 0,
    priceYearly: 0,
    isActive: true,
    entitlements: {
      maxUsers: 5,
      maxStorageMb: 1000,
      features: ['people', 'projects', 'tasks', 'time'],
    },
  };

  const mockStarterPlan = {
    id: 'plan_starter_id',
    name: 'Starter Growth',
    code: PlanTier.STARTER,
    priceMonthly: 4999,
    priceYearly: 49990,
    isActive: true,
    entitlements: {
      maxUsers: 25,
      maxStorageMb: 10000,
      features: ['people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'leave', 'approvals', 'quality', 'sla', 'clients'],
    },
  };

  beforeEach(async () => {
    prisma = {
      plan: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      membership: {
        count: jest.fn(),
      },
      invitation: {
        count: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    paymentProvider = {
      createOrder: jest.fn(),
      verifyPaymentSignature: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'razorpay.keyId') return 'rzp_test_mock_key';
        if (key === 'razorpay.webhookSecret') return 'whsec_test_mock_secret';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: PAYMENT_PROVIDER, useValue: paymentProvider },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('1. Three Subscription Plans Seed & Retrieval', () => {
    it('should list exactly the three commercial tiers (FREE, STARTER, BUSINESS)', async () => {
      prisma.plan.findMany.mockResolvedValue([mockFreePlan, mockStarterPlan]);

      const result = await service.listPlans();

      expect(prisma.plan.upsert).toHaveBeenCalledTimes(3);
      expect(prisma.plan.updateMany).toHaveBeenCalledWith({
        where: { code: { notIn: [PlanTier.FREE, PlanTier.STARTER, PlanTier.BUSINESS] } },
        data: { isActive: false },
      });
      expect(result).toBeDefined();
    });
  });

  describe('2. Workspace Subscription & Expiry/Grace Period Policy', () => {
    it('should auto-provision Free Tier subscription if workspace has none', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.plan.findFirst.mockResolvedValue(mockFreePlan);
      prisma.subscription.create.mockResolvedValue({
        id: 'sub_new',
        workspaceId: 'ws_1',
        planId: mockFreePlan.id,
        status: SubscriptionStatus.ACTIVE,
        plan: mockFreePlan,
      });
      prisma.membership.count.mockResolvedValue(1);
      prisma.invitation.count.mockResolvedValue(0);
      prisma.invoice.findMany.mockResolvedValue([]);

      const sub = await service.getWorkspaceSubscription('ws_1');

      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws_1',
            status: SubscriptionStatus.ACTIVE,
            seatCount: 5,
          }),
        }),
      );
      expect(sub.activeMembersCount).toBe(1);
    });

    it('should transition to PAST_DUE during 7-day grace period on expired paid subscriptions', async () => {
      const pastEndDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const existingSub = {
        id: 'sub_paid',
        workspaceId: 'ws_1',
        plan: mockStarterPlan,
        currentPeriodEnd: pastEndDate,
        status: SubscriptionStatus.ACTIVE,
      };

      prisma.subscription.findFirst.mockResolvedValue(existingSub);
      prisma.subscription.update.mockResolvedValue({ ...existingSub, status: SubscriptionStatus.PAST_DUE });
      prisma.membership.count.mockResolvedValue(5);
      prisma.invitation.count.mockResolvedValue(0);
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.getWorkspaceSubscription('ws_1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: SubscriptionStatus.PAST_DUE },
        }),
      );
      expect(result.status).toBe(SubscriptionStatus.PAST_DUE);
    });

    it('should transition to UNPAID after 7 days past end without deleting any data', async () => {
      const pastEndDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const existingSub = {
        id: 'sub_paid',
        workspaceId: 'ws_1',
        plan: mockStarterPlan,
        currentPeriodEnd: pastEndDate,
        status: SubscriptionStatus.PAST_DUE,
      };

      prisma.subscription.findFirst.mockResolvedValue(existingSub);
      prisma.subscription.update.mockResolvedValue({ ...existingSub, status: SubscriptionStatus.UNPAID });
      prisma.membership.count.mockResolvedValue(5);
      prisma.invitation.count.mockResolvedValue(0);
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.getWorkspaceSubscription('ws_1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: SubscriptionStatus.UNPAID },
        }),
      );
      expect(result.status).toBe(SubscriptionStatus.UNPAID);
    });
  });

  describe('3. Checkout Order Generation', () => {
    it('should throw BadRequestException for Free tier checkout', async () => {
      prisma.plan.findUnique.mockResolvedValue(mockFreePlan);

      await expect(service.createCheckoutOrder('ws_1', mockFreePlan.id, 'monthly')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create order with annual discount pricing for yearly billing', async () => {
      prisma.plan.findUnique.mockResolvedValue(mockStarterPlan);
      paymentProvider.createOrder.mockResolvedValue({
        orderId: 'order_test_123',
        amount: 4999000,
        currency: 'INR',
        status: 'created',
      });
      prisma.payment.create.mockResolvedValue({ id: 'pay_rec_1' });

      const checkout = await service.createCheckoutOrder('ws_1', mockStarterPlan.id, 'yearly');

      expect(paymentProvider.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 4999000,
          currency: 'INR',
        }),
      );
      expect(checkout.orderId).toBe('order_test_123');
      expect(checkout.keyId).toBe('rzp_test_mock_key');
    });
  });

  describe('4. Strict Cryptographic Payment Verification & Idempotency', () => {
    it('should reject payment if signature verification fails and mark payment FAILED', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay_1',
        workspaceId: 'ws_1',
        razorpayOrderId: 'order_1',
        status: PaymentStatus.PENDING,
      });
      paymentProvider.verifyPaymentSignature.mockReturnValue(false);

      await expect(
        service.verifyPayment('ws_1', {
          orderId: 'order_1',
          paymentId: 'pay_rzp_1',
          signature: 'invalid_sig',
          planId: mockStarterPlan.id,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_1' },
        data: { status: PaymentStatus.FAILED },
      });
    });

    it('should return existing subscription idempotently if payment is already SUCCESSFUL', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay_1',
        workspaceId: 'ws_1',
        razorpayOrderId: 'order_1',
        status: PaymentStatus.SUCCESSFUL,
      });
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_active',
        workspaceId: 'ws_1',
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await service.verifyPayment('ws_1', {
        orderId: 'order_1',
        paymentId: 'pay_rzp_1',
        signature: 'valid_sig',
        planId: mockStarterPlan.id,
      });

      expect(result.isDuplicate).toBe(true);
      expect(paymentProvider.verifyPaymentSignature).not.toHaveBeenCalled();
    });

    it('should atomically activate subscription and generate invoice on valid signature', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay_1',
        workspaceId: 'ws_1',
        razorpayOrderId: 'order_1',
        amount: 4999,
        status: PaymentStatus.PENDING,
      });
      paymentProvider.verifyPaymentSignature.mockReturnValue(true);
      prisma.plan.findUnique.mockResolvedValue(mockStarterPlan);
      prisma.subscription.findFirst.mockResolvedValue({ id: 'sub_existing', workspaceId: 'ws_1' });
      prisma.subscription.update.mockResolvedValue({
        id: 'sub_existing',
        planId: mockStarterPlan.id,
        status: SubscriptionStatus.ACTIVE,
      });
      prisma.payment.update.mockResolvedValue({ id: 'pay_1', status: PaymentStatus.SUCCESSFUL });
      prisma.invoice.create.mockResolvedValue({ id: 'inv_1', invoiceNumber: 'INV-123456-7890' });

      const res = await service.verifyPayment('ws_1', {
        orderId: 'order_1',
        paymentId: 'pay_rzp_1',
        signature: 'valid_sig',
        planId: mockStarterPlan.id,
      });

      expect(res.message).toBe('Subscription upgraded successfully');
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws_1',
            status: 'PAID',
          }),
        }),
      );
    });
  });

  describe('5. Subscription Cancellation Policy', () => {
    it('should reject cancellation on Free tier', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_free',
        plan: mockFreePlan,
      });

      await expect(service.cancelSubscription('ws_1')).rejects.toThrow(BadRequestException);
    });

    it('should mark subscription CANCELLED while preserving periodEnd and all data', async () => {
      const activePaidSub = {
        id: 'sub_paid',
        workspaceId: 'ws_1',
        plan: mockStarterPlan,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      };

      prisma.subscription.findFirst.mockResolvedValue(activePaidSub);
      prisma.subscription.update.mockResolvedValue({
        ...activePaidSub,
        status: SubscriptionStatus.CANCELLED,
      });

      const res = await service.cancelSubscription('ws_1');

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_paid' },
        data: { status: SubscriptionStatus.CANCELLED },
        include: { plan: true },
      });
      expect(res.subscription.status).toBe(SubscriptionStatus.CANCELLED);
    });
  });
});
