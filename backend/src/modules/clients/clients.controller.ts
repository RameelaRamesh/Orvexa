import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async list(@CurrentWorkspace() workspaceId: string) {
    return this.clientsService.list(workspaceId);
  }

  @Post()
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name: string; code?: string; companyName?: string; contactEmail?: string; contactPhone?: string },
  ) {
    return this.clientsService.create(workspaceId, body);
  }
}
