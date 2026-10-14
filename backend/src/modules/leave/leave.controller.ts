import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LeaveType, LeaveStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('policies')
  async listPolicies(@CurrentWorkspace() workspaceId: string) {
    return this.leaveService.listPolicies(workspaceId);
  }

  @Post('policies')
  @RequirePermissions('leave:manage')
  async upsertPolicy(@CurrentWorkspace() workspaceId: string, @Body() body: any) {
    return this.leaveService.upsertPolicy(workspaceId, body);
  }

  @Get('balances')
  async getBalances(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('membershipId') targetMembershipId?: string,
    @Query('year') year?: number,
  ) {
    const membershipId = targetMembershipId || req.membershipId;
    return this.leaveService.getMemberBalances(workspaceId, membershipId, year ? Number(year) : undefined);
  }

  @Post('balances/adjust')
  @RequirePermissions('leave:manage')
  async adjustBalance(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { membershipId: string; leaveType: LeaveType; allocated: number },
  ) {
    return this.leaveService.adjustBalance(workspaceId, body.membershipId, body.leaveType, body.allocated);
  }

  @Get('calendar')
  async getLeaveCalendar(
    @CurrentWorkspace() workspaceId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.leaveService.getLeaveCalendar(
      workspaceId,
      month !== undefined ? Number(month) : undefined,
      year !== undefined ? Number(year) : undefined,
    );
  }

  @Get()
  async list(
    @CurrentWorkspace() workspaceId: string,
    @Query('membershipId') membershipId?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.leaveService.list(workspaceId, { membershipId, status, departmentId });
  }

  @Post()
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: { leaveType: LeaveType; startDate: Date; endDate: Date; totalDays: number; reason?: string },
  ) {
    return this.leaveService.create(workspaceId, req.membershipId, body);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: LeaveStatus,
  ) {
    return this.leaveService.updateStatus(id, workspaceId, req.membershipId, status);
  }
}
