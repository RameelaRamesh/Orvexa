import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface RequestCategory {
  id: string;
  name: string;
  description?: string;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  defaultResponsibleTeamId?: string;
  requireApproval?: boolean;
  routingRules?: Array<{
    field: string;
    value: string;
    routeToTeamId: string;
  }>;
  customFields?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    required: boolean;
    options?: string[];
  }>;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderThreshold: number;
  updatedAt: Date;
}

export interface ServiceRequest {
  id: string;
  workspaceId: string;
  ticketNumber: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  requesterMembershipId: string;
  requesterName: string;
  requesterEmail?: string;
  ownerMembershipId?: string;
  ownerName?: string;
  responsibleTeamId?: string;
  responsibleTeamName?: string;
  departmentId?: string;
  location?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  linkedAssetId?: string;
  inventoryItem?: string;
  requestedQuantity?: number;
  isFulfilled?: boolean;
  fulfilledQuantity?: number;
  replenishmentItems?: Array<{
    inventoryItemId?: string;
    name?: string;
    requestedQuantity: number;
    fulfilledQuantity?: number;
  }>;
  isEscalated?: boolean;
  escalationReason?: string;
  customFields?: Record<string, any>;
  comments: Array<{
    id: string;
    authorMembershipId: string;
    authorName: string;
    text: string;
    createdAt: Date;
  }>;
  attachments?: Array<{ id: string; name: string; url: string }>;
  activityLog: Array<{
    action: string;
    actorId: string;
    actorName: string;
    timestamp: Date;
    details: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDeliveryLog {
  id: string;
  idempotencyKey: string;
  recipientMembershipId: string;
  title: string;
  message: string;
  status: 'DELIVERED' | 'FAILED';
  error?: string;
  retryCount: number;
  createdAt: Date;
}

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CONFIGURABLE REQUEST TYPES & CATEGORIES (ZERO PRESETS FORCED)
  // ---------------------------------------------------------------------------

  async listCategories(workspaceId: string): Promise<RequestCategory[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    return settings.requestCategories || [];
  }

  async createCategory(
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      defaultResponsibleTeamId?: string;
      requireApproval?: boolean;
      routingRules?: any[];
      customFields?: any[];
    },
  ): Promise<RequestCategory> {
    const cleanName = data.name.trim();
    if (!cleanName) throw new BadRequestException('Category name is required');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const categories: RequestCategory[] = settings.requestCategories || [];

    const existing = categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) throw new BadRequestException(`Category "${cleanName}" already exists`);

    const newCategory: RequestCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: cleanName,
      description: data.description?.trim(),
      defaultPriority: data.defaultPriority || 'MEDIUM',
      defaultResponsibleTeamId: data.defaultResponsibleTeamId,
      requireApproval: !!data.requireApproval,
      routingRules: data.routingRules || [],
      customFields: data.customFields || [],
      isActive: true,
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          requestCategories: [...categories, newCategory],
        },
      },
    });

    return newCategory;
  }

  // ---------------------------------------------------------------------------
  // REQUEST CREATION & AUTO-ROUTING TO RESPONSIBLE TEAM
  // ---------------------------------------------------------------------------

  async createRequest(
    workspaceId: string,
    requesterMembershipId: string,
    data: {
      categoryId: string;
      title: string;
      description: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: Date | string;
      departmentId?: string;
      location?: string;
      linkedAssetId?: string;
      inventoryItem?: string;
      requestedQuantity?: number;
      replenishmentItems?: Array<{
        inventoryItemId?: string;
        name?: string;
        requestedQuantity: number;
      }>;
      customFields?: Record<string, any>;
      responsibleTeamId?: string;
      ownerMembershipId?: string;
    },
  ): Promise<ServiceRequest> {
    if (!data.title?.trim() || !data.description?.trim()) {
      throw new BadRequestException('Request title and description are required');
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const categories: RequestCategory[] = settings.requestCategories || [];
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const category = categories.find((c) => c.id === data.categoryId);
    const categoryName = category ? category.name : 'General Request';

    const requester = await this.prisma.membership.findFirst({
      where: { id: requesterMembershipId, workspaceId },
      include: { user: true, department: true },
    });
    if (!requester) throw new NotFoundException('Requester not found');
    const requesterName = `${requester.user.firstName} ${requester.user.lastName}`;

    // Auto-Routing: Resolve Responsible Team
    let resolvedTeamId = data.responsibleTeamId || category?.defaultResponsibleTeamId;
    let resolvedTeamName: string | undefined = undefined;

    if (category?.routingRules && category.routingRules.length > 0) {
      for (const rule of category.routingRules) {
        if (rule.field === 'location' && rule.value === data.location) {
          resolvedTeamId = rule.routeToTeamId;
          break;
        }
      }
    }

    if (resolvedTeamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: resolvedTeamId, workspaceId },
      });
      if (team) resolvedTeamName = team.name;
    }

    const nextSeq = requests.length + 1001;
    const ticketNumber = `REQ-${nextSeq}`;

    const newRequest: ServiceRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspaceId,
      ticketNumber,
      categoryId: data.categoryId,
      categoryName,
      title: data.title.trim(),
      description: data.description.trim(),
      requesterMembershipId,
      requesterName,
      requesterEmail: requester.user.email,
      ownerMembershipId: data.ownerMembershipId,
      responsibleTeamId: resolvedTeamId,
      responsibleTeamName: resolvedTeamName,
      departmentId: data.departmentId || requester.departmentId || undefined,
      location: data.location,
      priority: data.priority || category?.defaultPriority || 'MEDIUM',
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      status: 'SUBMITTED',
      linkedAssetId: data.linkedAssetId,
      inventoryItem: data.inventoryItem || (data.replenishmentItems?.[0]?.name || data.replenishmentItems?.[0]?.inventoryItemId),
      requestedQuantity: data.requestedQuantity ? Number(data.requestedQuantity) : (data.replenishmentItems?.[0]?.requestedQuantity),
      replenishmentItems: data.replenishmentItems,
      customFields: data.customFields || {},
      comments: [],
      attachments: [],
      activityLog: [
        {
          action: 'SUBMITTED',
          actorId: requesterMembershipId,
          actorName: requesterName,
          timestamp: new Date(),
          details: `Request submitted and auto-routed to ${resolvedTeamName || 'Facilities/Team Queue'}.`,
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

    // Notify Responsible Team / Members
    if (resolvedTeamId) {
      const teamMembers = await this.prisma.membership.findMany({
        where: { teamId: resolvedTeamId, workspaceId, status: 'ACTIVE' },
      });
      for (const tm of teamMembers) {
        await this.sendNotificationSafely(
          workspaceId,
          tm.id,
          `New ${categoryName} Request [${ticketNumber}]`,
          `"${newRequest.title}" was routed to ${resolvedTeamName || 'your team'}.`,
          `routing_${newRequest.id}_${tm.id}`,
        );
      }
    }

    return newRequest;
  }

  // ---------------------------------------------------------------------------
  // LISTING & RESTRICTED ACCESS ENFORCEMENT
  // ---------------------------------------------------------------------------

  async listRequests(
    workspaceId: string,
    query?: {
      status?: string;
      categoryId?: string;
      responsibleTeamId?: string;
      requesterMembershipId?: string;
      ownerMembershipId?: string;
      search?: string;
    },
    userContext?: any,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let requests: ServiceRequest[] = settings.serviceRequests || [];

    // Data Scope & Privacy Gate:
    // If not Admin/Owner, regular members view requests they submitted OR requests routed to their team / owned by them
    if (
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN'
    ) {
      requests = requests.filter(
        (r) =>
          r.requesterMembershipId === userContext.membershipId ||
          r.ownerMembershipId === userContext.membershipId ||
          (userContext.teamId && r.responsibleTeamId === userContext.teamId) ||
          (userContext.departmentId && r.departmentId === userContext.departmentId),
      );
    }

    if (query?.status) requests = requests.filter((r) => r.status === query.status);
    if (query?.categoryId) requests = requests.filter((r) => r.categoryId === query.categoryId);
    if (query?.responsibleTeamId) requests = requests.filter((r) => r.responsibleTeamId === query.responsibleTeamId);
    if (query?.requesterMembershipId) requests = requests.filter((r) => r.requesterMembershipId === query.requesterMembershipId);
    if (query?.ownerMembershipId) requests = requests.filter((r) => r.ownerMembershipId === query.ownerMembershipId);

    if (query?.search) {
      const q = query.search.toLowerCase();
      requests = requests.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.ticketNumber.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    return requests;
  }

  async getRequestById(workspaceId: string, id: string, userContext?: any): Promise<ServiceRequest> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const request = requests.find((r) => r.id === id);
    if (!request) {
      throw new NotFoundException('Service request not found in this workspace');
    }

    // PRIVACY ENFORCEMENT: Block unauthorized users from reading restricted requests
    if (
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN'
    ) {
      const isRequester = request.requesterMembershipId === userContext.membershipId;
      const isOwner = request.ownerMembershipId === userContext.membershipId;
      const isTeam = userContext.teamId && request.responsibleTeamId === userContext.teamId;

      if (!isRequester && !isOwner && !isTeam) {
        throw new ForbiddenException('Access denied: You are not authorized to view this request.');
      }
    }

    return request;
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE: ACKNOWLEDGE, FULFILL, INVENTORY DEDUCTION, CLOSE & ESCALATE
  // ---------------------------------------------------------------------------

  async acknowledgeRequest(
    workspaceId: string,
    requestId: string,
    actorMembershipId: string,
    notes?: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new NotFoundException('Request not found');

    const req = requests[reqIndex];
    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Team Lead';

    const activityLog = req.activityLog || [];
    activityLog.push({
      action: 'ACKNOWLEDGED',
      actorId: actorMembershipId,
      actorName,
      timestamp: new Date(),
      details: notes || `Request acknowledged by ${actorName}. Work is now in progress.`,
    });

    requests[reqIndex] = {
      ...req,
      status: 'IN_PROGRESS',
      ownerMembershipId: req.ownerMembershipId || actorMembershipId,
      ownerName: req.ownerName || actorName,
      activityLog,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, serviceRequests: requests } },
    });

    // Notify Requester
    await this.sendNotificationSafely(
      workspaceId,
      req.requesterMembershipId,
      `Request Acknowledged [${req.ticketNumber}]`,
      `"${req.title}" was acknowledged by ${actorName} and is in progress.`,
      `ack_${req.id}`,
    );

    return requests[reqIndex];
  }

  /**
   * Fulfill Request: Updates inventory stock levels, resolves ticket, and notifies requester
   */
  async fulfillRequest(
    workspaceId: string,
    requestId: string,
    actorMembershipId: string,
    fulfillmentNotes?: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];
    const inventory: InventoryItem[] = settings.inventory || [];

    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new NotFoundException('Request not found');

    const req = requests[reqIndex];
    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}` : 'Inventory Manager';

    let inventoryDeductionDetail = '';
    // INVENTORY STOCK DEDUCTION (ACCEPTANCE SCENARIO)
    if (req.replenishmentItems && req.replenishmentItems.length > 0) {
      for (const rItem of req.replenishmentItems) {
        const itemIndex = inventory.findIndex(
          (i) =>
            i.id === rItem.inventoryItemId ||
            i.name.toLowerCase() === (rItem.name || '').toLowerCase() ||
            (rItem.inventoryItemId && i.name.toLowerCase().includes(rItem.inventoryItemId.toLowerCase())) ||
            (rItem.name && i.name.toLowerCase().includes(rItem.name.toLowerCase())),
        );

        if (itemIndex !== -1) {
          const item = inventory[itemIndex];
          const prevStock = item.currentStock;
          const qty = rItem.requestedQuantity || 0;
          const newStock = Math.max(0, prevStock - qty);

          inventory[itemIndex] = {
            ...item,
            currentStock: newStock,
            updatedAt: new Date(),
          };
          rItem.fulfilledQuantity = qty;
          inventoryDeductionDetail += ` Stock deducted for "${item.name}": ${prevStock} → ${newStock} ${item.unit}.`;
        }
      }
    } else if (req.inventoryItem && req.requestedQuantity) {
      const itemIndex = inventory.findIndex(
        (i) =>
          i.name.toLowerCase() === req.inventoryItem?.toLowerCase() ||
          i.id === req.inventoryItem ||
          i.name.toLowerCase().includes(req.inventoryItem?.toLowerCase() || ''),
      );

      if (itemIndex !== -1) {
        const item = inventory[itemIndex];
        const prevStock = item.currentStock;
        const newStock = Math.max(0, prevStock - req.requestedQuantity);

        inventory[itemIndex] = {
          ...item,
          currentStock: newStock,
          updatedAt: new Date(),
        };

        inventoryDeductionDetail = ` Stock deducted for "${item.name}": ${prevStock} → ${newStock} ${item.unit}.`;
      }
    }

    const activityLog = req.activityLog || [];
    activityLog.push({
      action: 'FULFILLED',
      actorId: actorMembershipId,
      actorName,
      timestamp: new Date(),
      details: `${fulfillmentNotes || 'Supplies replenished and verified.'}${inventoryDeductionDetail}`,
    });

    requests[reqIndex] = {
      ...req,
      status: 'RESOLVED',
      isFulfilled: true,
      fulfilledQuantity: req.requestedQuantity,
      activityLog,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          serviceRequests: requests,
          inventory,
        },
      },
    });

    // Notify Requester of fulfillment
    await this.sendNotificationSafely(
      workspaceId,
      req.requesterMembershipId,
      `Request Fulfilled & Resolved [${req.ticketNumber}]`,
      `"${req.title}" has been fulfilled by ${actorName}. Please confirm and close.`,
      `fulfilled_${req.id}`,
    );

    return requests[reqIndex];
  }

  async closeRequest(
    workspaceId: string,
    requestId: string,
    actorMembershipId: string,
    feedback?: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new NotFoundException('Request not found');

    const req = requests[reqIndex];
    const activityLog = req.activityLog || [];
    activityLog.push({
      action: 'CLOSED',
      actorId: actorMembershipId,
      actorName: 'Requester',
      timestamp: new Date(),
      details: feedback ? `Closed with feedback: "${feedback}"` : 'Request officially closed.',
    });

    requests[reqIndex] = {
      ...req,
      status: 'CLOSED',
      activityLog,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, serviceRequests: requests } },
    });

    return requests[reqIndex];
  }

  async escalateRequest(
    workspaceId: string,
    requestId: string,
    actorMembershipId: string,
    reason: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new NotFoundException('Request not found');

    const req = requests[reqIndex];
    const activityLog = req.activityLog || [];
    activityLog.push({
      action: 'ESCALATED',
      actorId: actorMembershipId,
      actorName: 'Team Member',
      timestamp: new Date(),
      details: `Escalated to URGENT: ${reason}`,
    });

    requests[reqIndex] = {
      ...req,
      priority: 'URGENT',
      isEscalated: true,
      escalationReason: reason,
      activityLog,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, serviceRequests: requests } },
    });

    return requests[reqIndex];
  }

  async addComment(
    workspaceId: string,
    requestId: string,
    authorMembershipId: string,
    authorName: string,
    text: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('Comment text is required');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new NotFoundException('Request not found');

    const req = requests[reqIndex];
    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      authorMembershipId,
      authorName,
      text: text.trim(),
      createdAt: new Date(),
    };

    requests[reqIndex] = {
      ...req,
      comments: [...req.comments, newComment],
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, serviceRequests: requests } },
    });

    return newComment;
  }

  // ---------------------------------------------------------------------------
  // INVENTORY & SUPPLIES MANAGEMENT
  // ---------------------------------------------------------------------------

  async getInventory(workspaceId: string): Promise<InventoryItem[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let inventory: InventoryItem[] = settings.inventory || [];

    if (inventory.length === 0) {
      // Initialize configurable baseline stock items
      inventory = [
        { id: 'inv_1', name: 'Tissue Boxes', category: 'Pantry & Hygiene', currentStock: 50, unit: 'boxes', reorderThreshold: 10, updatedAt: new Date() },
        { id: 'inv_2', name: 'Snacks & Beverages', category: 'Pantry & Hygiene', currentStock: 80, unit: 'packs', reorderThreshold: 20, updatedAt: new Date() },
        { id: 'inv_3', name: 'HDMI & Display Cables', category: 'IT Accessories', currentStock: 25, unit: 'units', reorderThreshold: 5, updatedAt: new Date() },
      ];
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: { ...settings, inventory } },
      });
    }

    return inventory;
  }

  async updateInventoryItem(
    workspaceId: string,
    data: { name: string; category?: string; currentStock: number; unit?: string; reorderThreshold?: number },
  ): Promise<InventoryItem> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const inventory: InventoryItem[] = settings.inventory || [];

    const existingIndex = inventory.findIndex((i) => i.name.toLowerCase() === data.name.toLowerCase());
    let item: InventoryItem;

    if (existingIndex !== -1) {
      item = {
        ...inventory[existingIndex],
        currentStock: Number(data.currentStock),
        category: data.category || inventory[existingIndex].category,
        unit: data.unit || inventory[existingIndex].unit,
        reorderThreshold: data.reorderThreshold !== undefined ? Number(data.reorderThreshold) : inventory[existingIndex].reorderThreshold,
        updatedAt: new Date(),
      };
      inventory[existingIndex] = item;
    } else {
      item = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: data.name.trim(),
        category: data.category || 'General Supplies',
        currentStock: Number(data.currentStock),
        unit: data.unit || 'units',
        reorderThreshold: data.reorderThreshold ? Number(data.reorderThreshold) : 5,
        updatedAt: new Date(),
      };
      inventory.push(item);
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, inventory } },
    });

    return item;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION DELIVERY & IDEMPOTENT RETRIES (REQUIREMENT 11)
  // ---------------------------------------------------------------------------

  private async sendNotificationSafely(
    workspaceId: string,
    recipientMembershipId: string,
    title: string,
    message: string,
    idempotencyKey: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const deliveryLogs: NotificationDeliveryLog[] = settings.notificationDeliveryLogs || [];

    const existing = deliveryLogs.find((d) => d.idempotencyKey === idempotencyKey && d.status === 'DELIVERED');
    if (existing) {
      return existing; // Idempotent: already sent
    }

    let status: 'DELIVERED' | 'FAILED' = 'DELIVERED';
    let error: string | undefined = undefined;

    try {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId,
          title,
          message,
          link: '/app/requests',
        },
      });
    } catch (err: any) {
      status = 'FAILED';
      error = err.message || 'Notification insertion failed';
    }

    const log: NotificationDeliveryLog = {
      id: `notif_log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      idempotencyKey,
      recipientMembershipId,
      title,
      message,
      status,
      error,
      retryCount: 0,
      createdAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          notificationDeliveryLogs: [log, ...deliveryLogs.slice(0, 99)],
        },
      },
    });

    return log;
  }

  async retryNotificationDelivery(workspaceId: string, notificationLogId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const deliveryLogs: NotificationDeliveryLog[] = settings.notificationDeliveryLogs || [];

    const targetIndex = deliveryLogs.findIndex((l) => l.id === notificationLogId);
    if (targetIndex === -1) throw new NotFoundException('Notification delivery log not found');

    const log = deliveryLogs[targetIndex];

    try {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId: log.recipientMembershipId,
          title: log.title,
          message: log.message,
          link: '/app/requests',
        },
      });

      deliveryLogs[targetIndex] = {
        ...log,
        status: 'DELIVERED',
        error: undefined,
        retryCount: log.retryCount + 1,
      };
    } catch (err: any) {
      deliveryLogs[targetIndex] = {
        ...log,
        status: 'FAILED',
        error: err.message || 'Retry delivery failed',
        retryCount: log.retryCount + 1,
      };
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, notificationDeliveryLogs: deliveryLogs } },
    });

    return deliveryLogs[targetIndex];
  }
}
