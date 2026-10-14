import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, CreateOrderDto, OrderResult, VerifySignatureDto } from './payment-provider.interface';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Razorpay = require('razorpay');

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private razorpayInstance: any;
  private keySecret: string;

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get<string>('razorpay.keyId');
    this.keySecret = this.configService.get<string>('razorpay.keySecret');

    this.razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(dto: CreateOrderDto): Promise<OrderResult> {
    try {
      const order = await this.razorpayInstance.orders.create({
        amount: Math.round(dto.amount),
        currency: dto.currency || 'INR',
        receipt: dto.receipt,
        notes: dto.notes,
      });

      return {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
      };
    } catch (error) {
      this.logger.error('Razorpay order creation failed:', error);
      throw error;
    }
  }

  verifyPaymentSignature(dto: VerifySignatureDto): boolean {
    try {
      const body = dto.orderId + '|' + dto.paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === dto.signature;
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error('Webhook signature verification error:', error);
      return false;
    }
  }
}
