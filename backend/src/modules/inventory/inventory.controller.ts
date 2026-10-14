import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('locations')
  async listLocations(@CurrentWorkspace() workspaceId: string) {
    return this.inventoryService.listLocations(workspaceId);
  }

  @Post('locations')
  @RequirePermissions('settings:manage')
  async createLocation(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.inventoryService.createLocation(workspaceId, body);
  }

  @Get('items')
  async listItems(@CurrentWorkspace() workspaceId: string) {
    return this.inventoryService.listItems(workspaceId);
  }

  @Post('items')
  @RequirePermissions('settings:manage')
  async createItem(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.inventoryService.createItem(workspaceId, body);
  }

  @Get('movements')
  async getMovements(
    @CurrentWorkspace() workspaceId: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getMovements(workspaceId, itemId);
  }

  @Post('movements')
  async recordStockMovement(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.inventoryService.recordStockMovement(workspaceId, req.membershipId, body);
  }

  @Post('items/:id/replenish')
  async createReplenishmentTicket(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { requestedQuantity: number; reason?: string },
  ) {
    return this.inventoryService.createReplenishmentTicket(
      workspaceId,
      id,
      req.membershipId,
      body,
    );
  }
}
