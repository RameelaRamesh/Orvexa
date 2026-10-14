import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
  Header,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId;
    const userRole = req.membership?.accessRole || 'MEMBER';

    return this.analyticsService.getOverview(workspaceId, membershipId, userRole, {
      startDate,
      endDate,
      departmentId,
      teamId,
      memberId,
      status,
      priority,
    });
  }

  @Get('calendar')
  async getCalendar(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('layers') layers?: string,
    @Query('memberId') memberId?: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId;
    const userRole = req.membership?.accessRole || 'MEMBER';
    const parsedLayers = layers ? layers.split(',') : undefined;

    return this.analyticsService.getCalendarEvents(workspaceId, membershipId, userRole, {
      startDate,
      endDate,
      layers: parsedLayers,
      memberId,
    });
  }

  @Get('drilldown/:category')
  async getDrilldown(
    @CurrentWorkspace() workspaceId: string,
    @Param('category') category: string,
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('memberId') memberId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId;
    const userRole = req.membership?.accessRole || 'MEMBER';

    return this.analyticsService.getDrilldown(workspaceId, membershipId, userRole, category, {
      startDate,
      endDate,
      status,
      priority,
      memberId,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('export/:category')
  async exportData(
    @CurrentWorkspace() workspaceId: string,
    @Param('category') category: string,
    @Request() req: any,
    @Response() res: any,
    @Query('format') format: 'json' | 'csv' = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('memberId') memberId?: string,
  ) {
    const membershipId = req.membership?.id || req.membershipId;
    const userRole = req.membership?.accessRole || 'MEMBER';

    const result = await this.analyticsService.exportData(
      workspaceId,
      membershipId,
      userRole,
      category,
      format,
      { startDate, endDate, status, priority, memberId },
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="orvexa_${category}_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      return res.send(result);
    }

    return res.json(result);
  }
}
