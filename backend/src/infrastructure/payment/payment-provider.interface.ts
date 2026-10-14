export interface CreateOrderDto {
  amount: number; // In currency subunits (e.g., paise for INR)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface VerifySignatureDto {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentProvider {
  createOrder(dto: CreateOrderDto): Promise<OrderResult>;
  verifyPaymentSignature(dto: VerifySignatureDto): boolean;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
