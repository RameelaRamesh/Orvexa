import { Controller, Get, Post, Body, UseGuards, Headers, Req, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { Public } from '../../common/decorators/public.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  async listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('current')
  async getWorkspaceSubscription(@CurrentWorkspace() workspaceId: string) {
    return this.subscriptionsService.getWorkspaceSubscription(workspaceId);
  }

  @Post('checkout')
  async createCheckoutOrder(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { planId: string; billingCycle: 'monthly' | 'yearly' },
  ) {
    return this.subscriptionsService.createCheckoutOrder(workspaceId, body.planId, body.billingCycle);
  }

  @Post('verify')
  async verifyPayment(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { orderId: string; paymentId: string; signature: string; planId: string },
  ) {
    return this.subscriptionsService.verifyPayment(workspaceId, body);
  }

  @Post('cancel')
  async cancelSubscription(@CurrentWorkspace() workspaceId: string) {
    return this.subscriptionsService.cancelSubscription(workspaceId);
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: any,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-razorpay-signature header');
    }
    const rawPayload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    return this.subscriptionsService.handleWebhook(rawPayload, signature);
  }
}
