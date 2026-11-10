import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AssetStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('categories')
  @RequirePermissions('assets:view')
  async listCategories(@CurrentWorkspace() workspaceId: string) {
    return this.assetsService.listCategories(workspaceId);
  }

  @Post('categories')
  @RequirePermissions('assets:create')
  async createCategory(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.assetsService.createCategory(workspaceId, body);
  }

  @Get()
  @RequirePermissions('assets:view')
  async listAssets(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('category') category?: string,
    @Query('status') status?: AssetStatus,
    @Query('assignedToMembershipId') assignedToMembershipId?: string,
    @Query('search') search?: string,
  ) {
    return this.assetsService.listAssets(
      workspaceId,
      { category, status, assignedToMembershipId, search },
      req.userContext,
    );
  }

  @Post()
  @RequirePermissions('assets:create')
  async createAsset(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.assetsService.createAsset(workspaceId, req.membershipId, body);
  }

  @Get(':id')
  @RequirePermissions('assets:view')
  async getAssetById(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.assetsService.getAssetById(workspaceId, id, req.userContext);
  }

  @Post(':id/assign')
  @RequirePermissions('assets:assign')
  async assignAsset(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { toMembershipId: string; notes?: string; condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; location?: string },
  ) {
    return this.assetsService.assignAsset(workspaceId, id, req.membershipId, body);
  }

  @Post(':id/transfer')
  @RequirePermissions('assets:assign')
  async transferAsset(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { toMembershipId?: string; toLocation?: string; reason: string; condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' },
  ) {
    return this.assetsService.transferAsset(workspaceId, id, req.membershipId, body);
  }

  @Post(':id/return')
  @RequirePermissions('assets:assign')
  async returnAsset(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; returnLocation?: string; notes?: string },
  ) {
    return this.assetsService.returnAsset(workspaceId, id, req.membershipId, body);
  }

  @Post(':id/maintenance')
  @RequirePermissions('assets:edit')
  async recordMaintenance(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { action: 'START' | 'COMPLETE'; issueDescription?: string; serviceProvider?: string; cost?: number; resultCondition?: 'EXCELLENT' | 'GOOD' | 'FAIR'; notes?: string },
  ) {
    return this.assetsService.recordMaintenance(workspaceId, id, req.membershipId, body);
  }

  @Post(':id/retire')
  @RequirePermissions('assets:delete')
  async retireAsset(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string; salvageValue?: number; notes?: string },
  ) {
    return this.assetsService.retireAsset(workspaceId, id, req.membershipId, body);
  }
}
