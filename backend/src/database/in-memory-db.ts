import * as bcrypt from 'bcrypt';

export class InMemoryDatabase {
  users: any[] = [];
  workspaces: any[] = [];
  memberships: any[] = [];
  roles: any[] = [];
  permissions: any[] = [];
  rolePermissions: any[] = [];
  files: any[] = [];
  auditLogs: any[] = [];
  assets: any[] = [];
  teams: any[] = [];
  departments: any[] = [];
  designations: any[] = [];
  notifications: any[] = [];
  tickets: any[] = [];
  tasks: any[] = [];
  projects: any[] = [];
  leaveRequests: any[] = [];
  shifts: any[] = [];
  holidays: any[] = [];
  attendances: any[] = [];
  qualityReviews: any[] = [];
  calendarEvents: any[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const passwordHash = bcrypt.hashSync('vattara@123', 10);

    const wsId = 'ws_default_1';
    this.workspaces.push({
      id: wsId,
      name: 'Vattara Solutions',
      slug: 'vattara-solutions',
      businessType: 'GENERAL',
      settings: {
        requestCategories: [
          { id: 'cat_it', name: 'IT support', code: 'IT_SUPPORT', description: 'Hardware, software, network, access and DB requests', defaultPriority: 'MEDIUM', isActive: true },
          { id: 'cat_facilities', name: 'Facilities', code: 'FACILITIES', description: 'Building maintenance, seating, air conditioning, and electricals', defaultPriority: 'MEDIUM', isActive: true },
          { id: 'cat_supplies', name: 'Supplies', code: 'SUPPLIES', description: 'Office stationery, pantry supplies, snacks and replenishment', defaultPriority: 'LOW', isActive: true },
          { id: 'cat_hr', name: 'HR and people', code: 'HR_PEOPLE', description: 'Onboarding, leave policy, benefits, and general HR queries', defaultPriority: 'MEDIUM', isActive: true },
          { id: 'cat_general', name: 'General request', code: 'GENERAL_REQUEST', description: 'General company inquiries and cross-team service requests', defaultPriority: 'MEDIUM', isActive: true },
        ],
        inventory: [
          { id: 'inv_1', code: 'TISSUE_BOXES', name: 'Tissue Boxes', category: 'Pantry & Hygiene', currentStock: 50, quantityOnHand: 50, unit: 'boxes', reorderThreshold: 10, reorderPoint: 10, updatedAt: new Date() },
          { id: 'inv_2', code: 'SNACK_PACKS', name: 'Snacks & Beverages', category: 'Pantry & Hygiene', currentStock: 80, quantityOnHand: 80, unit: 'packs', reorderThreshold: 20, reorderPoint: 20, updatedAt: new Date() },
          { id: 'inv_3', code: 'CABLES_HDMI', name: 'HDMI & Display Cables', category: 'IT Accessories', currentStock: 25, quantityOnHand: 25, unit: 'units', reorderThreshold: 5, reorderPoint: 5, updatedAt: new Date() },
          { id: 'inv_4', code: 'KEYBOARDS_ERG', name: 'Ergonomic Keyboards', category: 'IT Accessories', currentStock: 12, quantityOnHand: 12, unit: 'units', reorderThreshold: 3, reorderPoint: 3, updatedAt: new Date() },
          { id: 'inv_item_cables', code: 'CABLES_HDMI', name: 'HDMI & Display Cables', category: 'IT Accessories', currentStock: 25, quantityOnHand: 25, unit: 'units', reorderThreshold: 5, reorderPoint: 5, updatedAt: new Date() },
        ],
        serviceRequests: [
          {
            id: 'req_seed_1',
            workspaceId: wsId,
            ticketNumber: 'REQ-1004',
            categoryId: 'cat_it',
            categoryName: 'IT support',
            title: 'Replacement HDMI Cable for Meeting Room 2',
            description: 'The current HDMI display cable in Room 2 is flickering and losing video signal during presentations.',
            priority: 'MEDIUM',
            status: 'SUBMITTED',
            targetRole: 'MEMBER',
            targetUserId: null,
            targetUserName: null,
            assignedTo: null,
            assignedToName: null,
            acceptedAt: null,
            requesterMembershipId: 'mem_alex',
            requesterName: 'Alex Mercer',
            requesterEmail: 'alex.dev@orvexa.local',
            replenishmentItems: [{ inventoryItemId: 'inv_3', name: 'HDMI & Display Cables', requestedQuantity: 1 }],
            comments: [],
            activityTimeline: [
              {
                action: 'CREATED',
                actorName: 'Alex Mercer',
                timestamp: new Date(Date.now() - 3600000 * 4),
                details: 'Request submitted and routed to Member group.',
              },
            ],
            createdAt: new Date(Date.now() - 3600000 * 4),
            updatedAt: new Date(Date.now() - 3600000 * 4),
          },
          {
            id: 'req_seed_2',
            workspaceId: wsId,
            ticketNumber: 'REQ-1005',
            categoryId: 'cat_it',
            categoryName: 'IT support',
            title: 'Access to Staging DB & API Gateway Keys',
            description: 'Need read-write access to staging PostgreSQL instance for sprint ticket execution and schema testing.',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            targetRole: 'MANAGER',
            targetUserId: null,
            targetUserName: null,
            assignedTo: 'mem_techlead',
            assignedToName: 'Marcus Vance',
            acceptedAt: new Date(Date.now() - 3600000 * 2),
            requesterMembershipId: 'mem_jordan',
            requesterName: 'Jordan Blake',
            requesterEmail: 'jordan.dev@orvexa.local',
            comments: [
              {
                id: 'comm_1',
                authorMembershipId: 'mem_techlead',
                authorName: 'Marcus Vance',
                text: 'Reviewing staging IAM policy and provisioning credentials now.',
                createdAt: new Date(Date.now() - 3600000),
              },
            ],
            activityTimeline: [
              {
                action: 'CREATED',
                actorName: 'Jordan Blake',
                timestamp: new Date(Date.now() - 3600000 * 3),
                details: 'Request submitted and routed to Manager group.',
              },
              {
                action: 'ACCEPTED',
                actorName: 'Marcus Vance',
                timestamp: new Date(Date.now() - 3600000 * 2),
                details: 'Accepted by Marcus Vance. Status moved to IN_PROGRESS.',
              },
            ],
            createdAt: new Date(Date.now() - 3600000 * 3),
            updatedAt: new Date(Date.now() - 3600000),
          },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Roles
    ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].forEach((roleName) => {
      this.roles.push({
        id: `role_${roleName.toLowerCase()}`,
        name: roleName,
        description: `${roleName} system access role`,
        isSystemRole: true,
        isActive: true,
      });
    });

    // Seed Permissions
    const permsSeed = [
      // Assets, Inventory, Ledger & Documents (14)
      { code: 'assets:view', name: 'View company assets', module: 'Assets' },
      { code: 'assets:create', name: 'Register new assets', module: 'Assets' },
      { code: 'assets:edit', name: 'Edit asset details', module: 'Assets' },
      { code: 'assets:assign', name: 'Assign assets to people', module: 'Assets' },
      { code: 'assets:delete', name: 'Delete assets', module: 'Assets' },

      { code: 'inventory:view', name: 'View stock and locations', module: 'Inventory' },
      { code: 'inventory:move', name: 'Move stock between locations', module: 'Inventory' },
      { code: 'inventory:manage', name: 'Manage locations and low-stock rules', module: 'Inventory' },

      { code: 'ledger:view', name: 'View movement ledger', module: 'Ledger' },
      { code: 'ledger:export', name: 'Export ledger', module: 'Ledger' },

      { code: 'documents:view', name: 'View document vault', module: 'Documents' },
      { code: 'documents:upload', name: 'Upload documents', module: 'Documents' },
      { code: 'documents:download', name: 'Download documents', module: 'Documents' },
      { code: 'documents:delete', name: 'Delete documents', module: 'Documents' },

      // People
      { code: 'people:view', name: 'View Employee Directory & Profiles', module: 'People' },
      { code: 'people:create', name: 'Add & Onboard Employees', module: 'People' },
      { code: 'people:edit', name: 'Edit Employee Records & Assignments', module: 'People' },
      { code: 'people:delete', name: 'Deactivate & Offboard Employees', module: 'People' },
      { code: 'people:export', name: 'Export Employee Records', module: 'People' },
      { code: 'people:manage', name: 'Full People Administration', module: 'People' },

      // Projects
      { code: 'projects:view', name: 'View Work Projects', module: 'Projects' },
      { code: 'projects:create', name: 'Create Projects & Milestones', module: 'Projects' },
      { code: 'projects:edit', name: 'Edit Project Settings', module: 'Projects' },
      { code: 'projects:delete', name: 'Archive & Delete Projects', module: 'Projects' },
      { code: 'projects:manage', name: 'Full Project Administration', module: 'Projects' },

      // Tasks
      { code: 'tasks:view', name: 'View Tasks & Taskboards', module: 'Tasks' },
      { code: 'tasks:create', name: 'Create Tasks', module: 'Tasks' },
      { code: 'tasks:edit', name: 'Update Task Progress & Details', module: 'Tasks' },
      { code: 'tasks:delete', name: 'Delete Tasks', module: 'Tasks' },
      { code: 'tasks:assign', name: 'Assign Tasks to Team Members', module: 'Tasks' },
      { code: 'tasks:export', name: 'Export Tasks & Backlogs', module: 'Tasks' },
      { code: 'tasks:manage', name: 'Full Task Administration', module: 'Tasks' },

      // WorkQueue
      { code: 'work_items:view', name: 'View Operations Queues', module: 'WorkQueue' },
      { code: 'work_items:process', name: 'Process Operational Queue Items', module: 'WorkQueue' },
      { code: 'work_items:assign', name: 'Assign & Reorder Work Items', module: 'WorkQueue' },
      { code: 'work_items:export', name: 'Export Queue Data', module: 'WorkQueue' },
      { code: 'work_items:manage', name: 'Full Operations Queue Administration', module: 'WorkQueue' },

      // Time
      { code: 'time:view', name: 'View Timesheets & Time Logs', module: 'Time' },
      { code: 'time:log', name: 'Log Work Hours & Timer', module: 'Time' },
      { code: 'time:edit', name: 'Edit Logged Timesheets', module: 'Time' },
      { code: 'time:approve', name: 'Approve Team Timesheets', module: 'Time' },
      { code: 'time:export', name: 'Export Timesheet Logs', module: 'Time' },
      { code: 'time:manage', name: 'Full Time & Shift Administration', module: 'Time' },

      // Attendance
      { code: 'attendance:view', name: 'View Attendance Records & History', module: 'Attendance' },
      { code: 'attendance:clock', name: 'Clock In, Clock Out & Shift Tracker', module: 'Attendance' },
      { code: 'attendance:edit', name: 'Adjust Attendance Records', module: 'Attendance' },
      { code: 'attendance:export', name: 'Export Attendance Reports', module: 'Attendance' },
      { code: 'attendance:manage', name: 'Full Attendance & Shift Administration', module: 'Attendance' },

      // Leave
      { code: 'leave:view', name: 'View Leave Balances & Team Calendar', module: 'Leave' },
      { code: 'leave:apply', name: 'Apply for Leave & PTO', module: 'Leave' },
      { code: 'leave:approve', name: 'Approve or Reject Leave Requests', module: 'Leave' },
      { code: 'leave:manage', name: 'Full Leave Policy Administration', module: 'Leave' },

      // Approvals
      { code: 'approvals:view', name: 'View Pending Approvals', module: 'Approvals' },
      { code: 'approvals:approve', name: 'Approve or Reject Operational Items', module: 'Approvals' },
      { code: 'approvals:manage', name: 'Configure Approval Chains', module: 'Approvals' },

      // Quality
      { code: 'quality:view', name: 'View Quality Audit Scorecards', module: 'Quality' },
      { code: 'quality:audit', name: 'Perform Quality Audits', module: 'Quality' },
      { code: 'quality:review', name: 'Conduct QA Reviews', module: 'Quality' },
      { code: 'quality:manage', name: 'Configure Quality Scorecards & Thresholds', module: 'Quality' },

      // SLA
      { code: 'sla:view', name: 'View SLA Metrics & Breaches', module: 'SLA' },
      { code: 'sla:manage', name: 'Configure SLA Deadlines & Escalation Rules', module: 'SLA' },

      // Clients
      { code: 'clients:view', name: 'View Client Accounts', module: 'Clients' },
      { code: 'clients:create', name: 'Create Client Accounts', module: 'Clients' },
      { code: 'clients:edit', name: 'Edit Client Profiles', module: 'Clients' },
      { code: 'clients:delete', name: 'Archive Client Accounts', module: 'Clients' },
      { code: 'clients:manage', name: 'Full Client Administration', module: 'Clients' },

      // Reports
      { code: 'reports:view', name: 'View Operational Reports & Dashboards', module: 'Reports' },
      { code: 'reports:export', name: 'Export Analytic Reports', module: 'Reports' },

      // Payroll
      { code: 'payroll:view', name: 'View Restricted Payroll & Salaries', module: 'Payroll' },
      { code: 'payroll:edit', name: 'Edit Compensation & Deductions', module: 'Payroll' },
      { code: 'payroll:approve', name: 'Approve Payroll Disbursals', module: 'Payroll' },
      { code: 'payroll:export', name: 'Export Sensitive Payroll Reports', module: 'Payroll' },
      { code: 'payroll:manage', name: 'Full Payroll Administration', module: 'Payroll' },

      // Admin & Org
      { code: 'org:manage', name: 'Manage Organization Profile', module: 'Organization' },
      { code: 'invitations:manage', name: 'Invite & Manage Team Members', module: 'Invitations' },
      { code: 'roles:manage', name: 'Configure Custom Roles & Permissions', module: 'Roles' },
      { code: 'departments:manage', name: 'Manage Departments & Teams', module: 'Departments' },
      { code: 'settings:manage', name: 'Manage Workspace Settings', module: 'Settings' },
      { code: 'billing:manage', name: 'Manage Subscriptions & Billing', module: 'Billing' },

      // Calendar (Unified Company Calendar Permissions)
      { code: 'calendar:view:all', name: 'View All Company Calendar Events', module: 'Calendar' },
      { code: 'calendar:view:department', name: 'View Department Calendar Events', module: 'Calendar' },
      { code: 'calendar:view:team', name: 'View Team Calendar Events', module: 'Calendar' },
      { code: 'calendar:view:schedules', name: 'View Individual Employee Schedules', module: 'Calendar' },
      { code: 'calendar:create', name: 'Create Calendar Events & Meetings', module: 'Calendar' },
      { code: 'calendar:invite', name: 'Invite Participants to Meetings', module: 'Calendar' },
      { code: 'calendar:manage', name: 'Edit and Cancel Events', module: 'Calendar' },
      { code: 'calendar:holidays:manage', name: 'Manage Company Holidays', module: 'Calendar' },
    ];

    for (const p of permsSeed) {
      const permObj = {
        id: `perm_${p.code.replace(/[:_]/g, '_')}`,
        code: p.code,
        name: p.name,
        module: p.module,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.permissions.push(permObj);
    }

    const allPermCodes = this.permissions.map((p) => p.code);
    const adminPermCodes = allPermCodes.filter((c) => c !== 'billing:manage');
    const managerPermCodes = [
      'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:export',
      'work_items:view', 'work_items:process', 'work_items:assign', 'work_items:export',
      'projects:view', 'projects:create', 'projects:edit',
      'time:view', 'time:log', 'time:edit', 'time:approve', 'time:export',
      'attendance:view', 'attendance:clock', 'attendance:edit', 'attendance:export',
      'leave:view', 'leave:apply', 'leave:approve',
      'approvals:view', 'approvals:approve',
      'quality:view', 'quality:audit', 'quality:review',
      'sla:view', 'reports:view', 'people:view',
      'assets:view', 'assets:create', 'assets:edit', 'assets:assign',
      'inventory:view', 'inventory:move',
      'ledger:view', 'ledger:export',
      'documents:view', 'documents:upload', 'documents:download',
      'calendar:view:department', 'calendar:view:team', 'calendar:create', 'calendar:invite', 'calendar:manage',
    ];
    const memberPermCodes = [
      'tasks:view', 'tasks:create', 'tasks:edit',
      'projects:view',
      'work_items:view', 'work_items:process',
      'time:view', 'time:log',
      'attendance:view', 'attendance:clock',
      'leave:view', 'leave:apply',
      'approvals:view',
      'people:view',
      'calendar:create', 'calendar:invite',
    ];

    const rolePermAssignments: Record<string, string[]> = {
      role_owner: allPermCodes,
      role_admin: adminPermCodes,
      role_manager: managerPermCodes,
      role_member: memberPermCodes,
    };

    for (const [rId, codes] of Object.entries(rolePermAssignments)) {
      for (const code of codes) {
        const perm = this.permissions.find((p) => p.code === code);
        if (perm) {
          this.rolePermissions.push({
            id: `rp_${rId}_${perm.id}`,
            roleId: rId,
            permissionId: perm.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // Departments
    this.departments.push(
      { id: 'dept_exec', name: 'Executive', workspaceId: wsId },
      { id: 'dept_eng', name: 'Engineering', workspaceId: wsId },
      { id: 'dept_mktg', name: 'Marketing', workspaceId: wsId },
      { id: 'dept_hr', name: 'Human Resources', workspaceId: wsId },
    );

    // Teams
    this.teams.push(
      { id: 'team_tech', name: 'Tech Team', workspaceId: wsId, departmentId: 'dept_eng' },
      { id: 'team_mktg', name: 'Marketing Team', workspaceId: wsId, departmentId: 'dept_mktg' },
    );

    // Designations
    this.designations.push(
      { id: 'desig_owner', title: 'Founder & Owner', workspaceId: wsId },
      { id: 'desig_head', title: 'Operations Head', workspaceId: wsId },
      { id: 'desig_hr', title: 'HR Manager', workspaceId: wsId },
      { id: 'desig_techlead', title: 'Tech Team Leader', workspaceId: wsId },
      { id: 'desig_mktglead', title: 'Marketing Team Leader', workspaceId: wsId },
      { id: 'desig_dev', title: 'Junior Developer', workspaceId: wsId },
      { id: 'desig_intern', title: 'Intern', workspaceId: wsId },
    );

    // Seeded Users & Memberships
    const people = [
      { id: 'u_owner', memId: 'mem_owner', email: 'vattaraofficial@gmail.com', first: 'John', last: 'Daniel (Owner)', role: 'OWNER', desig: 'desig_owner', dept: 'dept_exec', team: null },
      { id: 'u_head', memId: 'mem_head', email: 'head@orvexa.local', first: 'Elena', last: 'Rostova (Operations Head)', role: 'ADMIN', desig: 'desig_head', dept: 'dept_exec', team: null },
      { id: 'u_hr', memId: 'mem_hr', email: 'hr@orvexa.local', first: 'Hannah', last: 'Reed (HR)', role: 'ADMIN', desig: 'desig_hr', dept: 'dept_hr', team: null },
      { id: 'u_techlead', memId: 'mem_techlead', email: 'techlead@orvexa.local', first: 'Marcus', last: 'Vance (Tech TL)', role: 'MANAGER', desig: 'desig_techlead', dept: 'dept_eng', team: 'team_tech' },
      { id: 'u_mktglead', memId: 'mem_mktglead', email: 'marketinglead@orvexa.local', first: 'Sophia', last: 'Chen (Marketing TL)', role: 'MANAGER', desig: 'desig_mktglead', dept: 'dept_mktg', team: 'team_mktg' },
      { id: 'u_alex', memId: 'mem_alex', email: 'alex.dev@orvexa.local', first: 'Alex', last: 'Mercer (Junior Dev)', role: 'MEMBER', desig: 'desig_dev', dept: 'dept_eng', team: 'team_tech' },
      { id: 'u_jordan', memId: 'mem_jordan', email: 'jordan.dev@orvexa.local', first: 'Jordan', last: 'Blake (Junior Dev)', role: 'MEMBER', desig: 'desig_dev', dept: 'dept_eng', team: 'team_tech' },
      { id: 'u_sam', memId: 'mem_sam', email: 'sam.intern@orvexa.local', first: 'Sam', last: 'Altman (Tech Intern)', role: 'MEMBER', desig: 'desig_intern', dept: 'dept_eng', team: 'team_tech' },
      { id: 'u_chris', memId: 'mem_chris', email: 'chris.intern@orvexa.local', first: 'Chris', last: 'Evans (Tech Intern)', role: 'MEMBER', desig: 'desig_intern', dept: 'dept_eng', team: 'team_tech' },
      { id: 'u_taylor', memId: 'mem_taylor', email: 'taylor.intern@orvexa.local', first: 'Taylor', last: 'Swift (Marketing Intern)', role: 'MEMBER', desig: 'desig_intern', dept: 'dept_mktg', team: 'team_mktg' },
      { id: 'u_morgan', memId: 'mem_morgan', email: 'morgan.intern@orvexa.local', first: 'Morgan', last: 'Freeman (Marketing Intern)', role: 'MEMBER', desig: 'desig_intern', dept: 'dept_mktg', team: 'team_mktg' },
    ];

    for (const p of people) {
      const user = {
        id: p.id,
        email: p.email.toLowerCase(),
        passwordHash,
        firstName: p.first,
        lastName: p.last,
        isEmailVerified: true,
        mustChangePassword: false,
        status: 'ACTIVE',
        tokenVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.push(user);

      const membership = {
        id: p.memId,
        userId: user.id,
        workspaceId: wsId,
        roleId: `role_${p.role.toLowerCase()}`,
        accessRole: p.role,
        departmentId: p.dept,
        teamId: p.team,
        designationId: p.desig,
        status: 'ACTIVE',
        dataScope: p.role === 'OWNER' || p.role === 'ADMIN' ? 'GLOBAL' : p.role === 'MANAGER' ? 'TEAM' : 'ASSIGNED',
        createdAt: new Date(),
        updatedAt: new Date(),
        user,
        department: this.departments.find((d) => d.id === p.dept),
        team: this.teams.find((t) => t.id === p.team),
        designation: this.designations.find((dg) => dg.id === p.desig),
      };
      this.memberships.push(membership);
    }

    // Projects
    this.projects.push(
      { id: 'proj_ops', workspaceId: wsId, name: 'Operations & Platform', key: 'OPS', description: 'Core Operations', status: 'ACTIVE', createdAt: new Date() },
      { id: 'proj_client', workspaceId: wsId, name: 'Client A Delivery', key: 'CAD', description: 'Client Deliverables', status: 'ACTIVE', createdAt: new Date() },
    );

    // Shifts
    this.shifts.push(
      { id: 'shift_general', workspaceId: wsId, name: 'General Shift', startTime: '09:00', endTime: '18:00', workDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
    );

  }

  // Model Query Handlers
  makeModelHandler(collectionName: string) {
    const getCollection = (): any[] => (this as any)[collectionName] || [];

    return {
      findUnique: async (args: any) => {
        const col = getCollection();
        const where = args?.where || {};
        const found = col.find((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.email && item.email?.toLowerCase() !== where.email.toLowerCase()) return false;
          if (where.slug && item.slug !== where.slug) return false;
          if (where.userId_workspaceId) {
            if (item.userId !== where.userId_workspaceId.userId || item.workspaceId !== where.userId_workspaceId.workspaceId) return false;
          }
          return true;
        });
        if (!found) return null;
        return this.hydrate(found, collectionName, args?.include);
      },

      findFirst: async (args: any) => {
        const col = getCollection();
        const where = args?.where || {};
        const found = col.find((item) => this.matchWhere(item, where));
        if (!found) return null;
        return this.hydrate(found, collectionName, args?.include);
      },

      findMany: async (args: any) => {
        const col = getCollection();
        const where = args?.where || {};
        const filtered = col.filter((item) => this.matchWhere(item, where));
        return filtered.map((item) => this.hydrate(item, collectionName, args?.include));
      },

      create: async (args: any) => {
        const col = getCollection();
        const data = args?.data || {};
        const item = {
          id: data.id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        col.push(item);
        return this.hydrate(item, collectionName, args?.include);
      },

      update: async (args: any) => {
        const col = getCollection();
        const where = args?.where || {};
        const index = col.findIndex((item) => this.matchWhere(item, where));
        if (index === -1) {
          throw new Error(`Record not found in ${collectionName}`);
        }
        col[index] = {
          ...col[index],
          ...args.data,
          updatedAt: new Date(),
        };
        return this.hydrate(col[index], collectionName, args?.include);
      },

      upsert: async (args: any) => {
        const col = getCollection();
        const where = args?.where || {};
        const index = col.findIndex((item) => this.matchWhere(item, where));
        if (index !== -1) {
          col[index] = {
            ...col[index],
            ...args.update,
            updatedAt: new Date(),
          };
          return this.hydrate(col[index], collectionName, args?.include);
        } else {
          const newItem = {
            id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            ...args.create,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          col.push(newItem);
          return this.hydrate(newItem, collectionName, args?.include);
        }
      },

      createMany: async (args: any) => {
        const col = getCollection();
        const dataList = Array.isArray(args?.data) ? args.data : [args?.data];
        let count = 0;
        for (const data of dataList) {
          if (!data) continue;
          if (args?.skipDuplicates) {
            const exists = col.some((item) => {
              if (data.id && item.id === data.id) return true;
              if (data.roleId && data.permissionId && item.roleId === data.roleId && item.permissionId === data.permissionId) return true;
              return false;
            });
            if (exists) continue;
          }
          const item = {
            id: data.id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          col.push(item);
          count++;
        }
        return { count };
      },

      updateMany: async (args: any) => {
        const col = getCollection();
        const where = args?.where || {};
        let count = 0;
        for (let i = 0; i < col.length; i++) {
          if (this.matchWhere(col[i], where)) {
            col[i] = {
              ...col[i],
              ...args.data,
              updatedAt: new Date(),
            };
            count++;
          }
        }
        return { count };
      },

      deleteMany: async (args: any) => {
        const col = getCollection();
        const where = args?.where;
        let count = 0;
        if (!where || Object.keys(where).length === 0) {
          count = col.length;
          col.length = 0;
          return { count };
        }
        for (let i = col.length - 1; i >= 0; i--) {
          if (this.matchWhere(col[i], where)) {
            col.splice(i, 1);
            count++;
          }
        }
        return { count };
      },

      count: async (args: any) => {
        const col = getCollection();
        const where = args?.where || {};
        return col.filter((item) => this.matchWhere(item, where)).length;
      },
    };
  }

  private matchWhere(item: any, where: any): boolean {
    if (!where) return true;
    for (const key of Object.keys(where)) {
      const val = where[key];
      if (val === undefined) continue;

      if (key === 'AND' && Array.isArray(val)) {
        if (!val.every((clause) => this.matchWhere(item, clause))) return false;
      } else if (key === 'OR' && Array.isArray(val)) {
        if (!val.some((clause) => this.matchWhere(item, clause))) return false;
      } else if (key === 'NOT') {
        if (this.matchWhere(item, val)) return false;
      } else if (key === 'assignee' && typeof val === 'object') {
        const assignee = this.memberships.find((m) => m.id === item.assigneeMembershipId);
        if (!assignee) return false;
        if (!this.matchWhere(assignee, val)) return false;
      } else if (key === 'project' && typeof val === 'object') {
        const project = this.projects.find((p) => p.id === item.projectId);
        if (!project) return false;
        if (!this.matchWhere(project, val)) return false;
      } else if (val && typeof val === 'object') {
        if (val.in && Array.isArray(val.in)) {
          if (!val.in.includes(item[key])) return false;
        } else if (val.notIn && Array.isArray(val.notIn)) {
          if (val.notIn.includes(item[key])) return false;
        } else if (val.not !== undefined) {
          if (item[key] === val.not) return false;
        } else if (val.lt !== undefined) {
          const t1 = item[key] ? new Date(item[key]).getTime() : NaN;
          const t2 = new Date(val.lt).getTime();
          if (isNaN(t1) || isNaN(t2)) {
            if (item[key] >= val.lt) return false;
          } else {
            if (t1 >= t2) return false;
          }
        } else if (val.lte !== undefined) {
          const t1 = item[key] ? new Date(item[key]).getTime() : NaN;
          const t2 = new Date(val.lte).getTime();
          if (isNaN(t1) || isNaN(t2)) {
            if (item[key] > val.lte) return false;
          } else {
            if (t1 > t2) return false;
          }
        } else if (val.gt !== undefined) {
          const t1 = item[key] ? new Date(item[key]).getTime() : NaN;
          const t2 = new Date(val.gt).getTime();
          if (isNaN(t1) || isNaN(t2)) {
            if (item[key] <= val.gt) return false;
          } else {
            if (t1 <= t2) return false;
          }
        } else if (val.gte !== undefined) {
          const t1 = item[key] ? new Date(item[key]).getTime() : NaN;
          const t2 = new Date(val.gte).getTime();
          if (isNaN(t1) || isNaN(t2)) {
            if (item[key] < val.gte) return false;
          } else {
            if (t1 < t2) return false;
          }
        } else if (val.equals !== undefined) {
          if (val.mode === 'insensitive') {
            if (String(item[key]).toLowerCase() !== String(val.equals).toLowerCase()) return false;
          } else {
            if (item[key] !== val.equals) return false;
          }
        } else if (val.contains !== undefined) {
          if (!String(item[key] || '').toLowerCase().includes(String(val.contains).toLowerCase())) return false;
        }
      } else {
        if (item[key] !== val) return false;
      }
    }
    return true;
  }

  private hydrate(item: any, collection: string, include: any): any {
    if (!include) return item;
    const cloned = { ...item };

    if (collection === 'users') {
      if (include.memberships) {
        cloned.memberships = this.memberships
          .filter((m) => m.userId === item.id)
          .map((m) => {
            const mClone = { ...m };
            if (include.memberships.include?.workspace) {
              mClone.workspace = this.workspaces.find((w) => w.id === m.workspaceId);
            }
            if (include.memberships.include?.role) {
              const r = this.roles.find((role) => role.id === m.roleId);
              if (r) {
                mClone.role = {
                  ...r,
                  permissions: this.rolePermissions
                    .filter((rp) => rp.roleId === r.id)
                    .map((rp) => ({
                      ...rp,
                      permission: this.permissions.find((p) => p.id === rp.permissionId),
                    })),
                };
              }
            }
            if (include.memberships.include?.department) {
              mClone.department = this.departments.find((d) => d.id === m.departmentId);
            }
            if (include.memberships.include?.team) {
              mClone.team = this.teams.find((t) => t.id === m.teamId);
            }
            return mClone;
          });
      }
    } else if (collection === 'memberships') {
      if (include.user) {
        cloned.user = this.users.find((u) => u.id === item.userId);
      }
      if (include.workspace) {
        cloned.workspace = this.workspaces.find((w) => w.id === item.workspaceId);
      }
      if (include.role) {
        const r = this.roles.find((role) => role.id === item.roleId);
        if (r) {
          cloned.role = {
            ...r,
            permissions: this.rolePermissions
              .filter((rp) => rp.roleId === r.id)
              .map((rp) => ({
                ...rp,
                permission: this.permissions.find((p) => p.id === rp.permissionId),
              })),
          };
        }
      }
      if (include.department) {
        cloned.department = this.departments.find((d) => d.id === item.departmentId);
      }
      if (include.team) {
        cloned.team = this.teams.find((t) => t.id === item.teamId);
      }
      if (include.designation) {
        cloned.designation = this.designations.find((dg) => dg.id === item.designationId);
      }
    } else if (collection === 'roles') {
      if (include?.permissions) {
        cloned.permissions = this.rolePermissions
          .filter((rp) => rp.roleId === item.id)
          .map((rp) => {
            const rpClone = { ...rp };
            if (include.permissions.include?.permission) {
              rpClone.permission = this.permissions.find((p) => p.id === rp.permissionId);
            }
            return rpClone;
          });
      }
      if (include?._count?.select?.memberships) {
        cloned._count = cloned._count || {};
        cloned._count.memberships = this.memberships.filter((m) => m.roleId === item.id).length;
      }
    } else if (collection === 'rolePermissions') {
      if (include?.permission) {
        cloned.permission = this.permissions.find((p) => p.id === item.permissionId);
      }
      if (include?.role) {
        cloned.role = this.roles.find((r) => r.id === item.roleId);
      }
    } else if (collection === 'tasks') {
      if (include?.project) {
        cloned.project = this.projects.find((p) => p.id === item.projectId) || null;
      }
      if (include?.assignee) {
        const mem = this.memberships.find((m) => m.id === item.assigneeMembershipId);
        cloned.assignee = mem ? this.hydrate(mem, 'memberships', include.assignee.include) : null;
      }
    } else if (collection === 'projects') {
      if (include?.client) {
        cloned.client = (this as any).clients?.find((c: any) => c.id === item.clientId) || null;
      }
      if (include?.tasks) {
        cloned.tasks = this.tasks.filter((t) => t.projectId === item.id);
      }
      if (include?._count?.select?.tasks) {
        cloned._count = cloned._count || {};
        cloned._count.tasks = this.tasks.filter((t) => t.projectId === item.id).length;
      }
    } else if (collection === 'notifications') {
      if (include?.recipient) {
        const mem = this.memberships.find((m) => m.id === item.recipientMembershipId);
        cloned.recipient = mem ? this.hydrate(mem, 'memberships', include.recipient.include) : null;
      }
    }

    return cloned;
  }
}
