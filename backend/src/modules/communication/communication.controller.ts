import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Get('conversations')
  async listConversations(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
  ) {
    return this.communicationService.listConversations(workspaceId, req.membershipId);
  }

  @Post('conversations/direct')
  async createDirectConversation(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body('recipientMembershipId') recipientMembershipId: string,
  ) {
    return this.communicationService.createDirectConversation(
      workspaceId,
      req.membershipId,
      recipientMembershipId,
    );
  }

  @Post('conversations/group')
  async createGroupConversation(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body('name') name: string,
    @Body('participantMembershipIds') participantMembershipIds: string[],
  ) {
    return this.communicationService.createGroupConversation(
      workspaceId,
      req.membershipId,
      name,
      participantMembershipIds || [],
    );
  }

  @Post('conversations/:id/participants')
  async addParticipants(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body('participantMembershipIds') participantMembershipIds: string[],
  ) {
    return this.communicationService.addParticipants(
      workspaceId,
      conversationId,
      req.membershipId,
      participantMembershipIds,
    );
  }

  @Delete('conversations/:id/participants/:targetId')
  async removeParticipant(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') conversationId: string,
    @Param('targetId') targetMembershipId: string,
  ) {
    return this.communicationService.removeParticipant(
      workspaceId,
      conversationId,
      req.membershipId,
      targetMembershipId,
    );
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    return this.communicationService.getMessages(workspaceId, conversationId, req.membershipId);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body('content') content: string,
    @Body('attachments') attachments?: any[],
  ) {
    return this.communicationService.sendMessage(
      workspaceId,
      conversationId,
      req.membershipId,
      content,
      attachments,
    );
  }

  @Post('conversations/:id/messages/:messageId/read')
  async markAsRead(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.communicationService.markAsRead(workspaceId, conversationId, messageId, req.membershipId);
  }
}
