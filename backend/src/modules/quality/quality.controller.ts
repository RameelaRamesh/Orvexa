import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { QualityPassStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get()
  async listReviews(@CurrentWorkspace() workspaceId: string) {
    return this.qualityService.listReviews(workspaceId);
  }

  @Post()
  @RequirePermissions('quality:manage')
  async submitReview(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body()
    body: {
      workItemId: string;
      score: number;
      maxScore?: number;
      passStatus: QualityPassStatus;
      defects?: any;
      feedback?: string;
    },
  ) {
    return this.qualityService.submitReview(workspaceId, req.membershipId, body);
  }
}
