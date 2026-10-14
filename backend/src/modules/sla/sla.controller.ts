import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SLAService } from './sla.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('sla')
export class SLAController {
  constructor(private readonly slaService: SLAService) {}

  @Get('configs')
  async listConfigs(@CurrentWorkspace() workspaceId: string) {
    return this.slaService.listConfigs(workspaceId);
  }

  @Post('configs')
  async createConfig(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      entityType: string;
      priority?: string;
      maxResolutionMinutes: number;
      warningThresholdPercent?: number;
      escalationOwnerMembershipId?: string;
    },
  ) {
    return this.slaService.createConfig(workspaceId, body);
  }

  @Get('escalations')
  async listEscalations(@CurrentWorkspace() workspaceId: string) {
    return this.slaService.listEscalations(workspaceId);
  }
}
