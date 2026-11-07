import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { PushSubscriptionDto, NotificationPreferencesDto } from './notifications.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.list(workspaceId, membershipId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.markAsRead(workspaceId, membershipId, id);
  }

  @Post('read-all')
  async markAllAsRead(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.markAllAsRead(workspaceId, membershipId);
  }

  @Delete(':id')
  async deleteNotification(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.delete(workspaceId, membershipId, id);
  }

  @Post('push-subscribe')
  async savePushSubscription(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() dto: PushSubscriptionDto,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.savePushSubscription(workspaceId, membershipId, dto);
  }

  @Post('push-unsubscribe')
  async removePushSubscription(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body('endpoint') endpoint?: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.removePushSubscription(workspaceId, membershipId, endpoint);
  }

  @Get('preferences')
  async getPreferences(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.getPreferences(workspaceId, membershipId);
  }

  @Post('preferences')
  async updatePreferences(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() dto: NotificationPreferencesDto,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.notificationsService.updatePreferences(workspaceId, membershipId, dto);
  }
}
