import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  RsvpDto,
  CreateCompanyHolidayDto,
} from './calendar.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async getEvents(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('layers') layers?: string,
    @Query('scope') scope?: string,
    @Query('memberIds') memberIds?: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    const userRole = (
      req.userContext?.accessRole ||
      req.membership?.accessRole ||
      req.userContext?.roleName ||
      req.membership?.role?.name ||
      'MEMBER'
    ).toString();

    const parsedLayers = layers ? layers.split(',') : undefined;
    const parsedMemberIds = memberIds ? memberIds.split(',').filter(Boolean) : undefined;

    return this.calendarService.getEvents(
      workspaceId,
      membershipId,
      userRole,
      {
        startDate,
        endDate,
        search,
        type,
        departmentId,
        teamId,
        status,
        layers: parsedLayers,
        scope,
        memberIds: parsedMemberIds,
      },
      req.userContext,
    );
  }

  @Post('events')
  async createEvent(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() dto: CreateCalendarEventDto,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    const userRole = (
      req.userContext?.accessRole ||
      req.membership?.accessRole ||
      'MEMBER'
    ).toString();

    return this.calendarService.createEvent(workspaceId, membershipId, userRole, dto, req.userContext);
  }

  @Put('events/:id')
  async updateEvent(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    const userRole = (
      req.userContext?.accessRole ||
      req.membership?.accessRole ||
      'MEMBER'
    ).toString();

    return this.calendarService.updateEvent(workspaceId, membershipId, userRole, id, dto, req.userContext);
  }

  @Delete('events/:id')
  async deleteEvent(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    const userRole = (
      req.userContext?.accessRole ||
      req.membership?.accessRole ||
      'MEMBER'
    ).toString();

    return this.calendarService.deleteEvent(workspaceId, membershipId, userRole, id, req.userContext);
  }

  @Post('events/:id/rsvp')
  async respondRsvp(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RsvpDto,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    const userRole = (
      req.userContext?.accessRole ||
      req.membership?.accessRole ||
      'MEMBER'
    ).toString();

    return this.calendarService.respondRsvp(workspaceId, membershipId, userRole, id, dto, req.userContext);
  }

  @Get('holidays')
  async getHolidays(
    @CurrentWorkspace() workspaceId: string,
    @Query('year') year?: string,
  ) {
    return this.calendarService.getHolidays(
      workspaceId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('holidays')
  async createCompanyHoliday(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() dto: CreateCompanyHolidayDto,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    const userRole = (
      req.userContext?.accessRole ||
      req.membership?.accessRole ||
      req.userContext?.roleName ||
      req.membership?.role?.name ||
      'MEMBER'
    ).toString();

    return this.calendarService.createCompanyHoliday(workspaceId, membershipId, userRole, dto, req.userContext);
  }

  @Delete('holidays/:id')
  async deleteCompanyHoliday(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    const userRole = (
      req.userContext?.accessRole ||
      req.membership?.accessRole ||
      req.userContext?.roleName ||
      req.membership?.role?.name ||
      'MEMBER'
    ).toString();

    return this.calendarService.deleteCompanyHoliday(workspaceId, membershipId, userRole, id, req.userContext);
  }
}
