import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  async listRequests(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('responsibleTeamId') responsibleTeamId?: string,
    @Query('requesterMembershipId') requesterMembershipId?: string,
    @Query('ownerMembershipId') ownerMembershipId?: string,
    @Query('search') search?: string,
  ) {
    return this.requestsService.listRequests(
      workspaceId,
      { status, categoryId, responsibleTeamId, requesterMembershipId, ownerMembershipId, search },
      req.userContext,
    );
  }

  @Post()
  async createRequest(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.requestsService.createRequest(workspaceId, req.membershipId, body);
  }

  @Get('categories')
  async listCategories(@CurrentWorkspace() workspaceId: string) {
    return this.requestsService.listCategories(workspaceId);
  }

  @Post('categories')
  @RequirePermissions('settings:manage')
  async createCategory(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.requestsService.createCategory(workspaceId, body);
  }

  @Get('inventory')
  async getInventory(@CurrentWorkspace() workspaceId: string) {
    return this.requestsService.getInventory(workspaceId);
  }

  @Post('inventory')
  @RequirePermissions('settings:manage')
  async updateInventoryItem(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.requestsService.updateInventoryItem(workspaceId, body);
  }

  @Get(':id')
  async getRequestById(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.requestsService.getRequestById(workspaceId, id, req.userContext);
  }

  @Post(':id/acknowledge')
  async acknowledgeRequest(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.requestsService.acknowledgeRequest(workspaceId, id, req.membershipId, notes);
  }

  @Post(':id/fulfill')
  async fulfillRequest(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('fulfillmentNotes') fulfillmentNotes?: string,
  ) {
    return this.requestsService.fulfillRequest(workspaceId, id, req.membershipId, fulfillmentNotes);
  }

  @Post(':id/close')
  async closeRequest(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('feedback') feedback?: string,
  ) {
    return this.requestsService.closeRequest(workspaceId, id, req.membershipId, feedback);
  }

  @Post(':id/escalate')
  async escalateRequest(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.requestsService.escalateRequest(workspaceId, id, req.membershipId, reason);
  }

  @Post(':id/comments')
  async addComment(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    const authorName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Team Member';
    return this.requestsService.addComment(workspaceId, id, req.membershipId, authorName, text);
  }

  @Post('notifications/:logId/retry')
  async retryNotificationDelivery(
    @CurrentWorkspace() workspaceId: string,
    @Param('logId') logId: string,
  ) {
    return this.requestsService.retryNotificationDelivery(workspaceId, logId);
  }
}
