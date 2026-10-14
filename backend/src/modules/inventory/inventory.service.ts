import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface StockLocation {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  addressOrZone?: string;
  createdAt: Date;
}

export interface InventoryItemDetail {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  reorderThreshold: number;
  totalQuantityOnHand: number;
  locationQuantities: Record<string, number>; // locationId -> quantity
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  movementType: 'INWARD' | 'OUTWARD' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  fromLocationId?: string;
  fromLocationName?: string;
  toLocationId?: string;
  toLocationName?: string;
  balanceBefore: number;
  balanceAfter: number;
  actorMembershipId: string;
  actorName: string;
  reason: string;
  referenceTicket?: string;
  timestamp: Date;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // STOCK LOCATIONS
  // ---------------------------------------------------------------------------

  async listLocations(workspaceId: string): Promise<StockLocation[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let locations: StockLocation[] = settings.stockLocations || [];

    if (locations.length === 0) {
      locations = [
        { id: 'loc_main_wh', name: 'Main Distribution Center', code: 'MAIN_WH', isDefault: true, addressOrZone: 'Building A, Ground Floor', createdAt: new Date() },
        { id: 'loc_pantry_f2', name: 'Floor 2 Breakroom & Pantry', code: 'PANTRY_F2', isDefault: false, addressOrZone: 'Floor 2, East Wing', createdAt: new Date() },
        { id: 'loc_it_storage', name: 'IT Hardware Stockroom', code: 'IT_STORAGE', isDefault: false, addressOrZone: 'Server Room 102', createdAt: new Date() },
      ];
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: { ...settings, stockLocations: locations } },
      });
    }

    return locations;
  }

  async createLocation(
    workspaceId: string,
    data: { name: string; code?: string; addressOrZone?: string; isDefault?: boolean },
  ): Promise<StockLocation> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new BadRequestException('Location name is required');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const locations: StockLocation[] = settings.stockLocations || [];

    const code = data.code?.trim().toUpperCase() || cleanName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    if (locations.some((l) => l.code === code)) {
      throw new BadRequestException(`Location code "${code}" already exists`);
    }

    const newLocation: StockLocation = {
      id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: cleanName,
      code,
      isDefault: !!data.isDefault,
      addressOrZone: data.addressOrZone?.trim(),
      createdAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, stockLocations: [...locations, newLocation] } },
    });

    return newLocation;
  }

  // ---------------------------------------------------------------------------
  // INVENTORY ITEMS & LOCATION QUANTITIES
  // ---------------------------------------------------------------------------

  async listItems(workspaceId: string): Promise<InventoryItemDetail[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let items: any[] = settings.inventoryItems || [];

    if (items.length === 0) {
      // Initialize configurable baseline stock items
      items = [
        {
          id: 'inv_item_tissue',
          code: 'TISSUE_BOXES',
          name: 'Tissue Boxes',
          category: 'Pantry & Hygiene',
          unit: 'boxes',
          reorderThreshold: 10,
          totalQuantityOnHand: 50,
          locationQuantities: { loc_main_wh: 40, loc_pantry_f2: 10 },
          isLowStock: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'inv_item_snacks',
          code: 'SNACK_PACKS',
          name: 'Snacks & Beverages',
          category: 'Pantry & Hygiene',
          unit: 'packs',
          reorderThreshold: 20,
          totalQuantityOnHand: 80,
          locationQuantities: { loc_main_wh: 60, loc_pantry_f2: 20 },
          isLowStock: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'inv_item_cables',
          code: 'HDMI_CABLES',
          name: 'HDMI & Display Cables',
          category: 'IT Accessories',
          unit: 'units',
          reorderThreshold: 8,
          totalQuantityOnHand: 25,
          locationQuantities: { loc_it_storage: 25 },
          isLowStock: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: { ...settings, inventoryItems: items } },
      });
    }

    return items.map((i) => ({
      ...i,
      isLowStock: i.totalQuantityOnHand <= i.reorderThreshold,
    }));
  }

  async createItem(
    workspaceId: string,
    data: {
      name: string;
      code?: string;
      category?: string;
      unit?: string;
      reorderThreshold?: number;
      initialQuantity?: number;
      initialLocationId?: string;
    },
  ): Promise<InventoryItemDetail> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new BadRequestException('Item name is required');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const items: InventoryItemDetail[] = settings.inventoryItems || [];
    const locations: StockLocation[] = await this.listLocations(workspaceId);

    const code = data.code?.trim().toUpperCase() || cleanName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    if (items.some((i) => i.code === code)) {
      throw new BadRequestException(`Inventory item with code "${code}" already exists`);
    }

    const defaultLocId = locations[0]?.id || 'loc_main_wh';
    const locId = data.initialLocationId || defaultLocId;
    const initialQty = Math.max(0, Number(data.initialQuantity || 0));

    const newItem: InventoryItemDetail = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      code,
      name: cleanName,
      category: data.category?.trim() || 'General Supplies',
      unit: data.unit?.trim() || 'units',
      reorderThreshold: data.reorderThreshold ? Number(data.reorderThreshold) : 10,
      totalQuantityOnHand: initialQty,
      locationQuantities: initialQty > 0 ? { [locId]: initialQty } : {},
      isLowStock: initialQty <= (data.reorderThreshold ? Number(data.reorderThreshold) : 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, inventoryItems: [...items, newItem] } },
    });

    return newItem;
  }

  // ---------------------------------------------------------------------------
  // AUDITABLE STOCK MOVEMENTS & ATOMIC QUANTITY UPDATES
  // ---------------------------------------------------------------------------

  async recordStockMovement(
    workspaceId: string,
    actorMembershipId: string,
    data: {
      itemId: string;
      movementType: 'INWARD' | 'OUTWARD' | 'TRANSFER' | 'ADJUSTMENT';
      quantity: number;
      fromLocationId?: string;
      toLocationId?: string;
      reason: string;
      referenceTicket?: string;
    },
  ): Promise<{ movement: StockMovement; updatedItem: InventoryItemDetail }> {
    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new BadRequestException('Movement quantity must be a positive number greater than 0');
    }
    if (!data.reason?.trim()) {
      throw new BadRequestException('Reason is mandatory for all stock movements and adjustments');
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const items: InventoryItemDetail[] = await this.listItems(workspaceId);
    const locations: StockLocation[] = await this.listLocations(workspaceId);
    const movements: StockMovement[] = settings.stockMovements || [];

    const itemIndex = items.findIndex((i) => i.id === data.itemId);
    if (itemIndex === -1) throw new NotFoundException('Inventory item not found');

    const item = items[itemIndex];
    const locMap = { ...item.locationQuantities };
    const balanceBefore = item.totalQuantityOnHand;
    let balanceAfter = balanceBefore;

    const fromLoc = locations.find((l) => l.id === data.fromLocationId);
    const toLoc = locations.find((l) => l.id === data.toLocationId);

    // Process Movement Types with Strict Quantity Guards
    if (data.movementType === 'INWARD') {
      const targetLocId = data.toLocationId || locations[0]?.id || 'loc_main_wh';
      locMap[targetLocId] = (locMap[targetLocId] || 0) + qty;
      balanceAfter = balanceBefore + qty;
    } else if (data.movementType === 'OUTWARD') {
      const sourceLocId = data.fromLocationId || locations[0]?.id || 'loc_main_wh';
      const availableAtSource = locMap[sourceLocId] || 0;

      if (availableAtSource < qty) {
        throw new BadRequestException(
          `Insufficient stock at ${fromLoc?.name || 'specified location'}. Available: ${availableAtSource} ${item.unit}, requested: ${qty} ${item.unit}.`,
        );
      }

      locMap[sourceLocId] = availableAtSource - qty;
      balanceAfter = Math.max(0, balanceBefore - qty);
    } else if (data.movementType === 'TRANSFER') {
      if (!data.fromLocationId || !data.toLocationId) {
        throw new BadRequestException('Source and destination locations are both required for stock transfer');
      }
      if (data.fromLocationId === data.toLocationId) {
        throw new BadRequestException('Source and destination locations cannot be identical');
      }

      const availableAtSource = locMap[data.fromLocationId] || 0;
      if (availableAtSource < qty) {
        throw new BadRequestException(
          `Insufficient stock at ${fromLoc?.name || 'source location'}. Available: ${availableAtSource} ${item.unit}, requested: ${qty} ${item.unit}.`,
        );
      }

      locMap[data.fromLocationId] = availableAtSource - qty;
      locMap[data.toLocationId] = (locMap[data.toLocationId] || 0) + qty;
      balanceAfter = balanceBefore; // Total stock unchanged in transfer
    } else if (data.movementType === 'ADJUSTMENT') {
      // Discrepancy correction: quantity indicates the adjustment delta or target
      const targetLocId = data.toLocationId || data.fromLocationId || locations[0]?.id || 'loc_main_wh';
      locMap[targetLocId] = qty;
      balanceAfter = Object.values(locMap).reduce((a, b) => a + b, 0);
    }

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Inventory Manager';

    const isLowStock = balanceAfter <= item.reorderThreshold;

    const updatedItem: InventoryItemDetail = {
      ...item,
      totalQuantityOnHand: balanceAfter,
      locationQuantities: locMap,
      isLowStock,
      updatedAt: new Date(),
    };
    items[itemIndex] = updatedItem;

    const newMovement: StockMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      itemId: item.id,
      itemName: item.name,
      movementType: data.movementType,
      quantity: qty,
      fromLocationId: data.fromLocationId,
      fromLocationName: fromLoc?.name,
      toLocationId: data.toLocationId,
      toLocationName: toLoc?.name,
      balanceBefore,
      balanceAfter,
      actorMembershipId,
      actorName,
      reason: data.reason.trim(),
      referenceTicket: data.referenceTicket,
      timestamp: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          inventoryItems: items,
          stockMovements: [newMovement, ...movements],
        },
      },
    });

    // LOW-STOCK NOTIFICATION DISPATCH (REQUIREMENT 5)
    if (isLowStock && balanceBefore > item.reorderThreshold) {
      await this.triggerLowStockAlert(workspaceId, updatedItem);
    }

    return { movement: newMovement, updatedItem };
  }

  async getMovements(workspaceId: string, itemId?: string): Promise<StockMovement[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const movements: StockMovement[] = settings.stockMovements || [];

    if (itemId) {
      return movements.filter((m) => m.itemId === itemId);
    }
    return movements;
  }

  // ---------------------------------------------------------------------------
  // REPLENISHMENT CONNECTION (CONNECTING PHASE 8 SERVICE REQUESTS)
  // ---------------------------------------------------------------------------

  async createReplenishmentTicket(
    workspaceId: string,
    itemId: string,
    actorMembershipId: string,
    data: { requestedQuantity: number; reason?: string },
  ) {
    const items = await this.listItems(workspaceId);
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Inventory item not found');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests = settings.serviceRequests || [];
    const categories = settings.requestCategories || [];

    const facilitiesCat = categories.find(
      (c: any) => c.code === 'FACILITIES_SUPPLIES' || c.name.toLowerCase().includes('supplies'),
    );
    const catId = facilitiesCat ? facilitiesCat.id : categories[0]?.id || 'cat_supplies_auto';

    const nextSeq = requests.length + 1001;
    const ticketNumber = `REQ-${nextSeq}`;

    const newRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspaceId,
      ticketNumber,
      categoryId: catId,
      categoryName: facilitiesCat?.name || 'Facilities & Supplies',
      title: `Stock Replenishment: ${item.name} (${data.requestedQuantity} ${item.unit})`,
      description: data.reason || `Automated/Manual low stock replenishment triggered for ${item.name}. Current stock: ${item.totalQuantityOnHand}.`,
      requesterMembershipId: actorMembershipId,
      requesterName: 'Inventory System',
      priority: 'HIGH',
      status: 'SUBMITTED',
      inventoryItem: item.name,
      requestedQuantity: Number(data.requestedQuantity),
      replenishmentItems: [{ inventoryItemId: item.id, name: item.name, requestedQuantity: Number(data.requestedQuantity) }],
      comments: [],
      activityLog: [
        {
          action: 'SUBMITTED',
          actorId: actorMembershipId,
          actorName: 'Inventory Controller',
          timestamp: new Date(),
          details: `Replenishment ticket created for ${data.requestedQuantity} ${item.unit} of ${item.name}.`,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          serviceRequests: [newRequest, ...requests],
        },
      },
    });

    return { ticketNumber, request: newRequest };
  }

  private async triggerLowStockAlert(workspaceId: string, item: InventoryItemDetail) {
    const managers = await this.prisma.membership.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        accessRole: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      },
    });

    for (const m of managers) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId: m.id,
          title: `Low Stock Warning: ${item.name}`,
          message: `Stock level for "${item.name}" has reached ${item.totalQuantityOnHand} ${item.unit} (reorder point: ${item.reorderThreshold}).`,
          link: '/app/assets',
        },
      }).catch(() => null);
    }
  }
}
