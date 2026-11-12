import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Optional,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infrastructure/mail/mail.service';

export interface RequestCategory {
  id: string;
  name: string;
  code?: string;
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
  slaHours?: number;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  code?: string;
  name: string;
  category: string;
  currentStock: number;
  quantityOnHand?: number;
  unit: string;
  reorderThreshold: number;
  reorderPoint?: number;
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
  requesterRole?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  ownerMembershipId?: string;
  ownerName?: string;
  
  // Role-Group Routing (Requirement 2)
  targetRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  targetRoleId?: string | null;
  targetRoleName?: string | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  assignedTo?: string | null; // membershipId or userId of claimant
  assignedToName?: string | null;
  acceptedAt?: Date | string | null;

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
  activityTimeline: Array<{
    action: string;
    actorMembershipId?: string;
    actorId?: string;
    actorName: string;
    timestamp: Date;
    notes?: string;
    details?: string;
  }>;
  activityLog?: Array<{
    action: string;
    actorMembershipId?: string;
    actorId?: string;
    actorName: string;
    timestamp: Date;
    notes?: string;
    details?: string;
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
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. ROLE-GROUPS LOOKUP & MEMBER ENUMERATION (Requirement 1 & 7)
  // ---------------------------------------------------------------------------

  async getRoleGroups(workspaceId: string) {
    const members = await this.prisma.membership.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      include: {
        user: true,
        designation: true,
        department: true,
        role: true,
      },
    });

    const formatMember = (m: any) => ({
      id: m.id,
      userId: m.userId,
      name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || 'Team Member',
      firstName: m.user?.firstName || '',
      lastName: m.user?.lastName || '',
      email: m.user?.email || '',
      avatarUrl: m.user?.avatarUrl || null,
      role: m.role?.name || m.accessRole,
      roleId: m.roleId || null,
      teamId: m.teamId || null,
      designation: m.designation?.title || '',
      department: m.department?.name || '',
    });

    // LEGACY_ROLE_COMMENTED_OUT: MANAGER and MEMBER arrays kept internally for legacy compatibility; active routing focuses on OWNER, ADMIN, customRoles, and teams
    const groups: {
      OWNER: any[];
      ADMIN: any[];
      MANAGER: any[];
      MEMBER: any[];
      customRoles: Array<{ id: string; name: string; members: any[] }>;
      teams: Array<{ id: string; name: string; members: any[] }>;
    } = {
      OWNER: [],
      ADMIN: [],
      MANAGER: [],
      MEMBER: [],
      customRoles: [],
      teams: [],
    };

    for (const m of members) {
      const formatted = formatMember(m);
      const role = (m.accessRole || 'MEMBER').toUpperCase();
      if (role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' || role === 'MEMBER') {
        groups[role].push(formatted);
      }
    }

    const [wsRoles, wsTeams] = await Promise.all([
      (this.prisma as any).role?.findMany?.({ where: { workspaceId, isSystemRole: false } })?.catch?.(() => []) || [],
      (this.prisma as any).team?.findMany?.({ where: { workspaceId } })?.catch?.(() => []) || [],
    ]);

    groups.customRoles = (wsRoles || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      members: members.filter((m: any) => m.roleId === r.id).map(formatMember),
    }));

    groups.teams = (wsTeams || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      members: members.filter((m: any) => m.teamId === t.id).map(formatMember),
    }));

    return groups;
  }

  // ---------------------------------------------------------------------------
  // 2. CONFIGURABLE REQUEST TYPES & DEFAULT CATEGORIES SEEDING (Requirement 8)
  // ---------------------------------------------------------------------------

  async listCategories(workspaceId: string): Promise<RequestCategory[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let categories: RequestCategory[] = settings.requestCategories || [];

    // Seed default categories (Requirement 8) so "Configured Categories" is never empty
    if (!categories || categories.length === 0) {
      categories = [
        {
          id: 'cat_it',
          name: 'IT support',
          code: 'IT_SUPPORT',
          description: 'Hardware, software, workstation, staging DB access and system issues',
          defaultPriority: 'MEDIUM',
          slaHours: 12,
          isActive: true,
        },
        {
          id: 'cat_facilities',
          name: 'Facilities',
          code: 'FACILITIES',
          description: 'Office maintenance, electricals, heating, air conditioning and access cards',
          defaultPriority: 'MEDIUM',
          slaHours: 24,
          isActive: true,
        },
        {
          id: 'cat_supplies',
          name: 'Supplies',
          code: 'SUPPLIES',
          description: 'Stationery, pantry items, coffee, snack boxes and consumables replenishment',
          defaultPriority: 'LOW',
          slaHours: 24,
          isActive: true,
        },
        {
          id: 'cat_hr',
          name: 'HR and people',
          code: 'HR_PEOPLE',
          description: 'Employee onboarding, leave approvals, payroll questions and benefits',
          defaultPriority: 'MEDIUM',
          slaHours: 24,
          isActive: true,
        },
        {
          id: 'cat_general',
          name: 'General request',
          code: 'GENERAL_REQUEST',
          description: 'General workspace service requests, team logistics, and inquiries',
          defaultPriority: 'MEDIUM',
          slaHours: 48,
          isActive: true,
        },
      ];

      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          settings: {
            ...settings,
            requestCategories: categories,
          },
        },
      });
    }

    return categories;
  }

  async createCategory(
    workspaceId: string,
    data: {
      name: string;
      code?: string;
      description?: string;
      defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      defaultResponsibleTeamId?: string;
      requireApproval?: boolean;
      routingRules?: any[];
      customFields?: any[];
      slaHours?: number;
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
      code: data.code || cleanName.toUpperCase().replace(/\s+/g, '_'),
      description: data.description?.trim(),
      defaultPriority: data.defaultPriority || 'MEDIUM',
      defaultResponsibleTeamId: data.defaultResponsibleTeamId,
      requireApproval: !!data.requireApproval,
      routingRules: data.routingRules || [],
      customFields: data.customFields || [],
      slaHours: data.slaHours || 24,
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
  // 3. SERVICE REQUEST CREATION WITH ROLE ROUTING & VALIDATION (Requirements 1, 2, 4, 7)
  // ---------------------------------------------------------------------------

  async createRequest(
    workspaceId: string,
    requesterMembershipId: string,
    data: {
      categoryId?: string;
      title: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      targetRole?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'owner' | 'admin' | 'manager' | 'member';
      targetRoleId?: string | null;
      targetRoleName?: string | null;
      targetUserId?: string | null;
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
      attachments?: Array<{ id: string; name: string; url: string }>;
      responsibleTeamId?: string;
    },
  ): Promise<ServiceRequest> {
    // 1. Validate required fields
    if (!data.title?.trim()) {
      throw new BadRequestException('Enter a title');
    }

    const hasExplicitTargetRoleId = !!data.targetRoleId;
    const hasExplicitTargetRole = !!data.targetRole && !hasExplicitTargetRoleId;
    const rawTargetRole =
      data.targetRole || (hasExplicitTargetRoleId || data.responsibleTeamId ? 'MEMBER' : 'ADMIN');
    const normalizedTargetRole = rawTargetRole.toUpperCase() as 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

    // 2. Fetch requester details and check hierarchy permissions
    const requester = await this.prisma.membership.findFirst({
      where: { id: requesterMembershipId, workspaceId },
      include: { user: true, department: true },
    });
    if (!requester) throw new NotFoundException('Requester membership not found');
    const requesterName = `${requester.user.firstName} ${requester.user.lastName}`.trim();
    const requesterRole = (requester.accessRole || 'MEMBER').toUpperCase();

    const roleLevels: Record<string, number> = {
      MEMBER: 1,
      MANAGER: 2,
      ADMIN: 3,
      OWNER: 4,
    };
    const userLevel = roleLevels[requesterRole] || 1;
    const targetLevel = roleLevels[normalizedTargetRole] || 1;

    if (hasExplicitTargetRole) {
      if (!['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(normalizedTargetRole)) {
        throw new BadRequestException('Invalid target role specified');
      }

      /* LEGACY_ROLE_COMMENTED_OUT: Hierarchical MEMBER -> MANAGER -> ADMIN -> OWNER routing lock retired so Staff/Admin/Owner can route requests freely across org roles and teams.
      // Rule: A user can send only to their own role level or above
      if (targetLevel < userLevel) {
        throw new ForbiddenException(`You can only route requests to your own role level (${requesterRole}) or above.`);
      }

      // Rule: Members cannot send directly to Owner unless routing via category/custom role
      if (requesterRole === 'MEMBER' && normalizedTargetRole === 'OWNER') {
        throw new ForbiddenException('Members cannot send service requests directly to the Owner.');
      }
      */
    }

    // 3. Verify target role / custom role / team has active members in workspace
    let activeTargetMembers: any[] = [];
    let resolvedTargetRoleName = data.targetRoleName || null;

    if (hasExplicitTargetRoleId) {
      activeTargetMembers = await this.prisma.membership.findMany({
        where: { workspaceId, roleId: data.targetRoleId!, status: 'ACTIVE' },
        include: { user: true, role: true },
      });
      if (!resolvedTargetRoleName && activeTargetMembers[0]?.role?.name) {
        resolvedTargetRoleName = activeTargetMembers[0].role.name;
      }
      if (activeTargetMembers.length === 0) {
        const roleRec = await (this.prisma as any).role?.findFirst?.({ where: { id: data.targetRoleId } })?.catch?.(() => null);
        resolvedTargetRoleName = resolvedTargetRoleName || roleRec?.name || 'Custom Role';
      }
    } else if (data.responsibleTeamId && !hasExplicitTargetRole) {
      activeTargetMembers = await this.prisma.membership.findMany({
        where: { workspaceId, teamId: data.responsibleTeamId, status: 'ACTIVE' },
        include: { user: true },
      });
    } else {
      activeTargetMembers = await this.prisma.membership.findMany({
        where: { workspaceId, accessRole: normalizedTargetRole as any, status: 'ACTIVE' },
        include: { user: true },
      });
    }

    if (activeTargetMembers.length === 0) {
      if (hasExplicitTargetRole) {
        throw new BadRequestException(`No active ${normalizedTargetRole.toLowerCase()}s found in this workspace yet.`);
      }
      if (hasExplicitTargetRoleId) {
        throw new BadRequestException(`No active members assigned to ${resolvedTargetRoleName || 'selected role'} yet.`);
      }
      activeTargetMembers = [requester];
    }

    // Check target user if specific recipient chosen
    let resolvedTargetUserId: string | null = null;
    let resolvedTargetUserName: string | null = null;
    let targetRecipientEmail: string | null = null;

    if (data.targetUserId) {
      const match = activeTargetMembers.find(
        (m) => m.userId === data.targetUserId || m.id === data.targetUserId,
      );
      if (match) {
        resolvedTargetUserId = match.userId;
        resolvedTargetUserName = `${match.user.firstName} ${match.user.lastName}`.trim();
        targetRecipientEmail = match.user.email;
      }
    }

    // 4. Resolve category
    const categories = await this.listCategories(workspaceId);
    let category = categories.find((c) => c.id === data.categoryId);
    if (!category) {
      category = categories.find((c) => c.name.toLowerCase() === 'general request') || categories[0];
    }
    const categoryName = category?.name || 'General request';
    const categoryId = category?.id || 'cat_general';

    // 5. Load existing requests
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const nextSeq = requests.length + 1001;
    const ticketNumber = `REQ-${nextSeq}`;
    const priority = data.priority || category?.defaultPriority || 'MEDIUM';

    const resolvedTeamId = data.responsibleTeamId || category?.defaultResponsibleTeamId;
    let resolvedTeamName: string | undefined = undefined;
    if (resolvedTeamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: resolvedTeamId, workspaceId },
      });
      if (team) resolvedTeamName = team.name;
    }

    const routeLabel = resolvedTargetUserName
      ? resolvedTargetUserName
      : resolvedTargetRoleName
      ? `${resolvedTargetRoleName} group`
      : resolvedTeamName
      ? `${resolvedTeamName} team`
      : `${normalizedTargetRole.charAt(0) + normalizedTargetRole.slice(1).toLowerCase()} group`;

    const newRequest: ServiceRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspaceId,
      ticketNumber,
      categoryId,
      categoryName,
      title: data.title.trim(),
      description: data.description?.trim() || 'No additional details provided.',
      requesterMembershipId,
      requesterName,
      requesterEmail: requester.user.email,
      requesterRole: requester.accessRole as any,
      targetRole: normalizedTargetRole,
      targetRoleId: data.targetRoleId || null,
      targetRoleName: resolvedTargetRoleName,
      targetUserId: resolvedTargetUserId,
      targetUserName: resolvedTargetUserName,
      assignedTo: null,
      assignedToName: null,
      acceptedAt: null,
      ownerMembershipId: undefined,
      responsibleTeamId: resolvedTeamId,
      responsibleTeamName: resolvedTeamName,
      priority,
      status: 'SUBMITTED',
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      linkedAssetId: data.linkedAssetId,
      inventoryItem: data.inventoryItem,
      requestedQuantity: data.requestedQuantity ? Number(data.requestedQuantity) : undefined,
      replenishmentItems: data.replenishmentItems,
      comments: [],
      attachments: data.attachments || [],
      activityTimeline: [
        {
          action: 'CREATED',
          actorMembershipId: requesterMembershipId,
          actorName: requesterName,
          timestamp: new Date(),
          notes: `Request created and routed to ${routeLabel}.`,
          details: `Request created and routed to ${routeLabel}.`,
        },
      ],
      activityLog: [
        {
          action: 'CREATED',
          actorMembershipId: requesterMembershipId,
          actorName: requesterName,
          timestamp: new Date(),
          notes: `Request created and routed to ${routeLabel}.`,
          details: `Request created and routed to ${routeLabel}.`,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 6. Save ticket to workspace settings
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          serviceRequests: [newRequest, ...requests],
        },
      },
    });

    // 7. Dispatch Notifications (Requirement 4)
    // Notification text: "[Requester] sent you a [priority] request: [title]"
    const notificationTitle = `New Service Request [${ticketNumber}]`;
    const notificationText = `${requesterName} sent you a ${priority.toLowerCase()} request: ${newRequest.title}`;

    if (resolvedTargetUserId) {
      // Direct recipient target
      const targetMem = activeTargetMembers.find((m) => m.userId === resolvedTargetUserId);
      if (targetMem) {
        await this.sendNotificationSafely(
          workspaceId,
          targetMem.id,
          notificationTitle,
          notificationText,
          `req_target_${newRequest.id}_${targetMem.id}`,
        );
        if (targetRecipientEmail && this.mailService) {
          await this.mailService.sendNotificationEmail(
            targetRecipientEmail,
            notificationTitle,
            notificationText,
            '/app/requests',
          );
        }
      }
    } else {
      // Group target: notify everyone in the group
      for (const tm of activeTargetMembers) {
        await this.sendNotificationSafely(
          workspaceId,
          tm.id,
          notificationTitle,
          notificationText,
          `req_group_${newRequest.id}_${tm.id}`,
        );
        if (tm.user?.email && this.mailService) {
          await this.mailService.sendNotificationEmail(
            tm.user.email,
            notificationTitle,
            notificationText,
            '/app/requests',
          );
        }
      }
    }

    return newRequest;
  }

  // ---------------------------------------------------------------------------
  // 4. RESTRICTED VISIBILITY & FILTERING (Requirement 3)
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
      scope?: string; // 'ALL' | 'SENT_TO_ME' | 'SENT_BY_ME'
    },
    userContext?: any,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let requests: ServiceRequest[] = settings.serviceRequests || [];

    // Backend Privacy Gate (Requirement 3):
    // A ticket is visible to:
    // 1. The requester
    // 2. Anyone whose role equals target_role
    // 3. The target_user_id
    // 4. The assigned_to person
    // 5. System OWNER
    if (userContext && userContext.accessRole !== 'OWNER') {
      const userRole = (userContext.accessRole || 'MEMBER').toUpperCase();
      const userRoleId = userContext.roleId;
      const userTeamId = userContext.teamId;
      const currentMemId = userContext.membershipId;
      const currentUserId = userContext.userId || currentMemId;

      requests = requests.filter((r) => {
        const isRequester = r.requesterMembershipId === currentMemId;
        const isTargetRoleId = r.targetRoleId && userRoleId && r.targetRoleId === userRoleId;
        const isTargetRole =
          !r.targetRoleId && !r.responsibleTeamId && r.targetRole && r.targetRole.toUpperCase() === userRole;
        const isTargetTeam = r.responsibleTeamId && userTeamId && r.responsibleTeamId === userTeamId;
        const isTargetUser =
          r.targetUserId === currentUserId ||
          r.targetUserId === currentMemId;
        const isAssigned =
          r.assignedTo === currentMemId ||
          r.assignedTo === currentUserId ||
          r.ownerMembershipId === currentMemId;

        return isRequester || isTargetRoleId || isTargetRole || isTargetTeam || isTargetUser || isAssigned;
      });
    }

    // Apply Filter: All / Sent to me / Sent by me (Requirement 3)
    if (query?.scope === 'SENT_TO_ME' && userContext) {
      const userRole = (userContext.accessRole || 'MEMBER').toUpperCase();
      const userRoleId = userContext.roleId;
      const userTeamId = userContext.teamId;
      const currentMemId = userContext.membershipId;
      const currentUserId = userContext.userId || currentMemId;

      requests = requests.filter(
        (r) =>
          r.requesterMembershipId !== currentMemId &&
          ((r.targetRoleId && userRoleId && r.targetRoleId === userRoleId) ||
            (!r.targetRoleId && !r.responsibleTeamId && r.targetRole?.toUpperCase() === userRole) ||
            (r.responsibleTeamId && userTeamId && r.responsibleTeamId === userTeamId) ||
            r.targetUserId === currentUserId ||
            r.targetUserId === currentMemId ||
            r.assignedTo === currentMemId ||
            r.assignedTo === currentUserId),
      );
    } else if (query?.scope === 'SENT_BY_ME' && userContext) {
      requests = requests.filter(
        (r) => r.requesterMembershipId === userContext.membershipId,
      );
    }

    // Additional standard filters
    if (query?.status && query.status !== 'ALL') {
      requests = requests.filter((r) => r.status === query.status);
    }
    if (query?.categoryId && query.categoryId !== 'ALL') {
      requests = requests.filter((r) => r.categoryId === query.categoryId);
    }
    if (query?.search) {
      const q = query.search.toLowerCase().trim();
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

    // Backend Privacy Check
    if (userContext && userContext.accessRole !== 'OWNER') {
      const userRole = (userContext.accessRole || 'MEMBER').toUpperCase();
      const userRoleId = userContext.roleId;
      const userTeamId = userContext.teamId;
      const currentMemId = userContext.membershipId;
      const currentUserId = userContext.userId || currentMemId;

      const isRequester = request.requesterMembershipId === currentMemId;
      const isTargetRoleId = request.targetRoleId && userRoleId && request.targetRoleId === userRoleId;
      const isTargetRole =
        !request.targetRoleId && !request.responsibleTeamId && request.targetRole && request.targetRole.toUpperCase() === userRole;
      const isTargetTeam = request.responsibleTeamId && userTeamId && request.responsibleTeamId === userTeamId;
      const isTargetUser =
        request.targetUserId === currentUserId ||
        request.targetUserId === currentMemId;
      const isAssigned =
        request.assignedTo === currentMemId ||
        request.assignedTo === currentUserId ||
        request.ownerMembershipId === currentMemId;

      if (!isRequester && !isTargetRoleId && !isTargetRole && !isTargetTeam && !isTargetUser && !isAssigned) {
        throw new ForbiddenException('Access denied: You are not authorized to view this service request.');
      }
    }

    return request;
  }

  // ---------------------------------------------------------------------------
  // 5. CLAIMING / ACCEPTANCE WITH RACE CONDITION GUARD (Requirement 5)
  // ---------------------------------------------------------------------------

  async acceptRequest(
    workspaceId: string,
    requestId: string,
    actorMembershipId: string,
    actorUser?: any,
    notes?: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const requests: ServiceRequest[] = settings.serviceRequests || [];

    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new NotFoundException('Service request not found');

    const req = requests[reqIndex];

    // Race condition guard: only one person can accept
    if (req.assignedTo && req.assignedTo !== actorMembershipId) {
      throw new ConflictException(
        `This ticket has already been accepted by ${req.assignedToName || 'another team member'}.`,
      );
    }

    // Lookup actor details
    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor
      ? `${actor.user.firstName} ${actor.user.lastName}`.trim()
      : actorUser
      ? `${actorUser.firstName || ''} ${actorUser.lastName || ''}`.trim()
      : 'Team Member';

    const activityTimeline = req.activityTimeline || [];
    activityTimeline.push({
      action: 'ACCEPTED',
      actorMembershipId,
      actorName,
      timestamp: new Date(),
      notes: `Accepted by ${actorName}. Status moved to IN_PROGRESS.`,
      details: `Accepted by ${actorName}. Status moved to IN_PROGRESS.`,
    });
    activityTimeline.push({
      action: 'ACKNOWLEDGED',
      actorMembershipId,
      actorName,
      timestamp: new Date(),
      notes: notes || `Request acknowledged by ${actorName}. Work is now in progress.`,
      details: notes || `Request acknowledged by ${actorName}. Work is now in progress.`,
    });

    const acceptedAt = new Date();
    requests[reqIndex] = {
      ...req,
      status: 'IN_PROGRESS',
      assignedTo: actorMembershipId,
      assignedToName: actorName,
      acceptedAt,
      ownerMembershipId: actorMembershipId,
      ownerName: actorName,
      activityTimeline,
      activityLog: activityTimeline,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, serviceRequests: requests } },
    });

    // Notify requester
    await this.sendNotificationSafely(
      workspaceId,
      req.requesterMembershipId,
      `Ticket Accepted [${req.ticketNumber}]`,
      `${actorName} accepted your request "${req.title}". Status is now in progress.`,
      `claim_${req.id}_${actorMembershipId}`,
    );

    return requests[reqIndex];
  }

  // ---------------------------------------------------------------------------
  // 6. ESCALATION ENGINE (Requirement 6)
  // ---------------------------------------------------------------------------

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
    if (reqIndex === -1) throw new NotFoundException('Service request not found');

    const req = requests[reqIndex];

    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}`.trim() : 'Team Member';

    // LEGACY_ROLE_COMMENTED_OUT: Escalate staff/member tier directly to ADMIN -> OWNER (skipping retired MANAGER tier)
    const escalationLadder: Record<string, 'MANAGER' | 'ADMIN' | 'OWNER'> = {
      MEMBER: 'ADMIN', // previously 'MANAGER'
      MANAGER: 'ADMIN',
      ADMIN: 'OWNER',
      OWNER: 'OWNER',
    };

    const currentRole = (req.targetRole || 'MEMBER').toUpperCase();
    const nextRole = escalationLadder[currentRole] || 'ADMIN';

    const activityTimeline = req.activityTimeline || [];
    activityTimeline.push({
      action: 'ESCALATED',
      actorMembershipId,
      actorName,
      timestamp: new Date(),
      notes: `Escalated from ${currentRole} to ${nextRole} group. Reason: ${reason}`,
      details: `Escalated from ${currentRole} to ${nextRole} group. Reason: ${reason}`,
    });

    // Clear assigned_to, set priority URGENT, clear custom targetRoleId when escalating to Admin/Owner
    requests[reqIndex] = {
      ...req,
      targetRole: nextRole,
      targetRoleId: null,
      targetRoleName: null,
      targetUserId: null,
      targetUserName: null,
      assignedTo: null,
      assignedToName: null,
      acceptedAt: null,
      priority: 'URGENT',
      status: 'SUBMITTED',
      isEscalated: true,
      escalationReason: reason,
      activityTimeline,
      activityLog: activityTimeline,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, serviceRequests: requests } },
    });

    // Notify all active members in the newly escalated target role
    const newTargetMembers = await this.prisma.membership.findMany({
      where: { workspaceId, accessRole: nextRole as any, status: 'ACTIVE' },
      include: { user: true },
    });

    const notifTitle = `[Urgent Escalation] ${req.ticketNumber}`;
    const notifMessage = `Request "${req.title}" has been escalated to ${nextRole} group. Reason: ${reason}`;

    for (const tm of newTargetMembers) {
      await this.sendNotificationSafely(
        workspaceId,
        tm.id,
        notifTitle,
        notifMessage,
        `esc_${req.id}_${nextRole}_${tm.id}`,
      );
      if (tm.user?.email && this.mailService) {
        await this.mailService.sendNotificationEmail(tm.user.email, notifTitle, notifMessage, '/app/requests');
      }
    }

    return requests[reqIndex];
  }

  // ---------------------------------------------------------------------------
  // 7. ACKNOWLEDGE, FULFILL, CLOSE, COMMENT (Standard Lifecycles)
  // ---------------------------------------------------------------------------

  async acknowledgeRequest(
    workspaceId: string,
    requestId: string,
    actorMembershipId: string,
    notes?: string,
  ) {
    return this.acceptRequest(workspaceId, requestId, actorMembershipId, undefined, notes);
  }

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
    if (reqIndex === -1) throw new NotFoundException('Service request not found');

    const req = requests[reqIndex];
    const actor = await this.prisma.membership.findUnique({
      where: { id: actorMembershipId },
      include: { user: true },
    });
    const actorName = actor ? `${actor.user.firstName} ${actor.user.lastName}`.trim() : 'Inventory Controller';

    let inventoryDeductionDetail = '';
    if (req.replenishmentItems && req.replenishmentItems.length > 0) {
      for (const rItem of req.replenishmentItems) {
        const itemIndex = inventory.findIndex(
          (i) =>
            i.id === rItem.inventoryItemId ||
            i.name.toLowerCase() === (rItem.name || '').toLowerCase() ||
            (rItem.inventoryItemId && i.code === rItem.inventoryItemId),
        );

        if (itemIndex !== -1) {
          const item = inventory[itemIndex];
          const prevStock = item.currentStock;
          const qty = rItem.requestedQuantity || 0;
          const newStock = Math.max(0, prevStock - qty);

          inventory[itemIndex] = {
            ...item,
            currentStock: newStock,
            quantityOnHand: newStock,
            updatedAt: new Date(),
          };
          rItem.fulfilledQuantity = qty;
          inventoryDeductionDetail += ` Stock deducted for "${item.name}": ${prevStock} → ${newStock} ${item.unit}.`;
        }
      }
    }

    const activityTimeline = req.activityTimeline || [];
    activityTimeline.push({
      action: 'FULFILLED',
      actorMembershipId,
      actorName,
      timestamp: new Date(),
      notes: `${fulfillmentNotes || 'Supplies replenished and verified.'}${inventoryDeductionDetail}`,
      details: `${fulfillmentNotes || 'Supplies replenished and verified.'}${inventoryDeductionDetail}`,
    });

    requests[reqIndex] = {
      ...req,
      status: 'RESOLVED',
      isFulfilled: true,
      activityTimeline,
      activityLog: activityTimeline,
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
    const activityTimeline = req.activityTimeline || [];
    activityTimeline.push({
      action: 'CLOSED',
      actorMembershipId,
      actorName: 'Requester',
      timestamp: new Date(),
      notes: feedback ? `Closed with feedback: "${feedback}"` : 'Request officially closed.',
      details: feedback ? `Closed with feedback: "${feedback}"` : 'Request officially closed.',
    });

    requests[reqIndex] = {
      ...req,
      status: 'CLOSED',
      activityTimeline,
      activityLog: activityTimeline,
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

    const activityTimeline = req.activityTimeline || [];
    activityTimeline.push({
      action: 'COMMENT',
      actorMembershipId: authorMembershipId,
      actorName: authorName,
      timestamp: new Date(),
      notes: `${authorName} added a comment.`,
      details: `${authorName} added a comment.`,
    });

    requests[reqIndex] = {
      ...req,
      comments: [...req.comments, newComment],
      activityTimeline,
      activityLog: activityTimeline,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, serviceRequests: requests } },
    });

    return newComment;
  }

  // ---------------------------------------------------------------------------
  // 8. INVENTORY ITEM STOCK & DETAILS (Requirement 8)
  // ---------------------------------------------------------------------------

  async getInventory(workspaceId: string): Promise<InventoryItem[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let inventory: InventoryItem[] = settings.inventory || [];

    if (inventory.length === 0) {
      inventory = [
        {
          id: 'inv_1',
          code: 'TISSUE_BOXES',
          name: 'Tissue Boxes',
          category: 'Pantry & Hygiene',
          currentStock: 50,
          quantityOnHand: 50,
          unit: 'boxes',
          reorderThreshold: 10,
          reorderPoint: 10,
          updatedAt: new Date(),
        },
        {
          id: 'inv_2',
          code: 'SNACK_PACKS',
          name: 'Snacks & Beverages',
          category: 'Pantry & Hygiene',
          currentStock: 80,
          quantityOnHand: 80,
          unit: 'packs',
          reorderThreshold: 20,
          reorderPoint: 20,
          updatedAt: new Date(),
        },
        {
          id: 'inv_3',
          code: 'CABLES_HDMI',
          name: 'HDMI & Display Cables',
          category: 'IT Accessories',
          currentStock: 25,
          quantityOnHand: 25,
          unit: 'units',
          reorderThreshold: 5,
          reorderPoint: 5,
          updatedAt: new Date(),
        },
        {
          id: 'inv_item_cables',
          code: 'CABLES_HDMI',
          name: 'HDMI & Display Cables',
          category: 'IT Accessories',
          currentStock: 25,
          quantityOnHand: 25,
          unit: 'units',
          reorderThreshold: 5,
          reorderPoint: 5,
          updatedAt: new Date(),
        },
        {
          id: 'inv_4',
          code: 'KEYBOARDS_ERG',
          name: 'Ergonomic Keyboards',
          category: 'IT Equipment',
          currentStock: 12,
          quantityOnHand: 12,
          unit: 'units',
          reorderThreshold: 3,
          reorderPoint: 3,
          updatedAt: new Date(),
        },
      ];
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: { ...settings, inventory } },
      });
    }

    // Ensure all items map both currentStock and quantityOnHand
    return inventory.map((i) => ({
      ...i,
      quantityOnHand: i.quantityOnHand ?? i.currentStock,
      reorderPoint: i.reorderPoint ?? i.reorderThreshold,
    }));
  }

  async updateInventoryItem(
    workspaceId: string,
    data: {
      id?: string;
      code?: string;
      name: string;
      category?: string;
      currentStock: number;
      unit?: string;
      reorderThreshold?: number;
    },
  ): Promise<InventoryItem> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const inventory: InventoryItem[] = settings.inventory || [];

    const existingIndex = inventory.findIndex(
      (i) => i.id === data.id || (data.code && i.code === data.code) || i.name.toLowerCase() === data.name.toLowerCase(),
    );

    let item: InventoryItem;
    if (existingIndex !== -1) {
      item = {
        ...inventory[existingIndex],
        currentStock: Number(data.currentStock),
        quantityOnHand: Number(data.currentStock),
        category: data.category || inventory[existingIndex].category,
        unit: data.unit || inventory[existingIndex].unit,
        reorderThreshold:
          data.reorderThreshold !== undefined ? Number(data.reorderThreshold) : inventory[existingIndex].reorderThreshold,
        reorderPoint:
          data.reorderThreshold !== undefined ? Number(data.reorderThreshold) : inventory[existingIndex].reorderThreshold,
        updatedAt: new Date(),
      };
      inventory[existingIndex] = item;
    } else {
      item = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        code: data.code || `ITEM_${Date.now().toString(36).toUpperCase()}`,
        name: data.name.trim(),
        category: data.category || 'General Supplies',
        currentStock: Number(data.currentStock),
        quantityOnHand: Number(data.currentStock),
        unit: data.unit || 'units',
        reorderThreshold: data.reorderThreshold ? Number(data.reorderThreshold) : 5,
        reorderPoint: data.reorderThreshold ? Number(data.reorderThreshold) : 5,
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
  // 9. SAFE NOTIFICATION DELIVERY
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
      return existing;
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
