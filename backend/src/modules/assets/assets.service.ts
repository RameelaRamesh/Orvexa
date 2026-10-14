import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssetStatus } from '@prisma/client';

export interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  depreciationYears?: number;
  maintenanceIntervalDays?: number;
  isActive: boolean;
}

export interface AssetLifecycleEvent {
  id: string;
  assetId: string;
  eventType: 'ASSIGNED' | 'TRANSFERRED' | 'RETURNED' | 'MAINTENANCE_STARTED' | 'MAINTENANCE_COMPLETED' | 'DISPOSED' | 'CONDITION_UPDATED';
  actorMembershipId: string;
  actorName: string;
  fromMembershipId?: string;
  toMembershipId?: string;
  fromLocation?: string;
  toLocation?: string;
  condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  cost?: number;
  serviceProvider?: string;
  notes?: string;
  timestamp: Date;
}

export interface AssetRecord {
  id: string;
  workspaceId: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  category?: string;
  status: AssetStatus;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  location?: string;
  assignedToMembershipId?: string;
  assignedToName?: string;
  purchaseDate?: Date;
  cost?: number;
  specifications?: Record<string, any>;
  lifecycleHistory: AssetLifecycleEvent[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CONFIGURABLE ASSET CATEGORIES
  // ---------------------------------------------------------------------------

  async listCategories(workspaceId: string): Promise<AssetCategory[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let categories: AssetCategory[] = settings.assetCategories || [];

    if (categories.length === 0) {
      // Default baseline categories without mandatory preset locking
      categories = [
        { id: 'cat_it_hardware', name: 'IT Hardware & Workstations', code: 'IT_HARDWARE', description: 'Laptops, monitors, workstations', depreciationYears: 3, isActive: true },
        { id: 'cat_office_furn', name: 'Office Furniture & Fixtures', code: 'OFFICE_FURNITURE', description: 'Desks, ergonomic chairs, storage', depreciationYears: 5, isActive: true },
        { id: 'cat_comm_devices', name: 'Telephony & AV Equipment', code: 'COMM_DEVICES', description: 'Conference cameras, microphones, phones', depreciationYears: 4, isActive: true },
      ];
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: { ...settings, assetCategories: categories } },
      });
    }

    return categories;
  }

  async createCategory(
    workspaceId: string,
    data: { name: string; code?: string; description?: string; depreciationYears?: number; maintenanceIntervalDays?: number },
  ): Promise<AssetCategory> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new BadRequestException('Category name is required');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const categories: AssetCategory[] = settings.assetCategories || [];

    const code = data.code?.trim().toUpperCase() || cleanName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    if (categories.some((c) => c.code === code)) {
      throw new BadRequestException(`Asset category with code "${code}" already exists`);
    }

    const newCategory: AssetCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: cleanName,
      code,
      description: data.description?.trim(),
      depreciationYears: data.depreciationYears,
      maintenanceIntervalDays: data.maintenanceIntervalDays,
      isActive: true,
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, assetCategories: [...categories, newCategory] } },
    });

    return newCategory;
  }

  // ---------------------------------------------------------------------------
  // ASSET RECORDS MANAGEMENT & QUERYING
  // ---------------------------------------------------------------------------

  async listAssets(
    workspaceId: string,
    query?: {
      category?: string;
      status?: AssetStatus;
      assignedToMembershipId?: string;
      condition?: string;
      search?: string;
    },
    userContext?: { membershipId?: string; dataScope?: string; accessRole?: string },
  ) {
    const where: any = { workspaceId };

    if (query?.category) where.category = query.category;
    if (query?.status) where.status = query.status;
    if (query?.assignedToMembershipId) where.assignedToMembershipId = query.assignedToMembershipId;

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { assetTag: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Role-based data scoping
    if (
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN' &&
      userContext.accessRole !== 'MANAGER'
    ) {
      const scope = userContext.dataScope || 'ASSIGNED';
      if (scope === 'ASSIGNED' || scope === 'OWN') {
        where.assignedToMembershipId = userContext.membershipId;
      }
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        assignedTo: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};

    return assets.map((a) => {
      const meta = assetMeta[a.id] || {};
      return {
        ...a,
        condition: meta.condition || 'GOOD',
        location: meta.location || 'Headquarters',
        specifications: meta.specifications || {},
        lifecycleHistory: meta.lifecycleHistory || [],
      };
    });
  }

  async getAssetById(workspaceId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, workspaceId },
      include: {
        assignedTo: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
            department: true,
            team: true,
          },
        },
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};
    const meta = assetMeta[asset.id] || {};

    // Also look up attached files
    const attachedFiles = await this.prisma.file.findMany({
      where: { workspaceId, entityType: 'asset', entityId: asset.id },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, url: true, createdAt: true },
    });

    return {
      ...asset,
      condition: meta.condition || 'GOOD',
      location: meta.location || 'Headquarters',
      specifications: meta.specifications || {},
      lifecycleHistory: meta.lifecycleHistory || [],
      attachedFiles,
    };
  }

  async createAsset(
    workspaceId: string,
    actorMembershipId: string,
    data: {
      name: string;
      assetTag?: string;
      serialNumber?: string;
      category?: string;
      condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      location?: string;
      purchaseDate?: Date | string;
      cost?: number;
      specifications?: Record<string, any>;
      assignedToMembershipId?: string;
    },
  ) {
    const cleanName = data.name.trim();
    if (!cleanName) throw new BadRequestException('Asset name is required');

    // Auto-generate tag if omitted
    const assetTag = data.assetTag?.trim() || `AST-${Date.now().toString().slice(-6)}`;

    // Verify tag uniqueness in workspace
    const existingTag = await this.prisma.asset.findFirst({
      where: { workspaceId, assetTag },
    });
    if (existingTag) throw new BadRequestException(`Asset tag "${assetTag}" already exists`);

    const status: AssetStatus = data.assignedToMembershipId ? 'ASSIGNED' : 'AVAILABLE';

    const asset = await this.prisma.asset.create({
      data: {
        workspaceId,
        name: cleanName,
        assetTag,
        serialNumber: data.serialNumber?.trim(),
        category: data.category?.trim(),
        status,
        assignedToMembershipId: data.assignedToMembershipId || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        cost: data.cost ? Number(data.cost) : null,
      },
    });

    // Save extended metadata & initial lifecycle history
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Administrator';

    const initialHistory: AssetLifecycleEvent[] = [
      {
        id: `evt_${Date.now()}_1`,
        assetId: asset.id,
        eventType: data.assignedToMembershipId ? 'ASSIGNED' : 'CONDITION_UPDATED',
        actorMembershipId,
        actorName,
        toMembershipId: data.assignedToMembershipId,
        toLocation: data.location || 'Headquarters',
        condition: data.condition || 'EXCELLENT',
        notes: `Asset onboarded into catalog with status ${status}.`,
        timestamp: new Date(),
      },
    ];

    assetMeta[asset.id] = {
      condition: data.condition || 'EXCELLENT',
      location: data.location || 'Headquarters',
      specifications: data.specifications || {},
      lifecycleHistory: initialHistory,
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, assetMetadata: assetMeta } },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorMembershipId,
        action: 'ASSET_CREATED',
        entity: 'Asset',
        entityId: asset.id,
        metadata: { name: cleanName, assetTag, status },
      },
    }).catch(() => null);

    return {
      ...asset,
      condition: data.condition || 'EXCELLENT',
      location: data.location || 'Headquarters',
      specifications: data.specifications || {},
      lifecycleHistory: initialHistory,
    };
  }

  // ---------------------------------------------------------------------------
  // ASSET LIFECYCLE: ASSIGN, TRANSFER, RETURN, MAINTENANCE, RETIRE
  // ---------------------------------------------------------------------------

  async assignAsset(
    workspaceId: string,
    assetId: string,
    actorMembershipId: string,
    data: { toMembershipId: string; notes?: string; condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; location?: string },
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, workspaceId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.status === 'UNDER_MAINTENANCE' || asset.status === 'DISPOSED') {
      throw new BadRequestException(`Cannot assign asset in ${asset.status} state`);
    }

    const targetMember = await this.prisma.membership.findFirst({
      where: { id: data.toMembershipId, workspaceId },
      include: { user: true },
    });
    if (!targetMember) throw new NotFoundException('Target member not found in workspace');

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Administrator';

    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'ASSIGNED',
        assignedToMembershipId: data.toMembershipId,
      },
      include: { assignedTo: { include: { user: true } } },
    });

    // Update metadata & lifecycle history
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};
    const currentMeta = assetMeta[assetId] || { lifecycleHistory: [] };

    const event: AssetLifecycleEvent = {
      id: `evt_${Date.now()}`,
      assetId,
      eventType: 'ASSIGNED',
      actorMembershipId,
      actorName,
      toMembershipId: data.toMembershipId,
      toLocation: data.location || currentMeta.location,
      condition: data.condition || currentMeta.condition || 'GOOD',
      notes: data.notes || `Assigned to ${targetMember.user.firstName} ${targetMember.user.lastName}.`,
      timestamp: new Date(),
    };

    assetMeta[assetId] = {
      ...currentMeta,
      condition: data.condition || currentMeta.condition || 'GOOD',
      location: data.location || currentMeta.location,
      lifecycleHistory: [event, ...(currentMeta.lifecycleHistory || [])],
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, assetMetadata: assetMeta } },
    });

    // Send notification to assigned member
    await this.prisma.notification.create({
      data: {
        workspaceId,
        recipientMembershipId: data.toMembershipId,
        title: `Asset Assigned: ${asset.name}`,
        message: `Asset "${asset.name}" (${asset.assetTag}) has been assigned to you.`,
        link: '/app/assets',
      },
    }).catch(() => null);

    return {
      ...updatedAsset,
      condition: assetMeta[assetId].condition,
      location: assetMeta[assetId].location,
      lifecycleHistory: assetMeta[assetId].lifecycleHistory,
    };
  }

  async transferAsset(
    workspaceId: string,
    assetId: string,
    actorMembershipId: string,
    data: { toMembershipId?: string; toLocation?: string; reason: string; condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' },
  ) {
    if (!data.reason?.trim()) throw new BadRequestException('Transfer reason is required');

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, workspaceId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Administrator';

    const fromMembershipId = asset.assignedToMembershipId || undefined;
    const toMembershipId = data.toMembershipId || asset.assignedToMembershipId || undefined;

    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        assignedToMembershipId: toMembershipId || null,
        status: toMembershipId ? 'ASSIGNED' : 'AVAILABLE',
      },
      include: { assignedTo: { include: { user: true } } },
    });

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};
    const currentMeta = assetMeta[assetId] || { lifecycleHistory: [] };

    const event: AssetLifecycleEvent = {
      id: `evt_${Date.now()}`,
      assetId,
      eventType: 'TRANSFERRED',
      actorMembershipId,
      actorName,
      fromMembershipId,
      toMembershipId,
      fromLocation: currentMeta.location,
      toLocation: data.toLocation || currentMeta.location,
      condition: data.condition || currentMeta.condition,
      notes: data.reason.trim(),
      timestamp: new Date(),
    };

    assetMeta[assetId] = {
      ...currentMeta,
      condition: data.condition || currentMeta.condition,
      location: data.toLocation || currentMeta.location,
      lifecycleHistory: [event, ...(currentMeta.lifecycleHistory || [])],
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, assetMetadata: assetMeta } },
    });

    return {
      ...updatedAsset,
      condition: assetMeta[assetId].condition,
      location: assetMeta[assetId].location,
      lifecycleHistory: assetMeta[assetId].lifecycleHistory,
    };
  }

  async returnAsset(
    workspaceId: string,
    assetId: string,
    actorMembershipId: string,
    data: { condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; returnLocation?: string; notes?: string },
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, workspaceId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const fromMembershipId = asset.assignedToMembershipId || undefined;

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Administrator';

    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'AVAILABLE',
        assignedToMembershipId: null,
      },
    });

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};
    const currentMeta = assetMeta[assetId] || { lifecycleHistory: [] };

    const event: AssetLifecycleEvent = {
      id: `evt_${Date.now()}`,
      assetId,
      eventType: 'RETURNED',
      actorMembershipId,
      actorName,
      fromMembershipId,
      toLocation: data.returnLocation || 'Central Inventory Storage',
      condition: data.condition,
      notes: data.notes || `Asset returned to pool in ${data.condition} condition.`,
      timestamp: new Date(),
    };

    assetMeta[assetId] = {
      ...currentMeta,
      condition: data.condition,
      location: data.returnLocation || 'Central Inventory Storage',
      lifecycleHistory: [event, ...(currentMeta.lifecycleHistory || [])],
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, assetMetadata: assetMeta } },
    });

    return {
      ...updatedAsset,
      condition: data.condition,
      location: assetMeta[assetId].location,
      lifecycleHistory: assetMeta[assetId].lifecycleHistory,
    };
  }

  async recordMaintenance(
    workspaceId: string,
    assetId: string,
    actorMembershipId: string,
    data: {
      action: 'START' | 'COMPLETE';
      issueDescription?: string;
      serviceProvider?: string;
      cost?: number;
      resultCondition?: 'EXCELLENT' | 'GOOD' | 'FAIR';
      notes?: string;
    },
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, workspaceId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Administrator';

    const newStatus: AssetStatus = data.action === 'START' ? 'UNDER_MAINTENANCE' : 'AVAILABLE';

    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: newStatus },
    });

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};
    const currentMeta = assetMeta[assetId] || { lifecycleHistory: [] };

    const event: AssetLifecycleEvent = {
      id: `evt_${Date.now()}`,
      assetId,
      eventType: data.action === 'START' ? 'MAINTENANCE_STARTED' : 'MAINTENANCE_COMPLETED',
      actorMembershipId,
      actorName,
      serviceProvider: data.serviceProvider,
      cost: data.cost ? Number(data.cost) : undefined,
      condition: data.resultCondition || currentMeta.condition,
      notes: data.notes || data.issueDescription || `Maintenance ${data.action.toLowerCase()}ed.`,
      timestamp: new Date(),
    };

    assetMeta[assetId] = {
      ...currentMeta,
      condition: data.resultCondition || currentMeta.condition,
      lifecycleHistory: [event, ...(currentMeta.lifecycleHistory || [])],
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, assetMetadata: assetMeta } },
    });

    return {
      ...updatedAsset,
      condition: assetMeta[assetId].condition,
      location: assetMeta[assetId].location,
      lifecycleHistory: assetMeta[assetId].lifecycleHistory,
    };
  }

  async retireAsset(
    workspaceId: string,
    assetId: string,
    actorMembershipId: string,
    data: { reason: string; salvageValue?: number; notes?: string },
  ) {
    if (!data.reason?.trim()) throw new BadRequestException('Disposal/Retirement reason is required');

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, workspaceId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Administrator';

    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'DISPOSED',
        assignedToMembershipId: null,
      },
    });

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assetMeta = settings.assetMetadata || {};
    const currentMeta = assetMeta[assetId] || { lifecycleHistory: [] };

    const event: AssetLifecycleEvent = {
      id: `evt_${Date.now()}`,
      assetId,
      eventType: 'DISPOSED',
      actorMembershipId,
      actorName,
      condition: 'POOR',
      cost: data.salvageValue ? Number(data.salvageValue) : undefined,
      notes: `Retired/Disposed: ${data.reason}. ${data.notes || ''}`.trim(),
      timestamp: new Date(),
    };

    assetMeta[assetId] = {
      ...currentMeta,
      condition: 'POOR',
      lifecycleHistory: [event, ...(currentMeta.lifecycleHistory || [])],
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, assetMetadata: assetMeta } },
    });

    return {
      ...updatedAsset,
      condition: 'POOR',
      location: currentMeta.location,
      lifecycleHistory: assetMeta[assetId].lifecycleHistory,
    };
  }
}
