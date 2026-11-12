export interface IndustryOption {
  key: string;
  label: string;
  description: string;
  icon: string;
}

export interface OrgSizeBracket {
  key: string;
  label: string;
  hint: string;
}

export interface ModuleFeatureItem {
  code: string;
  label: string;
  description: string;
  recommendedByDefault?: boolean;
}

export interface ModuleCatalogItem {
  key: string;
  label: string;
  category: 'Core Work' | 'People & HR' | 'Operations & Finance' | 'Administration';
  description: string;
  defaultRecommended: boolean;
  features: ModuleFeatureItem[];
}

export interface StarterRoleTemplate {
  key: string;
  name: string;
  description: string;
  dataScope: 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL';
  permissionCodes: string[];
  recommendedFor: string;
  delegatedAdmin?: boolean;
}

export const INDUSTRIES_CATALOG: IndustryOption[] = [
  {
    key: 'IT_SOFTWARE',
    label: 'Software, IT & Technology',
    description: 'Product engineering, SaaS, IT support & digital agencies',
    icon: 'Code2',
  },
  {
    key: 'OPERATIONS_BPO',
    label: 'Operations, BPO & Support',
    description: 'Service desks, fulfillment queues, SLA workflows & QA',
    icon: 'Headset',
  },
  {
    key: 'MARKETING_AGENCY',
    label: 'Marketing, Creative & Agency',
    description: 'Client campaigns, deliverables, time tracking & approvals',
    icon: 'Megaphone',
  },
  {
    key: 'FINANCE_ACCOUNTING',
    label: 'Finance, Accounting & Consulting',
    description: 'Audits, payroll, client advisory & controlled access',
    icon: 'Landmark',
  },
  {
    key: 'HEALTHCARE',
    label: 'Healthcare & Wellness',
    description: 'Clinics, shift rosters, compliance & leave coverage',
    icon: 'HeartPulse',
  },
  {
    key: 'RETAIL_ECOMMERCE',
    label: 'Retail, D2C & E-Commerce',
    description: 'Store ops, stock movements, shift schedules & fulfillment',
    icon: 'ShoppingBag',
  },
  {
    key: 'MANUFACTURING_LOGISTICS',
    label: 'Manufacturing & Logistics',
    description: 'Warehouse inventory, assets, quality audits & field shifts',
    icon: 'Truck',
  },
  {
    key: 'EDUCATION',
    label: 'Education & Training',
    description: 'Faculty, cohorts, attendance & academic operations',
    icon: 'GraduationCap',
  },
  {
    key: 'CONSTRUCTION_REAL_ESTATE',
    label: 'Construction & Real Estate',
    description: 'Site projects, equipment assets, field attendance & requests',
    icon: 'HardHat',
  },
  {
    key: 'GENERAL',
    label: 'General Business & Services',
    description: 'Cross-functional teams managing work, people & approvals',
    icon: 'Briefcase',
  },
];

// Exactly 8 employee brackets with the 8th being "Above 1,000" as specified
export const ORG_SIZE_BRACKETS: OrgSizeBracket[] = [
  { key: '0-10', label: '0 - 10', hint: 'Founding team or micro studio' },
  { key: '11-25', label: '11 - 25', hint: 'Growing core team' },
  { key: '26-50', label: '26 - 50', hint: 'Multi-team business' },
  { key: '51-100', label: '51 - 100', hint: 'Departmental organization' },
  { key: '101-250', label: '101 - 250', hint: 'Scaling mid-market org' },
  { key: '251-500', label: '251 - 500', hint: 'Established enterprise division' },
  { key: '501-1000', label: '501 - 1,000', hint: 'Large multi-site enterprise' },
  { key: '1000+', label: 'Above 1,000', hint: 'Global enterprise scale' },
];

export const MODULES_CATALOG: ModuleCatalogItem[] = [
  {
    key: 'projects',
    label: 'Projects & Goals',
    category: 'Core Work',
    description: 'Organize initiatives, milestones, and cross-functional roadmaps.',
    defaultRecommended: true,
    features: [
      { code: 'projects:view', label: 'View Projects & Boards', description: 'See active projects and progress', recommendedByDefault: true },
      { code: 'projects:create', label: 'Create Projects', description: 'Start new projects and milestones', recommendedByDefault: true },
      { code: 'projects:edit', label: 'Edit Project Settings', description: 'Configure workflows & metadata', recommendedByDefault: true },
      { code: 'projects:delete', label: 'Archive Projects', description: 'Archive or delete completed projects', recommendedByDefault: false },
    ],
  },
  {
    key: 'tasks',
    label: 'Tasks & Sprints',
    category: 'Core Work',
    description: 'Plan work, assign contributors, review deliverables, and mark tasks done.',
    defaultRecommended: true,
    features: [
      { code: 'tasks:view', label: 'View Tasks & Boards', description: 'Access assigned and team boards', recommendedByDefault: true },
      { code: 'tasks:create', label: 'Create Tasks & Subtasks', description: 'Add tasks to boards and backlogs', recommendedByDefault: true },
      { code: 'tasks:edit', label: 'Update Task Status & Progress', description: 'Move cards & update progress', recommendedByDefault: true },
      { code: 'tasks:assign', label: 'Assign & Reassign Tasks', description: 'Delegate work to team members', recommendedByDefault: true },
      { code: 'tasks:review', label: 'Review & Rework Sign-off', description: 'Approve IN_REVIEW items or return for rework', recommendedByDefault: true },
      { code: 'tasks:complete', label: 'Mark Work Completed', description: 'Move deliverables directly to Completed', recommendedByDefault: true },
      { code: 'tasks:export', label: 'Export Task Backlogs', description: 'Download CSV / status reports', recommendedByDefault: false },
    ],
  },
  {
    key: 'work_queue',
    label: 'Operations Queue',
    category: 'Core Work',
    description: 'High-throughput intake queues with assignment and processing rules.',
    defaultRecommended: false,
    features: [
      { code: 'work_items:view', label: 'View Work Queues', description: 'Inspect queued work items', recommendedByDefault: true },
      { code: 'work_items:process', label: 'Process Queue Items', description: 'Execute & resolve queued items', recommendedByDefault: true },
      { code: 'work_items:assign', label: 'Assign & Reprioritize', description: 'Distribute queue items across staff', recommendedByDefault: true },
      { code: 'work_items:export', label: 'Export Queue Logs', description: 'Export throughput metrics', recommendedByDefault: false },
    ],
  },
  {
    key: 'people',
    label: 'People Directory',
    category: 'People & HR',
    description: 'Manage staff profiles, reporting lines, onboarding, and workspace invites.',
    defaultRecommended: true,
    features: [
      { code: 'people:view', label: 'View Directory', description: 'View teammates in your permitted scope', recommendedByDefault: true },
      { code: 'people:create', label: 'Add & Onboard Staff', description: 'Create member records', recommendedByDefault: true },
      { code: 'people:edit', label: 'Edit Profiles & Org Placement', description: 'Update teams, designations & reporting lines', recommendedByDefault: true },
      { code: 'invitations:manage', label: 'Invite Members & Share Links', description: 'Send Gmail invites & manage invite links', recommendedByDefault: true },
      { code: 'roles:manage', label: 'Configure Staff Permissions', description: 'Customize staff roles & module access', recommendedByDefault: true },
    ],
  },
  {
    key: 'attendance',
    label: 'Attendance & Shifts',
    category: 'People & HR',
    description: 'Clock-in/out tracking, shift adherence, and daily availability.',
    defaultRecommended: true,
    features: [
      { code: 'attendance:view', label: 'View Attendance Logs', description: 'Monitor daily attendance status', recommendedByDefault: true },
      { code: 'attendance:clock', label: 'Clock In / Out', description: 'Self-service shift check-in', recommendedByDefault: true },
      { code: 'attendance:edit', label: 'Adjust Attendance Records', description: 'Correct missed punches', recommendedByDefault: false },
      { code: 'attendance:export', label: 'Export Attendance', description: 'Download attendance reports', recommendedByDefault: false },
    ],
  },
  {
    key: 'time',
    label: 'Timesheets & Time Logs',
    category: 'People & HR',
    description: 'Log work hours on tasks/projects and review team timesheets.',
    defaultRecommended: true,
    features: [
      { code: 'time:view', label: 'View Time Logs', description: 'Review logged work hours', recommendedByDefault: true },
      { code: 'time:log', label: 'Log Hours & Timers', description: 'Track daily effort', recommendedByDefault: true },
      { code: 'time:approve', label: 'Approve Timesheets', description: 'Sign off submitted timesheets', recommendedByDefault: true },
      { code: 'time:export', label: 'Export Time Logs', description: 'Export billing/payroll hours', recommendedByDefault: false },
    ],
  },
  {
    key: 'leave',
    label: 'Leave & PTO',
    category: 'People & HR',
    description: 'Leave balances, holiday calendars, and team leave approvals.',
    defaultRecommended: true,
    features: [
      { code: 'leave:view', label: 'View Leave Balances & Calendar', description: 'See who is away and remaining days', recommendedByDefault: true },
      { code: 'leave:apply', label: 'Request Time Off', description: 'Submit leave applications', recommendedByDefault: true },
      { code: 'leave:approve', label: 'Approve Leave Requests', description: 'Approve/reject within granted scope', recommendedByDefault: true },
      { code: 'leave:manage', label: 'Configure Leave Policies', description: 'Set annual quotas & rules', recommendedByDefault: false },
    ],
  },
  {
    key: 'approvals',
    label: 'Approvals & Requests',
    category: 'People & HR',
    description: 'Centralized service requests, IT/HR tickets, and multi-stage sign-offs.',
    defaultRecommended: true,
    features: [
      { code: 'approvals:view', label: 'View Approval Queue', description: 'See incoming requests & approvals', recommendedByDefault: true },
      { code: 'approvals:approve', label: 'Action Approvals', description: 'Approve or reject items', recommendedByDefault: true },
      { code: 'requests:manage', label: 'Route & Administer Service Requests', description: 'Manage request queues & categories', recommendedByDefault: true },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll & Compensation',
    category: 'Operations & Finance',
    description: 'Protected salary records, allowances, deductions, and disbursement approvals.',
    defaultRecommended: false,
    features: [
      { code: 'payroll:view', label: 'View Restricted Payroll', description: 'Access compensation profiles', recommendedByDefault: true },
      { code: 'payroll:edit', label: 'Edit Compensation', description: 'Update pay & deductions', recommendedByDefault: false },
      { code: 'payroll:approve', label: 'Approve Disbursals', description: 'Sign off payroll runs', recommendedByDefault: false },
    ],
  },
  {
    key: 'quality',
    label: 'Quality Assurance',
    category: 'Operations & Finance',
    description: 'Scorecards, QA reviews, and audit checklists.',
    defaultRecommended: false,
    features: [
      { code: 'quality:view', label: 'View QA Scorecards', description: 'Read audit outcomes', recommendedByDefault: true },
      { code: 'quality:audit', label: 'Perform Audits', description: 'Score work quality', recommendedByDefault: true },
      { code: 'quality:review', label: 'Conduct QA Reviews', description: 'Verify corrective actions', recommendedByDefault: true },
    ],
  },
  {
    key: 'sla',
    label: 'SLA & Escalations',
    category: 'Operations & Finance',
    description: 'Response/resolution SLA targets and automated escalation alerts.',
    defaultRecommended: false,
    features: [
      { code: 'sla:view', label: 'View SLA Metrics', description: 'Track SLA health & breaches', recommendedByDefault: true },
      { code: 'sla:manage', label: 'Configure SLA Policies', description: 'Set deadlines & escalations', recommendedByDefault: false },
    ],
  },
  {
    key: 'clients',
    label: 'Clients & Accounts',
    category: 'Operations & Finance',
    description: 'Track client organizations linked to projects and deliverables.',
    defaultRecommended: false,
    features: [
      { code: 'clients:view', label: 'View Client Directory', description: 'Read client contacts & projects', recommendedByDefault: true },
      { code: 'clients:create', label: 'Create Client Accounts', description: 'Add new clients', recommendedByDefault: true },
      { code: 'clients:edit', label: 'Edit Client Details', description: 'Maintain client records', recommendedByDefault: true },
    ],
  },
  {
    key: 'assets',
    label: 'Assets & Inventory',
    category: 'Operations & Finance',
    description: 'Equipment tracking, stock rooms, movement ledger & restock requests.',
    defaultRecommended: false,
    features: [
      { code: 'assets:view', label: 'View Assets', description: 'Inspect company equipment', recommendedByDefault: true },
      { code: 'assets:assign', label: 'Assign Assets', description: 'Allocate gear to staff', recommendedByDefault: true },
      { code: 'inventory:view', label: 'View Stock Levels', description: 'Check consumables inventory', recommendedByDefault: true },
      { code: 'inventory:move', label: 'Move & Fulfill Stock', description: 'Update quantities on hand', recommendedByDefault: false },
    ],
  },
  {
    key: 'documents',
    label: 'Documents & Vault',
    category: 'Operations & Finance',
    description: 'Shared workspace policies, project specs, and employee verification files.',
    defaultRecommended: true,
    features: [
      { code: 'documents:view', label: 'View Documents', description: 'Browse authorized files', recommendedByDefault: true },
      { code: 'documents:upload', label: 'Upload Files', description: 'Add handbooks and deliverables', recommendedByDefault: true },
      { code: 'documents:download', label: 'Download Files', description: 'Export attached files', recommendedByDefault: true },
    ],
  },
  {
    key: 'reports',
    label: 'Analytics & Reports',
    category: 'Operations & Finance',
    description: 'Live workspace metrics, capacity charts, and operational exports.',
    defaultRecommended: true,
    features: [
      { code: 'reports:view', label: 'View Dashboards & Analytics', description: 'Inspect performance charts', recommendedByDefault: true },
      { code: 'reports:export', label: 'Export Analytics', description: 'Download analytic summaries', recommendedByDefault: false },
    ],
  },
  {
    key: 'calendar',
    label: 'Team Calendar',
    category: 'Core Work',
    description: 'Unified schedule of deadlines, shifts, holidays, and approved leaves.',
    defaultRecommended: true,
    features: [
      { code: 'calendar:view:team', label: 'View Team Calendar', description: 'See team milestones & leaves', recommendedByDefault: true },
      { code: 'calendar:create', label: 'Schedule Events', description: 'Create meetings & milestones', recommendedByDefault: true },
    ],
  },
];

export function getRecommendedSetup(industriesInput?: string[], orgSize?: string) {
  const industries = Array.isArray(industriesInput) && industriesInput.length > 0
    ? industriesInput.map((i) => String(i).toUpperCase().trim()).filter(Boolean)
    : ['GENERAL'];

  const sizeKey = orgSize || '0-10';
  const isLargerOrg = ['51-100', '101-250', '251-500', '501-1000', '1000+'].includes(sizeKey);
  const isMidOrLargerOrg = ['11-25', '26-50', '51-100', '101-250', '251-500', '501-1000', '1000+'].includes(sizeKey);

  const recSet = new Set<string>([
    'projects',
    'tasks',
    'people',
    'attendance',
    'leave',
    'approvals',
    'calendar',
    'documents',
    'reports',
    'time',
  ]);

  const deptSuggestions = new Map<string, { name: string; code: string; teams: string[] }>([
    ['Operations', { name: 'Operations', code: 'OPS', teams: ['Core Operations'] }],
    ['People & HR', { name: 'People & HR', code: 'HR', teams: ['Talent & People Ops'] }],
  ]);

  if (industries.includes('IT_SOFTWARE')) {
    recSet.add('quality');
    recSet.add('assets');
    recSet.add('clients');
    deptSuggestions.set('Engineering', { name: 'Engineering', code: 'ENG', teams: ['Platform Engineering', 'QA & Release'] });
    deptSuggestions.set('Product & Design', { name: 'Product & Design', code: 'PROD', teams: ['Product Design'] });
  }
  if (industries.includes('OPERATIONS_BPO')) {
    recSet.add('work_queue');
    recSet.add('quality');
    recSet.add('sla');
    deptSuggestions.set('Service Delivery', { name: 'Service Delivery', code: 'SD', teams: ['Queue Operations', 'Quality Assurance'] });
  }
  if (industries.includes('MARKETING_AGENCY')) {
    recSet.add('clients');
    deptSuggestions.set('Creative & Campaigns', { name: 'Creative & Campaigns', code: 'MKT', teams: ['Content & Design', 'Client Accounts'] });
  }
  if (industries.includes('FINANCE_ACCOUNTING')) {
    recSet.add('clients');
    recSet.add('payroll');
    recSet.add('quality');
    deptSuggestions.set('Finance & Audit', { name: 'Finance & Audit', code: 'FIN', teams: ['Accounting', 'Advisory & Compliance'] });
  }
  if (industries.includes('HEALTHCARE')) {
    recSet.add('quality');
    recSet.add('assets');
    deptSuggestions.set('Clinical Operations', { name: 'Clinical Operations', code: 'CLIN', teams: ['Care Coordination', 'Compliance'] });
  }
  if (industries.includes('RETAIL_ECOMMERCE') || industries.includes('MANUFACTURING_LOGISTICS')) {
    recSet.add('work_queue');
    recSet.add('assets');
    recSet.add('sla');
    deptSuggestions.set('Supply Chain & Fulfillment', { name: 'Supply Chain & Fulfillment', code: 'SCM', teams: ['Warehouse & Inventory', 'Dispatch'] });
  }
  if (industries.includes('EDUCATION')) {
    recSet.add('clients');
    deptSuggestions.set('Academics & Delivery', { name: 'Academics & Delivery', code: 'ACAD', teams: ['Faculty', 'Student Support'] });
  }
  if (industries.includes('CONSTRUCTION_REAL_ESTATE')) {
    recSet.add('assets');
    recSet.add('clients');
    deptSuggestions.set('Field & Projects', { name: 'Field & Projects', code: 'FLD', teams: ['Site Operations', 'Procurement'] });
  }
  if (isMidOrLargerOrg) {
    recSet.add('payroll');
  }
  if (isLargerOrg) {
    recSet.add('work_queue');
    recSet.add('assets');
    recSet.add('sla');
    recSet.add('quality');
  }

  const allModulesCatalog = MODULES_CATALOG.map((m) => ({
    ...m,
    recommended: recSet.has(m.key),
    features: m.features.map((f) => ({
      ...f,
      recommended: f.recommendedByDefault !== false,
    })),
  }));

  const recommendedFeatureToggles: Record<string, string[]> = {};
  for (const mod of allModulesCatalog) {
    recommendedFeatureToggles[mod.key] = mod.features
      .filter((f) => f.recommended)
      .map((f) => f.code);
  }

  const starterRoleTemplates: StarterRoleTemplate[] = [
    {
      key: 'team_lead',
      name: 'Team Lead',
      description: 'Leads sprint/work execution, assigns & completes tasks, approves team time/leave, and can invite & configure permissions for their team.',
      dataScope: 'TEAM',
      delegatedAdmin: true,
      recommendedFor: 'Project leads, coordinators, and team supervisors',
      permissionCodes: [
        'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:review', 'tasks:complete', 'tasks:export',
        'projects:view', 'projects:create', 'projects:edit',
        'work_items:view', 'work_items:process', 'work_items:assign',
        'time:view', 'time:log', 'time:approve',
        'attendance:view', 'attendance:clock',
        'leave:view', 'leave:apply', 'leave:approve',
        'approvals:view', 'approvals:approve',
        'people:view', 'invitations:manage', 'roles:manage',
        'reports:view', 'documents:view', 'documents:upload', 'calendar:view:team', 'calendar:create',
      ],
    },
    {
      key: 'hr_specialist',
      name: 'HR Specialist',
      description: 'Manages organization people directory, onboarding, attendance, leave policies & approvals without full system ownership.',
      dataScope: 'GLOBAL',
      delegatedAdmin: true,
      recommendedFor: 'HR executives and people operations specialists',
      permissionCodes: [
        'people:view', 'people:create', 'people:edit', 'people:export',
        'invitations:manage', 'departments:manage', 'roles:manage',
        'attendance:view', 'attendance:edit', 'attendance:export',
        'leave:view', 'leave:apply', 'leave:approve', 'leave:manage',
        'approvals:view', 'approvals:approve',
        'payroll:view', 'payroll:edit',
        'documents:view', 'documents:upload', 'documents:download',
        'reports:view', 'calendar:view:team', 'calendar:create',
      ],
    },
    {
      key: 'staff_contributor',
      name: 'Staff / Specialist',
      description: 'Focused contributor role (Jira Assignee style): executes assigned tasks, logs time, clocks attendance, and submits leave or service requests without altering settings.',
      dataScope: 'ASSIGNED',
      recommendedFor: 'Engineers, analysts, associates & everyday working professionals',
      permissionCodes: [
        'tasks:view', 'tasks:create', 'tasks:edit',
        'projects:view',
        'work_items:view', 'work_items:process',
        'time:view', 'time:log',
        'attendance:view', 'attendance:clock',
        'leave:view', 'leave:apply',
        'approvals:view',
        'people:view',
        'documents:view', 'documents:upload',
        'calendar:view:team', 'calendar:create',
      ],
    },
  ];

  if (isLargerOrg) {
    starterRoleTemplates.splice(1, 0, {
      key: 'department_head',
      name: 'Department Head',
      description: 'Oversees all teams and staff inside their assigned department across projects, approvals, and capacity analytics.',
      dataScope: 'DEPARTMENT',
      delegatedAdmin: true,
      recommendedFor: 'Department directors in 50+ employee organizations',
      permissionCodes: [
        'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:review', 'tasks:complete', 'tasks:export',
        'projects:view', 'projects:create', 'projects:edit',
        'work_items:view', 'work_items:process', 'work_items:assign',
        'time:view', 'time:log', 'time:approve', 'time:export',
        'attendance:view', 'attendance:edit', 'attendance:export',
        'leave:view', 'leave:apply', 'leave:approve',
        'approvals:view', 'approvals:approve',
        'people:view', 'people:edit', 'invitations:manage', 'roles:manage',
        'reports:view', 'reports:export', 'quality:view', 'quality:review',
        'documents:view', 'documents:upload', 'calendar:view:department', 'calendar:create',
      ],
    });
  }

  return {
    industries,
    orgSize: sizeKey,
    industriesCatalog: INDUSTRIES_CATALOG,
    orgSizeBrackets: ORG_SIZE_BRACKETS,
    recommendedModules: Array.from(recSet),
    allModulesCatalog,
    recommendedFeatureToggles,
    starterRoleTemplates,
    suggestedDepartments: Array.from(deptSuggestions.values()),
  };
}
