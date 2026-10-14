import { Global, Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { RazorpayPaymentProvider } from './razorpay-payment.provider';

@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useClass: RazorpayPaymentProvider,
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
