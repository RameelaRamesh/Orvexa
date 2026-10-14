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
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('config')
  async getConfig(@CurrentWorkspace() workspaceId: string) {
    return this.payrollService.getConfig(workspaceId);
  }

  @Put('config')
  @RequirePermissions('payroll:edit')
  async updateConfig(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.payrollService.updateConfig(workspaceId, body);
  }

  @Get('salary/:membershipId')
  @RequirePermissions('payroll:view')
  async getMemberSalary(
    @CurrentWorkspace() workspaceId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.payrollService.getMemberSalary(workspaceId, membershipId);
  }

  @Put('salary/:membershipId')
  @RequirePermissions('payroll:edit')
  async updateMemberSalary(
    @CurrentWorkspace() workspaceId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: any,
  ) {
    return this.payrollService.updateMemberSalary(workspaceId, membershipId, body);
  }

  @Get('periods')
  async listPeriods(@CurrentWorkspace() workspaceId: string) {
    return this.payrollService.listPeriods(workspaceId);
  }

  @Post('periods')
  @RequirePermissions('payroll:edit')
  async createPeriod(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name: string; startDate: string; endDate: string; paymentDate?: string },
  ) {
    return this.payrollService.createPeriod(workspaceId, body);
  }

  @Get('periods/:id')
  async getPeriodById(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getPeriodById(workspaceId, id);
  }

  @Post('periods/:id/calculate')
  @RequirePermissions('payroll:edit')
  async calculatePeriodPayroll(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.calculatePeriodPayroll(workspaceId, id);
  }

  @Post('periods/:id/approve')
  @RequirePermissions('payroll:manage')
  async approvePeriod(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.payrollService.approvePeriod(workspaceId, id, req.membershipId);
  }

  @Get('periods/:periodId/payslips/:payslipId')
  async getPayslip(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('periodId') periodId: string,
    @Param('payslipId') payslipId: string,
  ) {
    return this.payrollService.getPayslip(workspaceId, periodId, payslipId, req.userContext);
  }

  @Get('reports')
  async getHistoricalReports(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('membershipId') membershipId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.payrollService.getHistoricalReports(
      workspaceId,
      { membershipId, startDate, endDate },
      req.userContext,
    );
  }
}
