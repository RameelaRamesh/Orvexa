import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PAYMENT_PROVIDER, PaymentProvider } from '../../infrastructure/payment/payment-provider.interface';
import { PlanTier, SubscriptionStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  /**
   * Seed and list the three official ORVEXA subscription plans
   */
  async listPlans() {
    // 3 Official ORVEXA Subscription Tiers
    const officialPlans = [
      {
        name: 'Free Tier',
        code: PlanTier.FREE,
        priceMonthly: 0,
        priceYearly: 0,
        entitlements: {
          maxUsers: 5,
          maxStorageMb: 1000,
          features: ['people', 'projects', 'tasks', 'time'],
          description: 'Essential organization and core work tracking for small teams.',
          conditions: 'Up to 5 team members. 1 GB storage. Core work management.',
        },
        isActive: true,
      },
      {
        name: 'Starter Growth',
        code: PlanTier.STARTER,
        priceMonthly: 4999,
        priceYearly: 49990,
        entitlements: {
          maxUsers: 25,
          maxStorageMb: 10000,
          features: [
            'people',
            'projects',
            'tasks',
            'work_queue',
            'time',
            'attendance',
            'leave',
            'approvals',
            'quality',
            'sla',
            'clients',
          ],
          description: 'Advanced operational workflows, queues, attendance, and SLA tracking for growing teams.',
          conditions: 'Up to 25 team members. 10 GB storage. 7-day payment grace period. 2 months free on annual billing.',
        },
        isActive: true,
      },
      {
        name: 'Business Pro',
        code: PlanTier.BUSINESS,
        priceMonthly: 14999,
        priceYearly: 149990,
        entitlements: {
          maxUsers: 100,
          maxStorageMb: 50000,
          features: ['all'],
          description: 'Full-spectrum enterprise operations, unrestricted modules, custom roles, and priority support.',
          conditions: 'Up to 100 team members. 50 GB storage. Unrestricted module access. 7-day payment grace period.',
        },
        isActive: true,
      },
    ];

    for (const planDef of officialPlans) {
      await this.prisma.plan.upsert({
        where: { code: planDef.code },
        update: {
          name: planDef.name,
          priceMonthly: planDef.priceMonthly,
          priceYearly: planDef.priceYearly,
          entitlements: planDef.entitlements,
          isActive: true,
        },
        create: planDef,
      });
    }

    // Deactivate non-commercial / unlisted plans (like ENTERPRISE placeholder)
    await this.prisma.plan.updateMany({
      where: {
        code: { notIn: [PlanTier.FREE, PlanTier.STARTER, PlanTier.BUSINESS] },
      },
      data: { isActive: false },
    });

    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  /**
   * Retrieve workspace subscription details, enforcing grace period and expiry policy
   */
  async getWorkspaceSubscription(workspaceId: string) {
    let sub = await this.prisma.subscription.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        payments: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!sub) {
      // Auto-provision Free Tier subscription
      let freePlan = await this.prisma.plan.findFirst({ where: { code: PlanTier.FREE, isActive: true } });
      if (!freePlan) {
        await this.listPlans();
        freePlan = await this.prisma.plan.findFirst({ where: { code: PlanTier.FREE } });
      }

      if (freePlan) {
        sub = await this.prisma.subscription.create({
          data: {
            workspaceId,
            planId: freePlan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            seatCount: 5,
          },
          include: { plan: true, payments: true },
        });
      }
    } else {
      // Expiry and Grace Period Lifecycle Policy:
      // - 7-day grace period on expired paid subscriptions transitions to PAST_DUE (access preserved)
      // - Beyond 7 days, transitions to UNPAID (customer data is NEVER deleted)
      const now = new Date();
      if (sub.plan?.code !== PlanTier.FREE && sub.currentPeriodEnd < now) {
        const daysPastEnd = (now.getTime() - new Date(sub.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24);
        if (daysPastEnd <= 7) {
          if (sub.status !== SubscriptionStatus.PAST_DUE) {
            sub = await this.prisma.subscription.update({
              where: { id: sub.id },
              data: { status: SubscriptionStatus.PAST_DUE },
              include: { plan: true, payments: { take: 5, orderBy: { createdAt: 'desc' } } },
            });
          }
        } else {
          if (sub.status !== SubscriptionStatus.UNPAID && sub.status !== SubscriptionStatus.CANCELLED) {
            sub = await this.prisma.subscription.update({
              where: { id: sub.id },
              data: { status: SubscriptionStatus.UNPAID },
              include: { plan: true, payments: { take: 5, orderBy: { createdAt: 'desc' } } },
            });
          }
        }
      }
    }

    // Active member seat usage
    const activeMembersCount = await this.prisma.membership.count({
      where: { workspaceId, status: 'ACTIVE' },
    });

    const pendingInvitationsCount = await this.prisma.invitation.count({
      where: { workspaceId, status: 'PENDING' },
    });

    // Invoices history
    const invoices = await this.prisma.invoice.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...sub,
      activeMembersCount,
      pendingInvitationsCount,
      invoices,
    };
  }

  /**
   * Create Razorpay order for subscription checkout
   */
  async createCheckoutOrder(workspaceId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Selected subscription plan not found or inactive');
    }

    if (plan.code === PlanTier.FREE) {
      throw new BadRequestException('Free tier does not require checkout or payment');
    }

    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const amountInPaise = Math.round(price * 100);
    const receiptId = `rcpt_${workspaceId.substring(0, 8)}_${Date.now()}`;

    const order = await this.paymentProvider.createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: { workspaceId, planId, billingCycle },
    });

    // Record pending payment in database
    const payment = await this.prisma.payment.create({
      data: {
        workspaceId,
        razorpayOrderId: order.orderId,
        amount: price,
        currency: 'INR',
        status: PaymentStatus.PENDING,
      },
    });

    const keyId = this.configService.get<string>('razorpay.keyId') || process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      throw new BadRequestException('Payment gateway key (RAZORPAY_KEY_ID) is not configured');
    }

    return {
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId,
      paymentId: payment.id,
      billingCycle,
      plan,
    };
  }

  /**
   * Idempotent payment verification using HMAC SHA256 signature
   * Atomically activates subscription, links payment, and creates invoice.
   */
  async verifyPayment(
    workspaceId: string,
    dto: { orderId: string; paymentId: string; signature: string; planId: string },
  ) {
    // 1. Locate payment order belonging to this workspace
    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: dto.orderId, workspaceId },
    });

    if (!payment) {
      throw new NotFoundException('Payment order not found for this workspace');
    }

    // 2. Idempotency Check: if payment is already marked SUCCESSFUL, return subscription immediately
    if (payment.status === PaymentStatus.SUCCESSFUL) {
      this.logger.log(`Payment order ${dto.orderId} already verified and active (idempotent replay)`);
      const existingSub = await this.prisma.subscription.findFirst({
        where: { workspaceId },
        include: { plan: true },
      });
      return {
        message: 'Payment already verified successfully',
        subscription: existingSub,
        isDuplicate: true,
      };
    }

    // 3. Cryptographic Signature Verification
    const isValid = this.paymentProvider.verifyPaymentSignature({
      orderId: dto.orderId,
      paymentId: dto.paymentId,
      signature: dto.signature,
    });

    if (!isValid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      this.logger.warn(`Signature verification failed for order ${dto.orderId}, payment ${dto.paymentId}`);
      throw new BadRequestException('Razorpay payment signature verification failed. Untrusted transaction.');
    }

    // 4. Retrieve plan and compute billing period
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Target subscription plan not found');
    }

    const isYearly = Math.round(payment.amount) === Math.round(plan.priceYearly);
    const periodDays = isYearly ? 365 : 30;
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);
    const seatCount = (plan.entitlements as any)?.maxUsers || 25;

    // 5. Execute atomic transaction to prevent orphaned or duplicate subscriptions
    const result = await this.prisma.$transaction(async (tx) => {
      // Find existing subscription for this workspace
      const existingSub = await tx.subscription.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });

      let activeSub;
      if (existingSub) {
        // Update existing subscription to ensure single subscription row per workspace
        activeSub = await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart,
            currentPeriodEnd,
            seatCount,
          },
          include: { plan: true },
        });
      } else {
        activeSub = await tx.subscription.create({
          data: {
            workspaceId,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart,
            currentPeriodEnd,
            seatCount,
          },
          include: { plan: true },
        });
      }

      // Mark payment SUCCESSFUL and link subscriptionId
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: dto.paymentId,
          subscriptionId: activeSub.id,
          status: PaymentStatus.SUCCESSFUL,
          paidAt: new Date(),
        },
      });

      // Generate corresponding Invoice record
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const invoice = await tx.invoice.create({
        data: {
          workspaceId,
          invoiceNumber,
          amount: payment.amount,
          tax: Math.round(payment.amount * 0.18 * 100) / 100, // 18% GST standard
          status: 'PAID',
          dueDate: new Date(),
          paidAt: new Date(),
        },
      });

      return { subscription: activeSub, payment: updatedPayment, invoice };
    });

    this.logger.log(`Workspace ${workspaceId} successfully upgraded to ${plan.name}`);

    return {
      message: 'Subscription upgraded successfully',
      subscription: result.subscription,
      payment: result.payment,
      invoice: result.invoice,
    };
  }

  /**
   * Cancel subscription: preserves access until end of current period, NEVER deletes customer data
   */
  async cancelSubscription(workspaceId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    if (sub.plan?.code === PlanTier.FREE) {
      throw new BadRequestException('Free tier subscriptions cannot be cancelled');
    }

    if (sub.status === SubscriptionStatus.CANCELLED) {
      return { message: 'Subscription is already cancelled', subscription: sub };
    }

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED },
      include: { plan: true },
    });

    return {
      message: 'Subscription cancelled. Access remains active until the end of your billing cycle.',
      subscription: updated,
    };
  }

  /**
   * Handle Razorpay Webhook events asynchronously & idempotently
   */
  async handleWebhook(rawPayload: string, signature: string) {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
    if (!webhookSecret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook configuration missing');
    }

    const isValid = this.paymentProvider.verifyWebhookSignature(rawPayload, signature, webhookSecret);
    if (!isValid) {
      this.logger.warn('Razorpay webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawPayload);
    const eventName = event.event;
    this.logger.log(`Processing Razorpay webhook event: ${eventName}`);

    if (eventName === 'order.paid' || eventName === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (!orderId) {
        return { status: 'ignored_no_order_id' };
      }

      const payment = await this.prisma.payment.findFirst({
        where: { razorpayOrderId: orderId },
      });

      if (!payment) {
        this.logger.warn(`Webhook received for unknown order: ${orderId}`);
        return { status: 'payment_not_found' };
      }

      if (payment.status === PaymentStatus.SUCCESSFUL) {
        return { status: 'already_processed' };
      }

      // Notes carry workspaceId, planId, billingCycle
      const notes = paymentEntity.notes || {};
      const workspaceId = payment.workspaceId;
      const planId = notes.planId;

      if (planId) {
        const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
        if (plan) {
          const isYearly = notes.billingCycle === 'yearly';
          const periodDays = isYearly ? 365 : 30;
          const currentPeriodStart = new Date();
          const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

          await this.prisma.$transaction(async (tx) => {
            const existingSub = await tx.subscription.findFirst({
              where: { workspaceId },
              orderBy: { createdAt: 'desc' },
            });

            let activeSub;
            if (existingSub) {
              activeSub = await tx.subscription.update({
                where: { id: existingSub.id },
                data: {
                  planId: plan.id,
                  status: SubscriptionStatus.ACTIVE,
                  currentPeriodStart,
                  currentPeriodEnd,
                  seatCount: (plan.entitlements as any)?.maxUsers || 25,
                },
              });
            } else {
              activeSub = await tx.subscription.create({
                data: {
                  workspaceId,
                  planId: plan.id,
                  status: SubscriptionStatus.ACTIVE,
                  currentPeriodStart,
                  currentPeriodEnd,
                  seatCount: (plan.entitlements as any)?.maxUsers || 25,
                },
              });
            }

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                razorpayPaymentId: paymentId,
                subscriptionId: activeSub.id,
                status: PaymentStatus.SUCCESSFUL,
                paidAt: new Date(),
              },
            });

            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
            await tx.invoice.create({
              data: {
                workspaceId,
                invoiceNumber,
                amount: payment.amount,
                tax: Math.round(payment.amount * 0.18 * 100) / 100,
                status: 'PAID',
                dueDate: new Date(),
                paidAt: new Date(),
              },
            });
          });
        }
      }
    } else if (eventName === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await this.prisma.payment.updateMany({
          where: { razorpayOrderId: orderId },
          data: { status: PaymentStatus.FAILED },
        });
      }
    }

    return { received: true, event: eventName };
  }

  async createPaymentOrder(workspaceId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
    return this.createCheckoutOrder(workspaceId, planId, billingCycle);
  }

  async checkSeatAvailability(workspaceId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { workspaceId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
      orderBy: { createdAt: 'desc' },
    });
    const seatLimit = sub?.seatCount || 5;
    const activeCount = await this.prisma.membership.count({
      where: { workspaceId, status: 'ACTIVE' },
    });
    return activeCount < seatLimit;
  }
}
