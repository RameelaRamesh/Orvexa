import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TimeService } from './time.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ApprovalStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('time')
export class TimeController {
  constructor(private readonly timeService: TimeService) {}

  // ---------------------------------------------------------------------------
  // ATTENDANCE SESSIONS & EVENTS
  // ---------------------------------------------------------------------------

  @Post('clock-in')
  @RequirePermissions('attendance:clock')
  async clockIn(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: { notes?: string; source?: string; timezone?: string; shiftId?: string },
  ) {
    return this.timeService.clockIn(workspaceId, req.membershipId, body);
  }

  @Post('clock-out')
  @RequirePermissions('attendance:clock')
  async clockOut(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: { notes?: string; source?: string },
  ) {
    return this.timeService.clockOut(workspaceId, req.membershipId, body);
  }

  @Post('break/start')
  @RequirePermissions('attendance:clock')
  async startBreak(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: { breakType?: string; notes?: string },
  ) {
    return this.timeService.startBreak(workspaceId, req.membershipId, body?.breakType, body?.notes);
  }

  @Post('break/end')
  @RequirePermissions('attendance:clock')
  async endBreak(@CurrentWorkspace() workspaceId: string, @Request() req: any) {
    return this.timeService.endBreak(workspaceId, req.membershipId);
  }

  @Get('today')
  async getTodayStatus(@CurrentWorkspace() workspaceId: string, @Request() req: any) {
    return this.timeService.getTodayStatus(workspaceId, req.membershipId);
  }

  @Get('attendance')
  async listWorkspaceAttendance(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('membershipId') membershipId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.timeService.listWorkspaceAttendance(
      workspaceId,
      { date, startDate, endDate, membershipId, departmentId, teamId, status, search },
      req.userContext,
    );
  }

  // ---------------------------------------------------------------------------
  // ATTENDANCE POLICY
  // ---------------------------------------------------------------------------

  @Get('policy')
  async getAttendancePolicy(@CurrentWorkspace() workspaceId: string) {
    return this.timeService.getAttendancePolicy(workspaceId);
  }

  @Patch('policy')
  @RequirePermissions('time:manage')
  async updateAttendancePolicy(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.timeService.updateAttendancePolicy(workspaceId, body);
  }

  // ---------------------------------------------------------------------------
  // REPORTS, EXPORTS & AGGREGATE SUMMARY
  // ---------------------------------------------------------------------------

  @Get('reports/summary')
  async getAttendanceReportSummary(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.timeService.getAttendanceReportSummary(
      workspaceId,
      { startDate, endDate, departmentId },
      req.userContext,
    );
  }

  @Get('export')
  @RequirePermissions('time:export')
  async exportAttendance(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeService.exportAttendance(workspaceId, { startDate, endDate }, req.userContext);
  }

  @Get('history/:membershipId')
  async getMemberAttendanceHistory(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('membershipId') targetMembershipId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeService.listWorkspaceAttendance(
      workspaceId,
      { membershipId: targetMembershipId, startDate, endDate },
      req.userContext,
    );
  }

  // ---------------------------------------------------------------------------
  // ATTENDANCE CORRECTIONS WORKFLOW
  // ---------------------------------------------------------------------------

  @Post('corrections')
  async submitCorrection(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body()
    body: {
      attendanceId: string;
      requestedClockIn: string;
      requestedClockOut: string;
      reason: string;
    },
  ) {
    return this.timeService.submitCorrection(workspaceId, req.membershipId, body);
  }

  @Get('corrections')
  async listCorrections(
    @CurrentWorkspace() workspaceId: string,
    @Query('status') status?: string,
    @Query('membershipId') membershipId?: string,
  ) {
    return this.timeService.listCorrections(workspaceId, { status, membershipId });
  }

  @Patch('corrections/:id/approve')
  @RequirePermissions('time:manage')
  async approveCorrection(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') correctionId: string,
    @Body('reviewNotes') reviewNotes?: string,
  ) {
    return this.timeService.approveCorrection(workspaceId, correctionId, req.membershipId, reviewNotes);
  }

  @Patch('corrections/:id/reject')
  @RequirePermissions('time:manage')
  async rejectCorrection(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') correctionId: string,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    return this.timeService.rejectCorrection(workspaceId, correctionId, req.membershipId, rejectionReason);
  }

  @Post('missed-checkout/resolve')
  @RequirePermissions('time:manage')
  async autoCloseMissedCheckouts(@CurrentWorkspace() workspaceId: string) {
    return this.timeService.autoCloseMissedCheckouts(workspaceId);
  }

  // ---------------------------------------------------------------------------
  // SHIFTS
  // ---------------------------------------------------------------------------

  @Get('shifts')
  async listShifts(@CurrentWorkspace() workspaceId: string) {
    return this.timeService.listShifts(workspaceId);
  }

  @Post('shifts')
  @RequirePermissions('time:manage')
  async createShift(@CurrentWorkspace() workspaceId: string, @Body() body: any) {
    return this.timeService.createShift(workspaceId, body);
  }

  @Patch('shifts/:id')
  @RequirePermissions('time:manage')
  async updateShift(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') shiftId: string,
    @Body() body: any,
  ) {
    return this.timeService.updateShift(workspaceId, shiftId, body);
  }

  @Delete('shifts/:id')
  @RequirePermissions('time:manage')
  async deleteShift(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') shiftId: string,
  ) {
    return this.timeService.deleteShift(workspaceId, shiftId);
  }

  @Post('shifts/assign')
  @RequirePermissions('time:manage')
  async assignShift(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { membershipId: string; shiftId: string },
  ) {
    return this.timeService.assignShiftToMember(workspaceId, body.membershipId, body.shiftId);
  }

  // ---------------------------------------------------------------------------
  // TIMESHEETS
  // ---------------------------------------------------------------------------

  @Get('timesheets')
  async listTimesheets(
    @CurrentWorkspace() workspaceId: string,
    @Query('membershipId') membershipId?: string,
  ) {
    return this.timeService.listTimesheets(workspaceId, membershipId);
  }

  @Post('timesheets')
  async createTimesheet(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.timeService.createTimesheet(workspaceId, req.membershipId, body);
  }

  @Patch('timesheets/:id/status')
  @RequirePermissions('time:manage')
  async updateTimesheetStatus(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: ApprovalStatus,
  ) {
    return this.timeService.updateTimesheetStatus(workspaceId, id, req.membershipId, status);
  }

  // ---------------------------------------------------------------------------
  // OVERTIME
  // ---------------------------------------------------------------------------

  @Get('overtime')
  async listOvertime(
    @CurrentWorkspace() workspaceId: string,
    @Query('membershipId') membershipId?: string,
  ) {
    return this.timeService.listOvertime(workspaceId, membershipId);
  }

  @Post('overtime')
  async createOvertime(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.timeService.createOvertime(workspaceId, req.membershipId, body);
  }

  @Patch('overtime/:id/status')
  @RequirePermissions('time:manage')
  async updateOvertimeStatus(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: ApprovalStatus,
  ) {
    return this.timeService.updateOvertimeStatus(workspaceId, id, req.membershipId, status);
  }

  // ---------------------------------------------------------------------------
  // HOLIDAYS
  // ---------------------------------------------------------------------------

  @Get('holidays')
  async listHolidays(@CurrentWorkspace() workspaceId: string) {
    return this.timeService.listHolidays(workspaceId);
  }

  @Post('holidays')
  @RequirePermissions('time:manage')
  async createHoliday(@CurrentWorkspace() workspaceId: string, @Body() body: any) {
    return this.timeService.createHoliday(workspaceId, body);
  }
}
