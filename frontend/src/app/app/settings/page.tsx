'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  User,
  Upload,
  Camera,
  Phone,
  MapPin,
  Sliders,
  Shield,
  Users,
  CheckCircle2,
  Plus,
  Trash2,
  Pencil,
  X,
  CreditCard,
  Sparkles,
  Clock,
  Calendar,
  Award,
  Briefcase,
  FileCheck,
  Layers,
  Settings as SettingsIcon,
  Check,
  Stethoscope,
  Code2,
  HeartPulse,
  DollarSign,
  UserCheck,
  LayoutGrid,
  Loader2,
  AlertCircle,
  KeyRound,
  Lock,
  Smartphone,
  Copy,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Crown,
  Folder,
  Network,
  RotateCcw,
  MoreVertical,
  Info,
  Bell,
  Volume2,
  VolumeX,
  Package,
  Search,
  Share2,
  Link2,
  ExternalLink,
  Mail,
  Compass,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DEFAULT_ENABLED_MODULES,
  checkPermission,
  extractPermissionCodes,
  getDataScope,
  PermissionContext,
} from '@/lib/permissions';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  testNotificationSound,
  requestNotificationPermission,
  getNotificationPermission,
  NotificationPrefs,
  NotificationSoundType,
} from '@/lib/notifications';

const DEFAULT_PERMISSIONS_CATALOG = [
  // Assets (5)
  { id: 'perm_assets_view', code: 'assets:view', name: 'View company assets', module: 'Assets' },
  { id: 'perm_assets_create', code: 'assets:create', name: 'Register new assets', module: 'Assets' },
  { id: 'perm_assets_edit', code: 'assets:edit', name: 'Edit asset details', module: 'Assets' },
  { id: 'perm_assets_assign', code: 'assets:assign', name: 'Assign assets to people', module: 'Assets' },
  { id: 'perm_assets_delete', code: 'assets:delete', name: 'Delete assets', module: 'Assets' },

  // Inventory (3)
  { id: 'perm_inv_view', code: 'inventory:view', name: 'View stock and locations', module: 'Inventory' },
  { id: 'perm_inv_move', code: 'inventory:move', name: 'Move stock between locations', module: 'Inventory' },
  { id: 'perm_inv_manage', code: 'inventory:manage', name: 'Manage locations and low-stock rules', module: 'Inventory' },

  // Ledger (2)
  { id: 'perm_led_view', code: 'ledger:view', name: 'View movement ledger', module: 'Ledger' },
  { id: 'perm_led_export', code: 'ledger:export', name: 'Export ledger', module: 'Ledger' },

  // Documents (4)
  { id: 'perm_doc_view', code: 'documents:view', name: 'View document vault', module: 'Documents' },
  { id: 'perm_doc_upload', code: 'documents:upload', name: 'Upload documents', module: 'Documents' },
  { id: 'perm_doc_download', code: 'documents:download', name: 'Download documents', module: 'Documents' },
  { id: 'perm_doc_delete', code: 'documents:delete', name: 'Delete documents', module: 'Documents' },

  // People
  { id: 'perm_people_view', code: 'people:view', name: 'View Employee Directory & Profiles', module: 'People' },
  { id: 'perm_people_create', code: 'people:create', name: 'Add & Onboard Employees', module: 'People' },
  { id: 'perm_people_edit', code: 'people:edit', name: 'Edit Employee Records & Assignments', module: 'People' },
  { id: 'perm_people_delete', code: 'people:delete', name: 'Deactivate & Offboard Employees', module: 'People' },
  { id: 'perm_people_export', code: 'people:export', name: 'Export Employee Records', module: 'People' },
  { id: 'perm_people_manage', code: 'people:manage', name: 'Full People Administration', module: 'People' },

  // Projects
  { id: 'perm_proj_view', code: 'projects:view', name: 'View Work Projects', module: 'Projects' },
  { id: 'perm_proj_create', code: 'projects:create', name: 'Create Projects & Milestones', module: 'Projects' },
  { id: 'perm_proj_edit', code: 'projects:edit', name: 'Edit Project Settings', module: 'Projects' },
  { id: 'perm_proj_delete', code: 'projects:delete', name: 'Archive & Delete Projects', module: 'Projects' },
  { id: 'perm_proj_manage', code: 'projects:manage', name: 'Full Project Administration', module: 'Projects' },

  // Tasks
  { id: 'perm_tasks_view', code: 'tasks:view', name: 'View Tasks & Taskboards', module: 'Tasks' },
  { id: 'perm_tasks_create', code: 'tasks:create', name: 'Create Tasks', module: 'Tasks' },
  { id: 'perm_tasks_edit', code: 'tasks:edit', name: 'Update Task Progress & Details', module: 'Tasks' },
  { id: 'perm_tasks_review', code: 'tasks:review', name: 'Review & QA Completed Tasks', module: 'Tasks' },
  { id: 'perm_tasks_complete', code: 'tasks:complete', name: 'Mark Assigned Tasks Complete', module: 'Tasks' },
  { id: 'perm_tasks_delete', code: 'tasks:delete', name: 'Delete Tasks', module: 'Tasks' },
  { id: 'perm_tasks_assign', code: 'tasks:assign', name: 'Assign Tasks to Team Members', module: 'Tasks' },
  { id: 'perm_tasks_export', code: 'tasks:export', name: 'Export Tasks & Backlogs', module: 'Tasks' },
  { id: 'perm_tasks_manage', code: 'tasks:manage', name: 'Full Task Administration', module: 'Tasks' },

  // WorkQueue
  { id: 'perm_wq_view', code: 'work_items:view', name: 'View Operations Queues', module: 'WorkQueue' },
  { id: 'perm_wq_process', code: 'work_items:process', name: 'Process Operational Queue Items', module: 'WorkQueue' },
  { id: 'perm_wq_assign', code: 'work_items:assign', name: 'Assign & Reorder Work Items', module: 'WorkQueue' },
  { id: 'perm_wq_export', code: 'work_items:export', name: 'Export Queue Data', module: 'WorkQueue' },
  { id: 'perm_wq_manage', code: 'work_items:manage', name: 'Full Operations Queue Administration', module: 'WorkQueue' },

  // Time
  { id: 'perm_time_view', code: 'time:view', name: 'View Timesheets & Time Logs', module: 'Time' },
  { id: 'perm_time_log', code: 'time:log', name: 'Log Work Hours & Timer', module: 'Time' },
  { id: 'perm_time_edit', code: 'time:edit', name: 'Edit Logged Timesheets', module: 'Time' },
  { id: 'perm_time_approve', code: 'time:approve', name: 'Approve Team Timesheets', module: 'Time' },
  { id: 'perm_time_export', code: 'time:export', name: 'Export Timesheet Logs', module: 'Time' },
  { id: 'perm_time_manage', code: 'time:manage', name: 'Full Time & Shift Administration', module: 'Time' },

  // Attendance
  { id: 'perm_att_view', code: 'attendance:view', name: 'View Attendance Records & History', module: 'Attendance' },
  { id: 'perm_att_clock', code: 'attendance:clock', name: 'Clock In, Clock Out & Shift Tracker', module: 'Attendance' },
  { id: 'perm_att_edit', code: 'attendance:edit', name: 'Adjust Attendance Records', module: 'Attendance' },
  { id: 'perm_att_export', code: 'attendance:export', name: 'Export Attendance Reports', module: 'Attendance' },
  { id: 'perm_att_manage', code: 'attendance:manage', name: 'Full Attendance & Shift Administration', module: 'Attendance' },

  // Leave
  { id: 'perm_leave_view', code: 'leave:view', name: 'View Leave Balances & Team Calendar', module: 'Leave' },
  { id: 'perm_leave_apply', code: 'leave:apply', name: 'Apply for Leave & PTO', module: 'Leave' },
  { id: 'perm_leave_approve', code: 'leave:approve', name: 'Approve or Reject Leave Requests', module: 'Leave' },
  { id: 'perm_leave_manage', code: 'leave:manage', name: 'Full Leave Policy Administration', module: 'Leave' },

  // Approvals
  { id: 'perm_app_view', code: 'approvals:view', name: 'View Pending Approvals', module: 'Approvals' },
  { id: 'perm_app_approve', code: 'approvals:approve', name: 'Approve or Reject Operational Items', module: 'Approvals' },
  { id: 'perm_app_manage', code: 'approvals:manage', name: 'Configure Approval Chains', module: 'Approvals' },

  // Quality
  { id: 'perm_qa_view', code: 'quality:view', name: 'View Quality Audit Scorecards', module: 'Quality' },
  { id: 'perm_qa_audit', code: 'quality:audit', name: 'Perform Quality Audits', module: 'Quality' },
  { id: 'perm_qa_review', code: 'quality:review', name: 'Conduct QA Reviews', module: 'Quality' },
  { id: 'perm_qa_manage', code: 'quality:manage', name: 'Configure Quality Scorecards & Thresholds', module: 'Quality' },

  // SLA
  { id: 'perm_sla_view', code: 'sla:view', name: 'View SLA Metrics & Breaches', module: 'SLA' },
  { id: 'perm_sla_manage', code: 'sla:manage', name: 'Configure SLA Deadlines & Escalation Rules', module: 'SLA' },

  // Clients
  { id: 'perm_cli_view', code: 'clients:view', name: 'View Client Accounts', module: 'Clients' },
  { id: 'perm_cli_create', code: 'clients:create', name: 'Create Client Accounts', module: 'Clients' },
  { id: 'perm_cli_edit', code: 'clients:edit', name: 'Edit Client Profiles', module: 'Clients' },
  { id: 'perm_cli_delete', code: 'clients:delete', name: 'Archive Client Accounts', module: 'Clients' },
  { id: 'perm_cli_manage', code: 'clients:manage', name: 'Full Client Administration', module: 'Clients' },

  // Reports
  { id: 'perm_rep_view', code: 'reports:view', name: 'View Operational Reports & Dashboards', module: 'Reports' },
  { id: 'perm_rep_export', code: 'reports:export', name: 'Export Analytic Reports', module: 'Reports' },

  // Payroll
  { id: 'perm_pay_view', code: 'payroll:view', name: 'View Restricted Payroll & Salaries', module: 'Payroll' },
  { id: 'perm_pay_edit', code: 'payroll:edit', name: 'Edit Compensation & Deductions', module: 'Payroll' },
  { id: 'perm_pay_approve', code: 'payroll:approve', name: 'Approve Payroll Disbursals', module: 'Payroll' },
  { id: 'perm_pay_export', code: 'payroll:export', name: 'Export Sensitive Payroll Reports', module: 'Payroll' },
  { id: 'perm_pay_manage', code: 'payroll:manage', name: 'Full Payroll Administration', module: 'Payroll' },

  // Calendar & Common Holidays
  { id: 'perm_cal_view_all', code: 'calendar:view:all', name: 'View All Organization Calendar Events', module: 'Calendar' },
  { id: 'perm_cal_view_dept', code: 'calendar:view:department', name: 'View Department Calendar Events', module: 'Calendar' },
  { id: 'perm_cal_view_team', code: 'calendar:view:team', name: 'View Team Calendar Events', module: 'Calendar' },
  { id: 'perm_cal_create', code: 'calendar:create', name: 'Schedule Meetings & Events', module: 'Calendar' },
  { id: 'perm_cal_holidays', code: 'calendar:holidays:manage', name: 'Manage Common Holidays & Festivals (Owner & Admin)', module: 'Calendar' },

  // Admin & Org
  { id: 'perm_org_manage', code: 'org:manage', name: 'Manage Organization Profile', module: 'Organization' },
  { id: 'perm_inv_mgmt', code: 'invitations:manage', name: 'Invite & Manage Team Members', module: 'Invitations' },
  { id: 'perm_role_manage', code: 'roles:manage', name: 'Configure Custom Roles & Permissions', module: 'Roles' },
  { id: 'perm_dept_manage', code: 'departments:manage', name: 'Manage Departments & Teams', module: 'Departments' },
  { id: 'perm_sett_manage', code: 'settings:manage', name: 'Manage Workspace Settings', module: 'Settings' },
  { id: 'perm_bill_manage', code: 'billing:manage', name: 'Manage Subscriptions & Billing', module: 'Billing' },
];

const DEFAULT_SYSTEM_ROLES = [
  {
    id: 'role_admin',
    name: 'ADMIN',
    description: 'Organization administration: invites, departments, module policies, and operations',
    isSystemRole: true,
    isActive: true,
    _count: { memberships: 2 },
    permissions: DEFAULT_PERMISSIONS_CATALOG
      .filter((p) => p.code !== 'billing:manage')
      .map((p) => ({ permissionId: p.id, code: p.code, permission: p })),
  },
  /* LEGACY_ROLE_COMMENTED_OUT: MANAGER and MEMBER hidden in favor of custom staff organization roles
  {
    id: 'role_manager',
    name: 'MANAGER',
    description: 'Team and operations management: workloads, attendance, timesheets, leaves, and quality reviews',
    isSystemRole: true,
    isActive: true,
    _count: { memberships: 2 },
    permissions: [
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
      'calendar:view:department', 'calendar:view:team', 'calendar:create',
    ].map((code) => {
      const p = DEFAULT_PERMISSIONS_CATALOG.find((x) => x.code === code);
      return { permissionId: p?.id || code, code, permission: p };
    }),
  },
  {
    id: 'role_member',
    name: 'MEMBER',
    description: 'Individual contributor: assigned tasks, projects, operational work, attendance, and personal profile',
    isSystemRole: true,
    isActive: true,
    _count: { memberships: 6 },
    permissions: [
      'tasks:view', 'tasks:create', 'tasks:edit',
      'projects:view',
      'work_items:view', 'work_items:process',
      'time:view', 'time:log',
      'attendance:view', 'attendance:clock',
      'leave:view', 'leave:apply',
      'approvals:view',
      'people:view',
    ].map((code) => {
      const p = DEFAULT_PERMISSIONS_CATALOG.find((x) => x.code === code);
      return { permissionId: p?.id || code, code, permission: p };
    }),
  },
  */
  {
    id: 'role_owner',
    name: 'OWNER',
    description: 'Organization ownership: controls settings, billing, plan management, and delegated authority',
    isSystemRole: true,
    isActive: true,
    _count: { memberships: 1 },
    permissions: DEFAULT_PERMISSIONS_CATALOG.map((p) => ({ permissionId: p.id, code: p.code, permission: p })),
  },
];

const DATA_SCOPE_ORDER_MAP: Record<string, number> = {
  OWN: 1,
  ASSIGNED: 1,
  TEAM: 2,
  DEPARTMENT: 3,
  GLOBAL: 4,
  WORKSPACE: 4,
};

const MODULE_DISPLAY_ORDER: Record<string, number> = {
  Assets: 1,
  Inventory: 2,
  Ledger: 3,
  Documents: 4,
  Approvals: 5,
  Attendance: 6,
  Time: 7,
  Tasks: 8,
  Projects: 9,
  People: 10,
  WorkQueue: 11,
  Leave: 12,
  Quality: 13,
  SLA: 14,
  Clients: 15,
  Reports: 16,
  Payroll: 17,
  Calendar: 18,
  Organization: 19,
  Invitations: 20,
  Roles: 21,
  Departments: 22,
  Settings: 23,
  Billing: 24,
};

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  Assets: 'COMPANY ASSETS',
  Inventory: 'INVENTORY & STOCK',
  Ledger: 'MOVEMENT LEDGER',
  Documents: 'DOCUMENT VAULT',
  Payroll: 'PAYROLL & COMPENSATION',
  Projects: 'PROJECTS',
  Tasks: 'TASKS',
  People: 'PEOPLE & ORG',
  Attendance: 'ATTENDANCE',
  Time: 'TIME TRACKING',
  Leave: 'LEAVE & PTO',
  Approvals: 'APPROVALS',
  Reports: 'REPORTS & ANALYTICS',
  Calendar: 'CALENDAR & HOLIDAYS',
  WorkQueue: 'WORK QUEUE ENGINE',
  Quality: 'QUALITY AUDIT',
  SLA: 'SLA & ESCALATIONS',
  Clients: 'CLIENT PORTAL',
  Organization: 'ORGANIZATION',
  Invitations: 'INVITATIONS',
  Roles: 'ROLES',
  Departments: 'DEPARTMENTS',
  Settings: 'SETTINGS',
  Billing: 'BILLING',
};

const DATA_SCOPE_OPTIONS = [
  { key: 'OWN', label: 'Own Records', desc: 'Only records created by or directly belonging to the user' },
  { key: 'ASSIGNED', label: 'Assigned Records', desc: 'Items explicitly assigned to the user' },
  { key: 'TEAM', label: 'Team Records', desc: 'Records across the user\'s functional team' },
  { key: 'DEPARTMENT', label: 'Department Records', desc: 'Records within the user\'s assigned department' },
  { key: 'GLOBAL', label: 'Entire Workspace', desc: 'Full workspace-wide operational visibility' },
];

const DESIGNATION_PERMISSION_PRESETS: Array<{
  label: string;
  titleHint: string;
  accessRole: 'MEMBER' | 'MANAGER' | 'ADMIN';
  dataScope: 'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL';
  permissionCodes: string[];
}> = [
  {
    label: 'HR - Recruitment',
    titleHint: 'Focused on hiring, invitations, onboarding, and directory profiles',
    accessRole: 'MEMBER',
    dataScope: 'DEPARTMENT',
    permissionCodes: ['people:view', 'people:create', 'invitations:manage', 'departments:manage', 'calendar:view:all', 'calendar:create'],
  },
  {
    label: 'HR Generalist',
    titleHint: 'Handles employee records, leave approvals, attendance, and onboarding',
    accessRole: 'MEMBER',
    dataScope: 'GLOBAL',
    permissionCodes: ['people:view', 'people:create', 'people:edit', 'invitations:manage', 'leave:view', 'leave:approve', 'leave:manage', 'attendance:view', 'attendance:edit', 'approvals:view', 'approvals:approve'],
  },
  {
    label: 'Payroll Specialist',
    titleHint: 'Processes salary runs, deductions, and compensation exports',
    accessRole: 'MEMBER',
    dataScope: 'GLOBAL',
    permissionCodes: ['payroll:view', 'payroll:edit', 'payroll:export', 'attendance:view', 'leave:view', 'people:view', 'reports:view'],
  },
  {
    label: 'Team Lead',
    titleHint: 'Leads project delivery, task assignments, timesheet & leave approvals (optionally delegated setup)',
    accessRole: 'MEMBER',
    dataScope: 'TEAM',
    permissionCodes: ['projects:view', 'projects:create', 'projects:edit', 'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:review', 'time:view', 'time:approve', 'leave:view', 'leave:approve', 'people:view', 'invitations:manage', 'roles:manage', 'calendar:view:team', 'calendar:create'],
  },
  {
    label: 'Staff / Specialist',
    titleHint: 'General employee access for tasks, timesheets, attendance & leave requests',
    accessRole: 'MEMBER',
    dataScope: 'ASSIGNED',
    permissionCodes: ['projects:view', 'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:complete', 'time:view', 'time:log', 'attendance:view', 'attendance:clock', 'leave:view', 'leave:apply', 'people:view'],
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'details' | 'personal' | 'profile' | 'modules' | 'roles' | 'structure' | 'billing' | 'security'
  >('overview');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [showCustomRolesList, setShowCustomRolesList] = useState(true);
  const [roleRightTab, setRoleRightTab] = useState<'permissions' | 'members' | 'details'>('permissions');
  const [selectedPermModule, setSelectedPermModule] = useState<string>('Assets');
  const [draftRolePermIds, setDraftRolePermIds] = useState<string[]>([]);
  const [draftRoleDataScope, setDraftRoleDataScope] = useState<string>('GLOBAL');
  const [draftRoleScopedTeamIds, setDraftRoleScopedTeamIds] = useState<string[]>([]);
  const [rolePermsDirty, setRolePermsDirty] = useState(false);
  const [savingRolePerms, setSavingRolePerms] = useState(false);
  const [resettingRole, setResettingRole] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleCopyFromId, setNewRoleCopyFromId] = useState('');
  const [newRoleDataScope, setNewRoleDataScope] = useState<'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL'>('DEPARTMENT');
  const [newRoleScopedTeamIds, setNewRoleScopedTeamIds] = useState<string[]>([]);
  const [copyFromMenuOpen, setCopyFromMenuOpen] = useState(false);
  const [roleMembers, setRoleMembers] = useState<any[]>([]);
  const [loadingRoleMembers, setLoadingRoleMembers] = useState(false);
  const [directoryMembers, setDirectoryMembers] = useState<any[]>([]);
  const [expandedOverviewDepts, setExpandedOverviewDepts] = useState<Record<string, boolean>>({});
  const [expandedOverviewTeams, setExpandedOverviewTeams] = useState<Record<string, boolean>>({});

  // Alert & Sound preferences state (per-user)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());
  const [browserNotifPermission, setBrowserNotifPermission] = useState<string>(() => getNotificationPermission());
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    if (typeof window === 'undefined') return 'MEMBER';
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.role || parsed.accessRole || 'MEMBER';
      }
    } catch {}
    return 'MEMBER';
  });
  const [activeWorkspaceCtx, setActiveWorkspaceCtx] = useState<PermissionContext | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('orvexa_cached_workspace');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const isOwnerOrAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canManageRoles = isOwnerOrAdmin || checkPermission(activeWorkspaceCtx, 'roles:manage');
  const canManageInvites =
    isOwnerOrAdmin ||
    checkPermission(activeWorkspaceCtx, 'invitations:manage') ||
    checkPermission(activeWorkspaceCtx, 'people:manage');
  const actorDataScope = getDataScope(activeWorkspaceCtx);
  const actorDataScopeRank = DATA_SCOPE_ORDER_MAP[(actorDataScope || 'ASSIGNED').toUpperCase()] ?? 2;

  // Shareable workspace invite link state
  const [shareInviteLink, setShareInviteLink] = useState<{
    code?: string;
    enabled?: boolean;
    joinUrl?: string;
    workspaceName?: string;
    defaultRoleId?: string | null;
    defaultDepartmentId?: string | null;
    defaultTeamId?: string | null;
    defaultDesignationTitle?: string | null;
    defaultDataScope?: string;
  } | null>(null);
  const [savingShareLink, setSavingShareLink] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  // Personal Details states
  const [personalFirstName, setPersonalFirstName] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.firstName || '';
    } catch {
      return '';
    }
  });
  const [personalLastName, setPersonalLastName] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.lastName || '';
    } catch {
      return '';
    }
  });
  const [personalEmail, setPersonalEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.email || '';
    } catch {
      return '';
    }
  });
  const [personalDesignation, setPersonalDesignation] = useState(() => {
    if (typeof window === 'undefined') return 'Founder & CEO';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.jobTitle || p.designation || 'Founder & CEO';
    } catch {
      return 'Founder & CEO';
    }
  });
  const [personalPhone, setPersonalPhone] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.phone || '';
    } catch {
      return '';
    }
  });
  const [personalLocation, setPersonalLocation] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.location || '';
    } catch {
      return '';
    }
  });
  const [personalBio, setPersonalBio] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.bio || '';
    } catch {
      return '';
    }
  });
  const [personalAvatar, setPersonalAvatar] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('orvexa_user_avatar') || null;
    } catch {
      return null;
    }
  });
  const [savingPersonal, setSavingPersonal] = useState(false);
  const personalFileInputRef = React.useRef<HTMLInputElement>(null);

  const compressPersonalImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(objectUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressed);
      };
      img.onerror = (err) => reject(err);
      img.src = objectUrl;
    });
  };

  const handlePersonalImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be less than 8MB.');
      return;
    }

    try {
      const compressedDataUrl = await compressPersonalImage(file);
      setPersonalAvatar(compressedDataUrl);
      try {
        localStorage.setItem('orvexa_user_avatar', compressedDataUrl);
      } catch {}
      window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: compressedDataUrl }));
      toast.success('Profile photo selected. Click Save Changes to apply.');
    } catch {
      toast.error('Could not process photo. Please try a different image.');
    }
  };

  const handleRemovePersonalImage = () => {
    setPersonalAvatar(null);
    if (personalFileInputRef.current) {
      personalFileInputRef.current.value = '';
    }
    try {
      localStorage.removeItem('orvexa_user_avatar');
    } catch {}
    window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: null }));
    toast.info('Profile photo removed. Click Save Changes to apply.');
  };

  const handleSavePersonalDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingPersonal(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) {
        await fetch(`${BRANDING.apiUrl}/auth/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: personalFirstName.trim() || undefined,
            lastName: personalLastName.trim() || undefined,
            phone: personalPhone.trim() || undefined,
            avatarUrl: personalAvatar || undefined,
          }),
        });
      }

      if (personalAvatar) {
        localStorage.setItem('orvexa_user_avatar', personalAvatar);
        window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: personalAvatar }));
      } else {
        localStorage.removeItem('orvexa_user_avatar');
        window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: null }));
      }

      const rawCached = localStorage.getItem('orvexa_cached_profile');
      const prev = rawCached ? JSON.parse(rawCached) : {};
      const merged = {
        ...prev,
        firstName: personalFirstName.trim() || prev.firstName || 'User',
        lastName: personalLastName.trim() || prev.lastName || '',
        avatarUrl: personalAvatar || null,
        avatar: personalAvatar || null,
        phone: personalPhone.trim(),
        location: personalLocation.trim(),
        bio: personalBio.trim(),
        jobTitle: personalDesignation.trim(),
      };
      localStorage.setItem('orvexa_cached_profile', JSON.stringify(merged));
      localStorage.setItem('user', JSON.stringify(merged));

      toast.success('Personal details and profile photo updated successfully!');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error updating personal details');
    } finally {
      setSavingPersonal(false);
    }
  };

  // Security & 2FA states
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const profileFileInputRef = React.useRef<HTMLInputElement>(null);
  const [enrollingMfa, setEnrollingMfa] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] = useState<{ secret: string; otpauthUrl: string; recoveryCodes: string[] } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [confirmingMfa, setConfirmingMfa] = useState(false);
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [resettingMfaUserId, setResettingMfaUserId] = useState<string | null>(null);

  // Data states
  const [workspace, setWorkspace] = useState<any>(null);
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('GENERAL');
  const [country, setCountry] = useState('United States');
  const [timezone, setTimezone] = useState('UTC-05:00 (Eastern Time)');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  // Roles & Permissions state
  const [roles, setRoles] = useState<any[]>(DEFAULT_SYSTEM_ROLES);
  const [allPermissions, setAllPermissions] = useState<any[]>(DEFAULT_PERMISSIONS_CATALOG);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>('role_admin');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);

  // Custom Role Lifecycle & Access Diagnostics
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [deleteReassignRoleId, setDeleteReassignRoleId] = useState('');
  const [selectedDiagnosticMemberId, setSelectedDiagnosticMemberId] = useState('');
  const [diagnosticPermissionToTest, setDiagnosticPermissionToTest] = useState('payroll:view');
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);
  const [diagnosingAccess, setDiagnosingAccess] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Structure state (Departments, Teams, Designations)
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDeptId, setNewTeamDeptId] = useState('');
  const [newTeamLeadId, setNewTeamLeadId] = useState('');
  const [newDesigTitle, setNewDesigTitle] = useState('');
  const [newDesigLevel, setNewDesigLevel] = useState(1);
  const [newDesigDeptId, setNewDesigDeptId] = useState('');
  const [newDesigAccessRole, setNewDesigAccessRole] = useState<'MEMBER' | 'MANAGER' | 'ADMIN'>('MEMBER');
  const [newDesigDataScope, setNewDesigDataScope] = useState<'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL'>('OWN');
  const [newDesigPerms, setNewDesigPerms] = useState<string[]>([]);
  const [showDesigConfigModal, setShowDesigConfigModal] = useState(false);

  // Structure Edit state
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptCode, setEditDeptCode] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDeptId, setEditTeamDeptId] = useState('');
  const [editTeamLeadId, setEditTeamLeadId] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  const [editingDesigId, setEditingDesigId] = useState<string | null>(null);
  const [editDesigTitle, setEditDesigTitle] = useState('');
  const [editDesigLevel, setEditDesigLevel] = useState(1);
  const [editDesigDeptId, setEditDesigDeptId] = useState('');
  const [editDesigAccessRole, setEditDesigAccessRole] = useState<'MEMBER' | 'MANAGER' | 'ADMIN'>('MEMBER');
  const [editDesigDataScope, setEditDesigDataScope] = useState<'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL'>('OWN');
  const [editDesigPerms, setEditDesigPerms] = useState<string[]>([]);
  const [savingDesig, setSavingDesig] = useState(false);

  // Billing state
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [cancellingSub, setCancellingSub] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? (localStorage.getItem('activeWorkspaceId') || workspace?.id) : workspace?.id;

  const getHeaders = () => {
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const activeWsId = typeof window !== 'undefined' ? (localStorage.getItem('activeWorkspaceId') || workspace?.id) : workspace?.id;
    return {
      'Content-Type': 'application/json',
      Authorization: activeToken ? `Bearer ${activeToken}` : '',
      ...(activeWsId && activeWsId !== 'undefined' && activeWsId !== 'null' ? { 'x-workspace-id': activeWsId } : {}),
    };
  };

  const headers = getHeaders();

  const loadAllData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    setLoading(true);
    try {
      let currentWsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

      if (!currentWsId || currentWsId === 'undefined' || currentWsId === 'null') {
        const wsListRes = await fetch(`${BRANDING.apiUrl}/workspaces`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const wsList = await wsListRes.json();
        const memberships = Array.isArray(wsList) ? wsList : (wsList.data || []);
        if (memberships.length > 0) {
          currentWsId = memberships[0].workspaceId || memberships[0].id;
          if (currentWsId) {
            localStorage.setItem('activeWorkspaceId', currentWsId);
          }
        }
      }

      const activeHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(currentWsId && currentWsId !== 'undefined' ? { 'x-workspace-id': currentWsId } : {}),
      };

      const [wsRes, rolesRes, permsRes, deptsRes, teamsRes, desigRes, subRes, planRes, meRes, peopleRes, notifPrefsRes, inviteLinkRes] = await Promise.all([
        currentWsId ? fetch(`${BRANDING.apiUrl}/workspaces/${currentWsId}`, { headers: activeHeaders }) : Promise.resolve(null),
        fetch(`${BRANDING.apiUrl}/roles`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/roles/permissions`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/departments`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/teams`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/designations`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/subscriptions/current`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/subscriptions/plans`),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/people`, { headers: activeHeaders }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/notifications/preferences`, { headers: activeHeaders }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/workspaces/invite-link`, { headers: activeHeaders }).catch(() => null),
      ]);

      let resolvedUid = '';
      if (meRes) {
        const rawMe = await meRes.json();
        const meData = rawMe.data !== undefined ? rawMe.data : rawMe;
        if (meData && meData.id) {
          resolvedUid = meData.id;
          setUserProfile(meData);
          if (meData.firstName) setPersonalFirstName(meData.firstName);
          if (meData.lastName) setPersonalLastName(meData.lastName);
          if (meData.email) setPersonalEmail(meData.email);
          if (meData.phone) setPersonalPhone(meData.phone);
          if (meData.avatarUrl || meData.avatar) setPersonalAvatar(meData.avatarUrl || meData.avatar);
          const activeMem = meData.memberships?.find((m: any) => m.workspaceId === currentWsId) || meData.memberships?.[0];
          if (activeMem?.accessRole) setCurrentUserRole(activeMem.accessRole);
          if (activeMem) {
            setActiveWorkspaceCtx((prev) => ({
              ...(prev || {}),
              ...activeMem,
              workspace: activeMem.workspace || prev?.workspace,
            }));
          }
          if (activeMem?.designation?.title) {
            setPersonalDesignation(activeMem.designation.title);
          } else if (activeMem?.role?.name) {
            setPersonalDesignation(activeMem.role.name);
          }
        }
      }

      if (notifPrefsRes && notifPrefsRes.ok) {
        const rawPrefs = await notifPrefsRes.json();
        const prefsData = rawPrefs?.data !== undefined ? rawPrefs.data : rawPrefs;
        if (prefsData && typeof prefsData === 'object') {
          const synced = saveNotificationPrefs(
            {
              desktopNotificationsEnabled:
                prefsData.browserPushNotifications !== undefined
                  ? Boolean(prefsData.browserPushNotifications)
                  : true,
              soundEnabled: prefsData.soundEnabled !== undefined ? Boolean(prefsData.soundEnabled) : true,
              soundType: prefsData.soundType || 'chime',
              soundVolume: typeof prefsData.soundVolume === 'number' ? prefsData.soundVolume : 0.7,
              taskSoundEnabled: prefsData.taskSoundEnabled !== undefined ? Boolean(prefsData.taskSoundEnabled) : true,
              chatSoundEnabled: prefsData.chatSoundEnabled !== undefined ? Boolean(prefsData.chatSoundEnabled) : true,
            },
            resolvedUid || undefined,
          );
          setNotifPrefs(synced);
        }
      }

      if (wsRes) {
        const rawWs = await wsRes.json();
        const wsData = rawWs.data !== undefined ? rawWs.data : rawWs;
        if (wsData && wsData.id) {
          setWorkspace(wsData);
          setActiveWorkspaceCtx((prev) => (prev ? { ...prev, workspace: wsData } : { workspace: wsData }));
          setName(wsData.name || '');
          setBusinessType(wsData.businessType || 'GENERAL');
          if (wsData.settings) {
            setCountry(wsData.settings.country || 'United States');
            setTimezone(wsData.settings.timezone || 'UTC-05:00 (Eastern Time)');
            setEnabledModules(
              Array.isArray(wsData.settings.enabledModules)
                ? wsData.settings.enabledModules
                : DEFAULT_ENABLED_MODULES,
            );
          } else {
            setEnabledModules(DEFAULT_ENABLED_MODULES);
          }
        }
      }

      if (inviteLinkRes && inviteLinkRes.ok) {
        const rawLink = await inviteLinkRes.json();
        const linkData = rawLink?.data !== undefined ? rawLink.data : rawLink;
        if (linkData && linkData.code) {
          setShareInviteLink(linkData);
        }
      }

      if (peopleRes && peopleRes.ok) {
        const rawPeople = await peopleRes.json();
        const peopleList = rawPeople?.data !== undefined ? rawPeople.data : rawPeople;
        if (Array.isArray(peopleList)) {
          setDirectoryMembers(peopleList);
        }
      }

      const rawRoles = await rolesRes.json();
      const rolesData = rawRoles.data !== undefined ? rawRoles.data : rawRoles;
      if (Array.isArray(rolesData)) {
        // LEGACY_ROLE_COMMENTED_OUT: Keep only ADMIN and OWNER from system roles + all custom staff organization roles
        // const systemOrder = ['ADMIN', 'MANAGER', 'MEMBER', 'OWNER'];
        const systemOrder = ['ADMIN', 'OWNER'];
        const filteredRoles = rolesData.filter((r) => {
          const upper = (r.name || '').toUpperCase();
          return !(r.isSystemRole && (upper === 'MANAGER' || upper === 'MEMBER'));
        });
        const sorted = [...filteredRoles].sort((a, b) => {
          const aIndex = systemOrder.indexOf(a.name);
          const bIndex = systemOrder.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
        setRoles(sorted);
        setSelectedRoleId((prev) => {
          const found = sorted.find((r) => r.id === prev);
          if (found) return prev;
          const customRole = !isOwnerOrAdmin ? sorted.find((r) => !r.isSystemRole) : null;
          const adminRole = customRole || sorted.find((r) => r.name === 'ADMIN') || sorted[0];
          return adminRole ? adminRole.id : null;
        });
      }

      if (permsRes && permsRes.ok) {
        const rawPerms = await permsRes.json();
        const permsData = rawPerms.data !== undefined ? rawPerms.data : rawPerms;
        if (Array.isArray(permsData) && permsData.length > 0) setAllPermissions(permsData);
      }

      const rawDepts = await deptsRes.json();
      const deptsData = rawDepts.data !== undefined ? rawDepts.data : rawDepts;
      if (Array.isArray(deptsData)) {
        setDepartments(deptsData);
        if (deptsData.length > 0 && Object.keys(expandedOverviewDepts).length === 0) {
          setExpandedOverviewDepts({ [deptsData[0].id]: true });
        }
      }

      const rawTeams = await teamsRes.json();
      const teamsData = rawTeams.data !== undefined ? rawTeams.data : rawTeams;
      if (Array.isArray(teamsData)) {
        setTeams(teamsData);
        if (teamsData.length > 0 && Object.keys(expandedOverviewTeams).length === 0) {
          setExpandedOverviewTeams({ [teamsData[0].id]: true });
        }
      }

      const rawDesig = await desigRes.json();
      const desigData = rawDesig.data !== undefined ? rawDesig.data : rawDesig;
      if (Array.isArray(desigData)) setDesignations(desigData);

      if (subRes) {
        const subData = await subRes.json();
        const actualSub = subData.data !== undefined ? subData.data : subData;
        setSubscription(actualSub);
      }

      if (planRes) {
        const planData = await planRes.json();
        const actualPlans = planData.data !== undefined ? planData.data : planData;
        if (Array.isArray(actualPlans)) setPlans(actualPlans);
      }
    } catch (err: any) {
      console.error('Error loading settings data:', err);
      toast.error('Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam) {
        if (tabParam === 'personal' || tabParam === 'profile') {
          setActiveTab('personal');
        } else if (['overview', 'details', 'modules', 'roles', 'structure', 'billing', 'security'].includes(tabParam)) {
          setActiveTab(tabParam as any);
        }
      }
    }
    loadAllData();
  }, []);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, or WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB');
      return;
    }
    setUploadingProfileImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      setProfileAvatarUrl(reader.result as string);
      setUploadingProfileImage(false);
      toast.success('Image loaded! Click "Save Profile" to apply.');
    };
    reader.onerror = () => {
      setUploadingProfileImage(false);
      toast.error('Failed to load image');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profileFirstName.trim() || !profileLastName.trim()) {
      toast.error('First and Last names are required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: profileFirstName.trim(),
          lastName: profileLastName.trim(),
          phone: profilePhone.trim() || undefined,
          avatarUrl: profileAvatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      const updated = data.data !== undefined ? data.data : data;
      setUserProfile((prev: any) => ({ ...prev, ...updated, avatarUrl: profileAvatarUrl }));
      try {
        const cached = localStorage.getItem('orvexa_cached_profile');
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem(
          'orvexa_cached_profile',
          JSON.stringify({ ...parsed, ...updated, avatarUrl: profileAvatarUrl })
        );
      } catch {}
      window.dispatchEvent(
        new CustomEvent('profile-updated', {
          detail: { ...userProfile, ...updated, avatarUrl: profileAvatarUrl },
        })
      );
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handler 1: Save Org Details
  const handleSaveDetails = async () => {
    if (!name.trim()) {
      toast.error('Organization Name is required');
      return;
    }
    setSavingDetails(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          businessType,
          settings: { country, timezone },
        }),
      });

      if (!res.ok) throw new Error('Failed to update details');
      toast.success('Organization details updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error updating settings');
    } finally {
      setSavingDetails(false);
    }
  };

  const syncCachedWorkspaceModules = (nextModules: string[]) => {
    setWorkspace((prev: any) => ({
      ...prev,
      settings: {
        ...(prev?.settings || {}),
        enabledModules: nextModules,
      },
    }));
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('orvexa_cached_workspace');
        if (raw) {
          const parsed = JSON.parse(raw);
          const updatedWs = {
            ...parsed,
            workspace: {
              ...(parsed.workspace || {}),
              settings: {
                ...(parsed.workspace?.settings || {}),
                enabledModules: nextModules,
              },
            },
          };
          localStorage.setItem('orvexa_cached_workspace', JSON.stringify(updatedWs));
        }
      } catch {}
      window.dispatchEvent(
        new CustomEvent('workspace-updated', { detail: { enabledModules: nextModules } }),
      );
    }
  };

  // Handler 2: Apply Profile Layout
  const handleApplyPreset = async (profileId: string) => {
    let presetModules = [
      'people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'leave', 'approvals', 'quality', 'sla', 'clients', 'billing', 'payroll'
    ];
    if (profileId === 'CORE_OPS') {
      presetModules = ['people', 'work_queue', 'quality', 'sla', 'time', 'attendance', 'leave', 'approvals'];
    } else if (profileId === 'PROJECTS_DELIVERY') {
      presetModules = ['people', 'projects', 'tasks', 'time', 'clients', 'approvals'];
    } else if (profileId === 'LEAN_SERVICES') {
      presetModules = ['people', 'projects', 'tasks', 'approvals', 'time', 'billing', 'payroll'];
    }

    setBusinessType(profileId);
    setEnabledModules(presetModules);

    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          businessType: profileId,
          settings: { enabledModules: presetModules },
        }),
      });
      if (!res.ok) throw new Error('Failed to apply operational profile');
      syncCachedWorkspaceModules(presetModules);
      toast.success(`Applied ${profileId} operational profile!`);
    } catch (err: any) {
      toast.error(err?.message || 'Error applying operational profile');
    }
  };

  // Handler 3: Save Module Entitlements
  const enabledModulesRef = React.useRef<string[]>(enabledModules);
  useEffect(() => {
    enabledModulesRef.current = enabledModules;
  }, [enabledModules]);

  const handleSaveModules = async (overrideModules?: string[]) => {
    const modulesToSave = overrideModules || enabledModulesRef.current || enabledModules;
    setSavingModules(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          settings: { enabledModules: modulesToSave },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update modules');

      syncCachedWorkspaceModules(modulesToSave);
      toast.success('Workspace module entitlements updated!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving modules');
    } finally {
      setSavingModules(false);
    }
  };

  const toggleModule = (modKey: string) => {
    const base = enabledModulesRef.current;
    const next = base.includes(modKey) ? base.filter((m) => m !== modKey) : [...base, modKey];
    enabledModulesRef.current = next;
    setEnabledModules(next);
    syncCachedWorkspaceModules(next);
  };

  const handleInstantToggleModule = async (modKey: string) => {
    const base = enabledModulesRef.current;
    const next = base.includes(modKey)
      ? base.filter((m) => m !== modKey)
      : [...base, modKey];
    enabledModulesRef.current = next;
    setEnabledModules(next);
    syncCachedWorkspaceModules(next);
    await handleSaveModules(next);
  };

  const handleUpdateNotifPrefs = async (patch: Partial<NotificationPrefs>) => {
    const uid = userProfile?.id;
    const next = saveNotificationPrefs(patch, uid);
    setNotifPrefs(next);
    try {
      await fetch(`${BRANDING.apiUrl}/notifications/preferences`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          browserPushNotifications: next.desktopNotificationsEnabled,
          soundEnabled: next.soundEnabled,
          soundType: next.soundType,
          soundVolume: next.soundVolume,
          taskSoundEnabled: next.taskSoundEnabled,
          chatSoundEnabled: next.chatSoundEnabled,
        }),
      });
      toast.success('Notification & sound preferences saved');
    } catch {}
  };

  const handleUpdateShareLink = async (patch: {
    enabled?: boolean;
    regenerate?: boolean;
    defaultRoleId?: string | null;
    defaultDepartmentId?: string | null;
    defaultTeamId?: string | null;
    defaultDesignationTitle?: string | null;
    defaultDataScope?: string;
  }) => {
    setSavingShareLink(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/invite-link`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(patch),
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(raw?.message || 'Failed to update invite link');
      const data = raw?.data !== undefined ? raw.data : raw;
      setShareInviteLink(data);
      toast.success(
        patch.regenerate
          ? 'Generated a fresh workspace invite link!'
          : 'Shareable invite link settings updated.',
      );
    } catch (err: any) {
      toast.error(err?.message || 'Could not update shareable invite link');
    } finally {
      setSavingShareLink(false);
    }
  };

  const resolvePublicJoinUrl = () => {
    const code = shareInviteLink?.code;
    if (!code) return shareInviteLink?.joinUrl || '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join?code=${code}`;
    }
    return shareInviteLink?.joinUrl || '';
  };

  const buildGmailInviteHref = () => {
    const joinUrl = resolvePublicJoinUrl();
    const orgName = name || workspace?.name || 'our Orvexa workspace';
    const subject = encodeURIComponent(`Join ${orgName} on Orvexa`);
    const body = encodeURIComponent(
      `Hi,\n\nYou're invited to join ${orgName} on Orvexa.\n\nUse this workspace invite link to create or link your account and set up your profile:\n${joinUrl}\n\nLooking forward to working together!`,
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  };

  // Helper: Resolve effective catalog & permission IDs for a role
  const effectiveCatalog = allPermissions.length > 0 ? allPermissions : DEFAULT_PERMISSIONS_CATALOG;

  const extractRolePermissionIds = (role: any): string[] => {
    if (!role) return [];
    const ids = new Set<string>();
    for (const p of role.permissions || []) {
      const code = p?.permission?.code || p?.code || (typeof p === 'string' && p.includes(':') ? p : '');
      const pid = p?.permissionId || p?.permission?.id || p?.id;
      const matched = effectiveCatalog.find((c) => (code && c.code === code) || (pid && c.id === pid));
      if (matched) ids.add(matched.id);
      else if (pid) ids.add(pid);
    }
    return Array.from(ids);
  };

  const resolveRoleDataScope = (role: any): string => {
    if (!role) return 'GLOBAL';
    if (role.name === 'OWNER') return 'GLOBAL';
    if (role.dataScope) return role.dataScope;
    const configured = workspace?.settings?.roleDataScopes?.[role.id];
    if (configured) return configured;
    if (role.name === 'ADMIN') return 'GLOBAL';
    if (role.name === 'MANAGER') return 'TEAM';
    if (role.name === 'MEMBER') return 'OWN';
    return 'DEPARTMENT';
  };

  const resolveRoleScopedTeams = (role: any): string[] => {
    if (!role) return [];
    if (Array.isArray(role.scopedTeamIds)) return role.scopedTeamIds;
    const configured = workspace?.settings?.roleScopedTeams?.[role.id];
    return Array.isArray(configured) ? configured : [];
  };

  useEffect(() => {
    const role = roles.find((r) => r.id === selectedRoleId) || roles[0];
    if (role) {
      setDraftRolePermIds(extractRolePermissionIds(role));
      setDraftRoleDataScope(resolveRoleDataScope(role));
      setDraftRoleScopedTeamIds(resolveRoleScopedTeams(role));
      setRolePermsDirty(false);
    }
  }, [selectedRoleId, roles.length, workspace?.id]);

  useEffect(() => {
    if (activeTab !== 'roles' || roleRightTab !== 'members' || !selectedRoleId) return;
    setLoadingRoleMembers(true);
    fetch(`${BRANDING.apiUrl}/roles/${selectedRoleId}/members`, { headers: getHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const list = res?.data !== undefined ? res.data : res;
        if (Array.isArray(list)) {
          setRoleMembers(list);
        } else {
          setRoleMembers(directoryMembers.filter((m: any) => m.roleId === selectedRoleId || m.role?.id === selectedRoleId));
        }
      })
      .catch(() => {
        setRoleMembers(directoryMembers.filter((m: any) => m.roleId === selectedRoleId || m.role?.id === selectedRoleId));
      })
      .finally(() => setLoadingRoleMembers(false));
  }, [activeTab, roleRightTab, selectedRoleId]);

  // Handler 4: Create Custom Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim(),
          copyFromRoleId: newRoleCopyFromId || undefined,
          dataScope: newRoleDataScope,
          scopedTeamIds: newRoleDataScope === 'TEAM' ? newRoleScopedTeamIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to create role');
      const newRole = data.data !== undefined ? data.data : data;
      toast.success(`Custom role "${newRole.name}" created!`);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleCopyFromId('');
      setNewRoleScopedTeamIds([]);
      setShowCreateRoleModal(false);
      await loadAllData();
      if (newRole?.id) {
        setSelectedRoleId(newRole.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating role');
    } finally {
      setCreatingRole(false);
    }
  };

  // Handler 5: Draft Toggle Role Permission with Dependency Rules + Save Changes
  const handleToggleDraftPermission = (permId: string) => {
    const targetPerm = effectiveCatalog.find((p) => p.id === permId || p.code === permId);
    const actualId = targetPerm?.id || permId;
    const isChecked = draftRolePermIds.includes(actualId);
    const dependencyGroups = ['assets', 'inventory', 'ledger', 'documents'];
    const targetCode = targetPerm?.code || '';
    const [targetGroup] = targetCode.split(':');

    let next: string[];
    if (isChecked) {
      if (dependencyGroups.includes(targetGroup) && targetCode === `${targetGroup}:view`) {
        const groupIds = effectiveCatalog
          .filter((p) => p.code.startsWith(`${targetGroup}:`))
          .map((p) => p.id);
        next = draftRolePermIds.filter((id) => !groupIds.includes(id));
      } else {
        next = draftRolePermIds.filter((id) => id !== actualId);
      }
    } else {
      next = [...draftRolePermIds, actualId];
      if (dependencyGroups.includes(targetGroup) && targetCode !== `${targetGroup}:view`) {
        const viewPerm = effectiveCatalog.find((p) => p.code === `${targetGroup}:view`);
        if (viewPerm && !next.includes(viewPerm.id)) {
          next.push(viewPerm.id);
        }
      }
    }
    setDraftRolePermIds(next);
    setRolePermsDirty(true);
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleObj || selectedRoleObj.name === 'OWNER') return;
    setSavingRolePerms(true);
    const effectiveScopedTeams = draftRoleDataScope === 'TEAM' ? draftRoleScopedTeamIds : [];
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${selectedRoleObj.id}/permissions`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          permissionIds: draftRolePermIds,
          dataScope: draftRoleDataScope,
          scopedTeamIds: effectiveScopedTeams,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to save role permissions');

      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleObj.id
            ? {
                ...r,
                dataScope: draftRoleDataScope,
                scopedTeamIds: effectiveScopedTeams,
                permissions: draftRolePermIds.map((id) => {
                  const found = effectiveCatalog.find((c) => c.id === id);
                  return { permissionId: id, code: found?.code, permission: found };
                }),
              }
            : r,
        ),
      );
      setWorkspace((prev: any) =>
        prev
          ? {
              ...prev,
              settings: {
                ...(prev.settings || {}),
                roleDataScopes: {
                  ...(prev.settings?.roleDataScopes || {}),
                  [selectedRoleObj.id]: draftRoleDataScope,
                },
                roleScopedTeams: {
                  ...(prev.settings?.roleScopedTeams || {}),
                  [selectedRoleObj.id]: effectiveScopedTeams,
                },
              },
            }
          : prev,
      );
      setRolePermsDirty(false);
      window.dispatchEvent(new CustomEvent('workspace-updated'));
      toast.success(`Saved permissions & data scope for ${selectedRoleObj.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Error saving role permissions');
    } finally {
      setSavingRolePerms(false);
    }
  };

  const handleCopyFromRole = (sourceRoleId: string) => {
    const source = roles.find((r) => r.id === sourceRoleId);
    if (!source) return;
    setDraftRolePermIds(extractRolePermissionIds(source));
    setDraftRoleDataScope(resolveRoleDataScope(source));
    setDraftRoleScopedTeamIds(resolveRoleScopedTeams(source));
    setRolePermsDirty(true);
    setCopyFromMenuOpen(false);
    toast.info(`Copied permissions from ${source.name}. Click "Save Changes" to apply.`);
  };

  const handleResetRolePermissions = async () => {
    if (!selectedRoleObj) return;
    if (rolePermsDirty && !selectedRoleObj.isSystemRole) {
      setDraftRolePermIds(extractRolePermissionIds(selectedRoleObj));
      setDraftRoleDataScope(resolveRoleDataScope(selectedRoleObj));
      setDraftRoleScopedTeamIds(resolveRoleScopedTeams(selectedRoleObj));
      setRolePermsDirty(false);
      toast.info('Reverted unsaved changes');
      return;
    }
    setResettingRole(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${selectedRoleObj.id}/reset`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to reset role');
      await loadAllData();
      setRolePermsDirty(false);
      toast.success(`Reset ${selectedRoleObj.name} to default configuration`);
    } catch (err: any) {
      toast.error(err.message || 'Error resetting role');
    } finally {
      setResettingRole(false);
    }
  };

  // Handler 5b: Rename & Configure Custom Role
  const handleRenameRole = async (roleId: string) => {
    if (!editRoleName.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ name: editRoleName.trim(), description: editRoleDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update role');
      const updatedRole = data?.data !== undefined ? data.data : data;
      toast.success('Role updated successfully');
      setRoles(roles.map((r) => (r.id === roleId ? { ...r, ...updatedRole } : r)));
      setEditingRoleId(null);
    } catch (err: any) {
      toast.error(err.message || 'Error updating role');
    }
  };

  // Handler 5c: Deactivate Custom Role
  const handleDeactivateRole = async (roleId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}/deactivate`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to deactivate role');
      toast.success(data.message || 'Role deactivated');
      setRoles(roles.map((r) => (r.id === roleId ? { ...r, isActive: false } : r)));
    } catch (err: any) {
      toast.error(err.message || 'Error deactivating role');
    }
  };

  // Handler 5d: Reactivate Custom Role
  const handleReactivateRole = async (roleId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}/reactivate`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reactivate role');
      toast.success(data.message || 'Role reactivated');
      setRoles(roles.map((r) => (r.id === roleId ? { ...r, isActive: true } : r)));
    } catch (err: any) {
      toast.error(err.message || 'Error reactivating role');
    }
  };

  // Handler 5e: Delete Custom Role with Safe Member Migration
  const handleDeleteRole = async (roleId: string) => {
    try {
      const queryParam = deleteReassignRoleId ? `?reassignRoleId=${deleteReassignRoleId}` : '';
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}${queryParam}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete role');
      toast.success(data.message || 'Role deleted');
      setRoles(roles.filter((r) => r.id !== roleId));
      setDeletingRoleId(null);
      setDeleteReassignRoleId('');
      if (selectedRoleId === roleId && roles.length > 1) {
        setSelectedRoleId(roles.find((r) => r.id !== roleId)?.id || null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting role');
    }
  };

  // Handler 5f: Access Diagnostics & Effective Permissions Inspector
  const handleRunDiagnostic = async () => {
    if (!selectedDiagnosticMemberId) {
      toast.error('Select a team member to diagnose');
      return;
    }
    setDiagnosingAccess(true);
    try {
      const query = `membershipId=${selectedDiagnosticMemberId}&permission=${encodeURIComponent(diagnosticPermissionToTest)}`;
      const res = await fetch(`${BRANDING.apiUrl}/roles/diagnose?${query}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Diagnostics failed');
      const payload = data.data !== undefined ? data.data : data;
      setDiagnosticResult(payload);
      toast.success('Access diagnostic evaluation complete');
    } catch (err: any) {
      toast.error(err.message || 'Error running diagnostic');
    } finally {
      setDiagnosingAccess(false);
    }
  };

  // Handler 6: Create Department
  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/departments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: newDeptName.trim(), code: newDeptCode.trim() }),
      });
      if (!res.ok) throw new Error('Failed to add department');
      const data = await res.json();
      const newDept = data.data !== undefined ? data.data : data;
      setDepartments([...departments, newDept]);
      setNewDeptName('');
      setNewDeptCode('');
      toast.success('Department created');
    } catch (err: any) {
      toast.error(err.message || 'Error creating department');
    }
  };

  const handleDeleteDept = async (id: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/departments/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to delete department');
      setDepartments(departments.filter((d) => (d.id || d.data?.id) !== id));
      if (editingDeptId === id) cancelEditDept();
      toast.success('Department deleted');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting department');
    }
  };

  const startEditDept = (dept: any) => {
    setEditingDeptId(dept.id);
    setEditDeptName(dept.name || '');
    setEditDeptCode(dept.code || '');
  };

  const cancelEditDept = () => {
    setEditingDeptId(null);
    setEditDeptName('');
    setEditDeptCode('');
  };

  const handleSaveDept = async (id: string) => {
    if (!editDeptName.trim()) {
      toast.error('Department Name is required');
      return;
    }
    setSavingDept(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/departments/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          name: editDeptName.trim(),
          code: editDeptCode.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update department');
      const data = await res.json();
      const updated = data.data !== undefined ? data.data : data;
      setDepartments((prev) =>
        prev.map((d) => {
          const did = d.id || d.data?.id;
          if (did === id) {
            return {
              ...(d.data !== undefined ? d.data : d),
              name: editDeptName.trim(),
              code: editDeptCode.trim(),
              ...(updated && typeof updated === 'object' ? updated : {}),
            };
          }
          return d;
        })
      );
      cancelEditDept();
      toast.success('Department updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error updating department');
    } finally {
      setSavingDept(false);
    }
  };

  // Handler 7: Create Team
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/teams`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: newTeamName.trim(),
          departmentId: newTeamDeptId || undefined,
          leadMembershipId: newTeamLeadId || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add team');
      const data = await res.json();
      const newTeam = data.data !== undefined ? data.data : data;
      const matchingDept = departments.find((d) => (d.id || d.data?.id) === newTeamDeptId);
      const matchingLead = directoryMembers.find((m) => m.id === newTeamLeadId);
      setTeams([
        ...teams,
        {
          ...newTeam,
          department: newTeam.department || (matchingDept ? (matchingDept.data !== undefined ? matchingDept.data : matchingDept) : undefined),
          leadMembership: newTeam.leadMembership || matchingLead || undefined,
        },
      ]);
      setNewTeamName('');
      setNewTeamLeadId('');
      toast.success('Team created');
    } catch (err: any) {
      toast.error(err.message || 'Error creating team');
    }
  };

  const handleDeleteTeam = async (id: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/teams/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to delete team');
      setTeams(teams.filter((t) => (t.id || t.data?.id) !== id));
      if (editingTeamId === id) cancelEditTeam();
      toast.success('Team deleted');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting team');
    }
  };

  const startEditTeam = (team: any) => {
    setEditingTeamId(team.id);
    setEditTeamName(team.name || '');
    setEditTeamDeptId(team.departmentId || team.department?.id || '');
    setEditTeamLeadId(team.leadMembershipId || team.leadMembership?.id || '');
  };

  const cancelEditTeam = () => {
    setEditingTeamId(null);
    setEditTeamName('');
    setEditTeamDeptId('');
    setEditTeamLeadId('');
  };

  const handleSaveTeam = async (id: string) => {
    if (!editTeamName.trim()) {
      toast.error('Team Name is required');
      return;
    }
    setSavingTeam(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/teams/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          name: editTeamName.trim(),
          departmentId: editTeamDeptId || null,
          leadMembershipId: editTeamLeadId || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update team');
      const data = await res.json();
      const updated = data.data !== undefined ? data.data : data;
      const matchingDept = departments.find((d) => (d.id || d.data?.id) === editTeamDeptId);
      const matchingLead = directoryMembers.find((m) => m.id === editTeamLeadId);
      setTeams((prev) =>
        prev.map((t) => {
          const tid = t.id || t.data?.id;
          if (tid === id) {
            return {
              ...(t.data !== undefined ? t.data : t),
              name: editTeamName.trim(),
              departmentId: editTeamDeptId || null,
              leadMembershipId: editTeamLeadId || null,
              department: matchingDept ? (matchingDept.data !== undefined ? matchingDept.data : matchingDept) : null,
              leadMembership: matchingLead || null,
              ...(updated && typeof updated === 'object' ? updated : {}),
            };
          }
          return t;
        })
      );
      cancelEditTeam();
      toast.success('Team updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error updating team');
    } finally {
      setSavingTeam(false);
    }
  };

  // Handler 8: Create & Configure Designation with Permissions & Role Mapping
  const handleAddDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesigTitle.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/designations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: newDesigTitle.trim(),
          level: Number(newDesigLevel) || 1,
          departmentId: newDesigDeptId || undefined,
          defaultAccessRole: newDesigAccessRole,
          defaultDataScope: newDesigDataScope,
          permissionCodes: newDesigPerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to add designation');
      const newDesig = data.data !== undefined ? data.data : data;
      setDesignations([...designations, newDesig]);
      setNewDesigTitle('');
      setNewDesigLevel(1);
      setNewDesigDeptId('');
      setNewDesigAccessRole('MEMBER');
      setNewDesigDataScope('OWN');
      setNewDesigPerms([]);
      setShowDesigConfigModal(false);
      await loadAllData();
      toast.success('Designation and permission profile created!');
    } catch (err: any) {
      toast.error(err.message || 'Error creating designation');
    }
  };

  const handleDeleteDesig = async (id: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/designations/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to delete designation');
      setDesignations(designations.filter((d) => (d.id || d.data?.id) !== id));
      if (editingDesigId === id) cancelEditDesig();
      toast.success('Designation deleted');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting designation');
    }
  };

  const startEditDesig = (desig: any) => {
    setEditingDesigId(desig.id);
    setEditDesigTitle(desig.title || '');
    setEditDesigLevel(desig.level || 1);
    setEditDesigDeptId(desig.departmentId || '');
    setEditDesigAccessRole((desig.defaultAccessRole as any) || 'MEMBER');
    setEditDesigDataScope((desig.defaultDataScope as any) || 'OWN');
    setEditDesigPerms(Array.isArray(desig.permissionCodes) ? desig.permissionCodes : []);
  };

  const cancelEditDesig = () => {
    setEditingDesigId(null);
    setEditDesigTitle('');
    setEditDesigLevel(1);
    setEditDesigDeptId('');
    setEditDesigAccessRole('MEMBER');
    setEditDesigDataScope('OWN');
    setEditDesigPerms([]);
  };

  const handleSaveDesig = async (id: string) => {
    if (!editDesigTitle.trim()) {
      toast.error('Designation Title is required');
      return;
    }
    setSavingDesig(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/designations/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          title: editDesigTitle.trim(),
          level: Number(editDesigLevel) || 1,
          departmentId: editDesigDeptId || undefined,
          defaultAccessRole: editDesigAccessRole,
          defaultDataScope: editDesigDataScope,
          permissionCodes: editDesigPerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to update designation');
      cancelEditDesig();
      await loadAllData();
      toast.success('Designation & permissions updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error updating designation');
    } finally {
      setSavingDesig(false);
    }
  };

  // Handler 9: Upgrade Plan via Razorpay
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/subscriptions/checkout`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ planId, billingCycle }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment initiation failed');

      const orderInfo = data.data !== undefined ? data.data : data;

      const loaded = await loadRazorpayScript();
      if (!loaded || !(window as any).Razorpay) {
        toast.error('Unable to load Razorpay checkout script. Please check your network connection.');
        setUpgradingPlanId(null);
        return;
      }

      const options = {
        key: orderInfo.keyId,
        amount: orderInfo.amount,
        currency: orderInfo.currency || 'INR',
        name: BRANDING.name || 'ORVEXA',
        description: `Upgrade to ${orderInfo.plan?.name || 'Plan'} (${billingCycle === 'yearly' ? 'Annual' : 'Monthly'})`,
        order_id: orderInfo.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${BRANDING.apiUrl}/subscriptions/verify`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message || 'Payment signature verification failed');

            toast.success(`Plan upgraded successfully to ${orderInfo.plan?.name || 'new plan'}!`);
            await loadAllData();
          } catch (vErr: any) {
            toast.error(vErr.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: workspace?.name,
        },
        theme: {
          color: '#4f46e5',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        toast.error(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? Your workspace will remain active until the end of your billing cycle. Customer data is permanently preserved.',
      )
    ) {
      return;
    }
    setCancellingSub(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/subscriptions/cancel`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel subscription');
      toast.success(data.message || 'Subscription cancelled successfully');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling subscription');
    } finally {
      setCancellingSub(false);
    }
  };

  // Handler 10: Start MFA Enrollment
  const handleStartEnrollMfa = async () => {
    setEnrollingMfa(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/mfa/enroll`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to initialize 2FA enrollment');
      const payload = data.data !== undefined ? data.data : data;
      setMfaEnrollData(payload);
      toast.success('2FA enrollment generated. Scan or enter the key into your authenticator app.');
    } catch (err: any) {
      toast.error(err.message || 'Error initializing 2FA');
      setEnrollingMfa(false);
    }
  };

  // Handler 11: Confirm MFA Enrollment
  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setConfirmingMfa(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/mfa/confirm-enrollment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ code: mfaCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid verification code');

      toast.success('Two-factor authentication successfully enabled on your account!');
      setUserProfile((prev: any) => ({ ...prev, mfaEnabled: true }));
      setEnrollingMfa(false);
      setMfaEnrollData(null);
      setMfaCode('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify 2FA code');
    } finally {
      setConfirmingMfa(false);
    }
  };

  // Handler 12: Disable MFA
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableCode.trim()) {
      toast.error('Both password and verification/recovery code are required to disable 2FA.');
      return;
    }
    setDisablingMfa(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/mfa/disable`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ password: disablePassword, code: disableCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to disable 2FA');

      toast.success('Two-factor authentication disabled.');
      setUserProfile((prev: any) => ({ ...prev, mfaEnabled: false }));
      setShowDisableMfa(false);
      setDisablePassword('');
      setDisableCode('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA');
    } finally {
      setDisablingMfa(false);
    }
  };

  // Handler 13: Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handler 14: Admin Reset 2FA for Member
  const handleAdminResetMfa = async (targetUserId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to reset 2FA for ${memberEmail}? Their second factor will be removed and their active sessions revoked.`)) {
      return;
    }
    setResettingMfaUserId(targetUserId);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/admin/reset-mfa/${targetUserId}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset member 2FA');

      toast.success(`2FA reset and sessions revoked for ${memberEmail}`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error resetting 2FA for member');
    } finally {
      setResettingMfaUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center space-x-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading Workspace Settings...</span>
      </div>
    );
  }

  // Modules metadata
  const allModulesList = [
    { key: 'people', name: 'People & Org', icon: Users, desc: 'Employee records, memberships, designations, and reporting hierarchy.' },
    { key: 'projects', name: 'Work Projects', icon: Briefcase, desc: 'Project planning, stages, milestones, and deliverable tracking.' },
    { key: 'tasks', name: 'Tasks & Sprints', icon: CheckCircle2, desc: 'Task assignments, priority flags, deadlines, and board views.' },
    { key: 'work_queue', name: 'Work Queue Engine', icon: LayoutGrid, desc: 'Operational processing pipelines, ticket batches, rework loops, and auto-assignment.' },
    { key: 'time', name: 'Time Tracking', icon: Clock, desc: 'Timer logs, billable hours, timesheets, and activity tracking.' },
    { key: 'attendance', name: 'Attendance & Shifts', icon: Calendar, desc: 'Clock-in/out, shift schedules, break logs, and overtime rules.' },
    { key: 'leave', name: 'Leave & PTO', icon: UserCheck, desc: 'Leave requests, balance tracking, PTO policies, and approval flows.' },
    { key: 'approvals', name: 'Approvals Engine', icon: FileCheck, desc: 'Multi-level document, budget, leave, and operational approval chains.' },
    { key: 'quality', name: 'Quality Audit', icon: Award, desc: 'Sampling rates, auditing scorecards, pass/fail thresholds, and QA logs.' },
    { key: 'sla', name: 'SLA & Escalations', icon: Sliders, desc: 'Turnaround deadlines, breach warnings, and automatic supervisor alerts.' },
    { key: 'clients', name: 'Client Portal', icon: Building2, desc: 'Client account management, external portal access, and contracts.' },
    { key: 'billing', name: 'Invoicing & Billing', icon: DollarSign, desc: 'Service billing, payment tracking, and financial summary reports.' },
    { key: 'assets', name: 'Assets, Inventory & Docs', icon: Package, desc: 'Company hardware and asset tracking, stock inventory, movements ledger, and document vault.' },
    { key: 'payroll', name: 'Payroll & Compensation', icon: CreditCard, desc: 'Payroll cycles, salary slips, statutory deductions, and permission-gated payouts.' },
  ];

  const selectedRoleObj =
    roles.find((r) => r.id === selectedRoleId) ||
    roles.find((r) => r.name === 'ADMIN') ||
    roles[0];

  const allMembersList: any[] =
    directoryMembers && directoryMembers.length > 0
      ? directoryMembers
      : workspace?.memberships || [];

  const getRoleMemberCount = (role: any) => {
    const matched = allMembersList.filter(
      (m: any) =>
        m.roleId === role.id ||
        m.role?.id === role.id ||
        (!m.roleId && m.accessRole === role.name),
    ).length;
    return Math.max(matched, role?._count?.memberships || 0);
  };

  const formatRoleDisplayName = (roleName: string) => {
    if (!roleName) return 'Role';
    const upper = roleName.toUpperCase();
    if (upper === 'ADMIN') return 'Admin';
    /* LEGACY_ROLE_COMMENTED_OUT:
    if (upper === 'MANAGER') return 'Manager';
    if (upper === 'MEMBER') return 'Member';
    */
    if (upper === 'MANAGER') return 'Staff Lead (Legacy)';
    if (upper === 'MEMBER') return 'Staff';
    if (upper === 'OWNER') return 'Owner';
    return roleName;
  };

  const overviewModulesSubset = allModulesList.filter((m) =>
    ['people', 'projects', 'tasks', 'time', 'attendance', 'leave', 'approvals', 'work_queue', 'payroll', 'assets'].includes(m.key),
  );
  const enabledCountTotal = allModulesList.filter((m) => enabledModules.includes(m.key)).length;

  const catalogModuleNames = Array.from(new Set(effectiveCatalog.map((p) => p.module || 'General'))).sort(
    (a, b) => {
      const orderA = MODULE_DISPLAY_ORDER[a] ?? 99;
      const orderB = MODULE_DISPLAY_ORDER[b] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    },
  );

  const selectedRoleMemberCount = selectedRoleObj ? getRoleMemberCount(selectedRoleObj) : 0;

  return (
    <div className="space-y-6">
      {/* Workspace Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure your workspace modules, organization structure, and access control.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
            Workspace ID: {wsId?.slice(0, 8)}...
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-background text-primary border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Overview
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'modules'
              ? 'bg-background text-primary border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Modules & Features
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'structure'
              ? 'bg-background text-primary border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Network className="h-3.5 w-3.5" /> Organization Structure
        </button>
        {canManageRoles && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === 'roles'
                ? 'bg-background text-primary border border-border shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Shield className="h-3.5 w-3.5" /> Roles & Permissions
          </button>
        )}
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'details'
              ? 'bg-background text-primary border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" /> Organization Details
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'personal' || activeTab === 'profile'
              ? 'bg-background text-primary border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <User className="h-3.5 w-3.5" /> Personal & Alerts
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'billing'
              ? 'bg-background text-primary border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" /> Subscription & Billing
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-background text-primary border border-border shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" /> Security & 2FA
        </button>
      </div>

      {/* TAB 0: Overview (3-Card Dashboard) */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Card 1: Modules & Features */}
            <Card className="border-border flex flex-col justify-between shadow-xs">
              <div>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Modules & Features</CardTitle>
                      <CardDescription className="text-xs mt-0.5 leading-snug">
                        Enable or disable operational modules for your workspace.
                      </CardDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('modules')}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60"
                    title="Manage all modules"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </CardHeader>
                <CardContent className="pt-1 space-y-2 max-h-[380px] overflow-y-auto">
                  {overviewModulesSubset.map((mod) => {
                    const Icon = mod.icon;
                    const isOn = enabledModules.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${isOn ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-foreground truncate">{mod.name}</span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          disabled={savingModules}
                          onClick={() => handleInstantToggleModule(mod.key)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            isOn ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              isOn ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </CardContent>
              </div>
              <CardFooter className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {enabledCountTotal} of {allModulesList.length} modules enabled
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('modules')}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  Manage Modules <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </CardFooter>
            </Card>

            {/* Card 2: Organization Structure */}
            <Card className="border-border flex flex-col justify-between shadow-xs">
              <div>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Network className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Organization Structure</CardTitle>
                      <CardDescription className="text-xs mt-0.5 leading-snug">
                        Manage departments, teams, designations and member assignments.
                      </CardDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('structure')}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60"
                    title="Manage structure"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </CardHeader>
                <CardContent className="pt-1 space-y-2 max-h-[380px] overflow-y-auto">
                  {departments.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                      <Folder className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                      <p>No departments added yet.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('structure')}
                        className="text-blue-600 font-semibold mt-1 hover:underline"
                      >
                        Create Departments & Teams →
                      </button>
                    </div>
                  ) : (
                    departments.map((rawDept) => {
                      const dept = rawDept?.data !== undefined ? rawDept.data : rawDept;
                      const deptTeams = teams.filter(
                        (rawT) => (rawT.departmentId || rawT.department?.id) === dept.id,
                      );
                      const deptMembers = allMembersList.filter(
                        (m: any) => (m.departmentId || m.department?.id) === dept.id,
                      );
                      const isDeptOpen = !!expandedOverviewDepts[dept.id];
                      return (
                        <div key={dept.id} className="rounded-lg border border-border/80 bg-card overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOverviewDepts((prev) => ({ ...prev, [dept.id]: !prev[dept.id] }))
                            }
                            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2 font-semibold text-foreground min-w-0">
                              <div className="h-6 w-6 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                <Folder className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate">{dept.name}</span>
                              <span className="text-muted-foreground font-normal">({deptMembers.length})</span>
                            </div>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                                isDeptOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isDeptOpen && (
                            <div className="px-3 pb-2.5 pt-1 space-y-1.5 bg-muted/10 border-t border-border/50">
                              {deptTeams.map((rawTeam) => {
                                const team = rawTeam?.data !== undefined ? rawTeam.data : rawTeam;
                                const teamMembers = allMembersList.filter(
                                  (m: any) => (m.teamId || m.team?.id) === team.id,
                                );
                                const isTeamOpen = !!expandedOverviewTeams[team.id];
                                return (
                                  <div key={team.id} className="rounded-md border border-border/60 bg-background">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedOverviewTeams((prev) => ({
                                          ...prev,
                                          [team.id]: !prev[team.id],
                                        }))
                                      }
                                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-muted/20"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                        <span className="font-semibold text-foreground truncate">{team.name}</span>
                                        <span className="text-muted-foreground text-[11px]">({teamMembers.length})</span>
                                      </div>
                                      <ChevronDown
                                        className={`h-3 w-3 text-muted-foreground transition-transform ${
                                          isTeamOpen ? 'rotate-180' : ''
                                        }`}
                                      />
                                    </button>
                                    {isTeamOpen && (
                                      <div className="px-2.5 pb-2 pt-1 space-y-1 border-t border-border/40">
                                        {teamMembers.length === 0 ? (
                                          <p className="text-[11px] text-muted-foreground italic py-1 pl-4">
                                            No members assigned yet
                                          </p>
                                        ) : (
                                          teamMembers.map((m: any) => {
                                            const fullName =
                                              [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') ||
                                              m.user?.email ||
                                              'Member';
                                            const desigLabel = m.designation?.title || m.role?.name || m.accessRole;
                                            const isLead =
                                              team.leadMembershipId === m.id ||
                                              m.accessRole === 'MANAGER' ||
                                              m.accessRole === 'ADMIN' ||
                                              m.accessRole === 'OWNER' ||
                                              (m.designation?.level || 0) >= 5 ||
                                              (m.designation?.title || '').toLowerCase().includes('lead');
                                            return (
                                              <div
                                                key={m.id}
                                                className="flex items-center justify-between gap-2 text-[11px] py-0.5 pl-1"
                                              >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  {isLead ? (
                                                    <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                  ) : (
                                                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                                  )}
                                                  <span className={`truncate ${isLead ? 'font-bold text-foreground' : 'text-foreground'}`}>
                                                    {fullName}
                                                  </span>
                                                  {desigLabel && (
                                                    <span className="text-muted-foreground truncate">— {desigLabel}</span>
                                                  )}
                                                </div>
                                                {isLead && (
                                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 shrink-0">
                                                    Lead
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Dept members without a team */}
                              {deptMembers.filter((m: any) => !m.teamId && !m.team?.id).length > 0 && (
                                <div className="pl-2 pt-1 space-y-1">
                                  {deptMembers
                                    .filter((m: any) => !m.teamId && !m.team?.id)
                                    .map((m: any) => (
                                      <div key={m.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <User className="h-3 w-3 shrink-0" />
                                        <span className="text-foreground font-medium">
                                          {[m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') || m.user?.email}
                                        </span>
                                        {m.designation?.title && <span>— {m.designation.title}</span>}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </div>
              <CardFooter className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  {departments.length} Departments • {teams.length} Teams • {allMembersList.length} Members
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('structure')}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  Manage Structure <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </CardFooter>
            </Card>

            {/* Card 3: Roles & Permissions */}
            <Card className="border-border flex flex-col justify-between shadow-xs">
              <div>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Roles & Permissions</CardTitle>
                      <CardDescription className="text-xs mt-0.5 leading-snug">
                        Create permission profiles and control access to modules and data.
                      </CardDescription>
                    </div>
                  </div>
                  {canManageRoles && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('roles')}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60"
                      title="Manage roles"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </CardHeader>
                <CardContent className="pt-1 space-y-2 max-h-[380px] overflow-y-auto">
                  {roles.map((r) => {
                    const memberCount = getRoleMemberCount(r);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          if (canManageRoles) {
                            setSelectedRoleId(r.id);
                            setActiveTab('roles');
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 hover:border-border transition-all text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {formatRoleDisplayName(r.name)}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {r.description || 'Workspace permission profile'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="h-6 min-w-6 px-1.5 rounded-md bg-muted text-foreground text-[11px] font-bold flex items-center justify-center">
                            {memberCount}
                          </span>
                          {canManageRoles && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </div>
              <CardFooter className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Users className="h-3.5 w-3.5" />
                  {roles.length} Roles • {allMembersList.length} Assigned Members
                </span>
                {canManageRoles && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('roles')}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    Manage Roles <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Post-Setup Team Invitation Quick Action Bar */}
          <Card className="border-border bg-gradient-to-r from-blue-500/5 via-card to-indigo-500/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    Invite & Configure Team Access After Setup
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Send single or bulk invitations with pre-configured departments, teams, designations, and role permissions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Link href="/app/people?invite=1">
                  <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Invite Member
                  </Button>
                </Link>
                <Link href="/app/people?bulkInvite=1">
                  <Button size="sm" className="text-xs h-8 gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Bulk Invite Team
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Shareable Workspace Link & Setup Wizard Launcher */}
          <div className="grid gap-5 lg:grid-cols-2">
            {canManageInvites && (
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Shareable Workspace Invite Link</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        Anyone joining with this link lands on Profile Setup first and gets placed automatically.
                      </CardDescription>
                    </div>
                  </div>
                  {shareInviteLink && (
                    <Badge variant={shareInviteLink.enabled !== false ? 'default' : 'secondary'} className="text-[10px]">
                      {shareInviteLink.enabled !== false ? 'Active' : 'Paused'}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={resolvePublicJoinUrl() || 'Generating link...'}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 rounded-md border border-input bg-muted/40 px-2.5 py-1.5 text-[11px] font-mono text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 shrink-0"
                      onClick={() => {
                        const url = resolvePublicJoinUrl();
                        if (!url) return;
                        navigator.clipboard.writeText(url).then(
                          () => toast.success('Workspace invite link copied!'),
                          () => toast.info(url),
                        );
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                    <a
                      href={buildGmailInviteHref()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 h-8 text-[11px] font-semibold text-blue-600 hover:bg-blue-500/20 shrink-0"
                    >
                      <Mail className="h-3.5 w-3.5" /> Gmail
                    </a>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Default Staff Role</label>
                      <select
                        value={shareInviteLink?.defaultRoleId || ''}
                        disabled={savingShareLink}
                        onChange={(e) => handleUpdateShareLink({ defaultRoleId: e.target.value || null })}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px]"
                      >
                        <option value="">Standard Staff</option>
                        {roles
                          .filter((r) => !r.isSystemRole)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Default Dept</label>
                      <select
                        value={shareInviteLink?.defaultDepartmentId || ''}
                        disabled={savingShareLink}
                        onChange={(e) => handleUpdateShareLink({ defaultDepartmentId: e.target.value || null })}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px]"
                      >
                        <option value="">General</option>
                        {departments.map((rawD) => {
                          const d = rawD.data !== undefined ? rawD.data : rawD;
                          return (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Default Team</label>
                      <select
                        value={shareInviteLink?.defaultTeamId || ''}
                        disabled={savingShareLink}
                        onChange={(e) => handleUpdateShareLink({ defaultTeamId: e.target.value || null })}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px]"
                      >
                        <option value="">None</option>
                        {teams.map((rawT) => {
                          const t = rawT.data !== undefined ? rawT.data : rawT;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Default Scope</label>
                      <select
                        value={shareInviteLink?.defaultDataScope || 'ASSIGNED'}
                        disabled={savingShareLink}
                        onChange={(e) => handleUpdateShareLink({ defaultDataScope: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px]"
                      >
                        {DATA_SCOPE_OPTIONS.filter(
                          (opt) => isOwnerOrAdmin || (DATA_SCOPE_ORDER_MAP[opt.key] ?? 1) <= actorDataScopeRank,
                        ).map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    disabled={savingShareLink}
                    onClick={() => handleUpdateShareLink({ enabled: shareInviteLink?.enabled === false })}
                    className="text-muted-foreground hover:text-foreground font-semibold"
                  >
                    {shareInviteLink?.enabled !== false ? 'Pause Invite Link' : 'Re-enable Invite Link'}
                  </button>
                  <button
                    type="button"
                    disabled={savingShareLink}
                    onClick={() => handleUpdateShareLink({ regenerate: true })}
                    className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Reset Code
                  </button>
                </CardFooter>
              </Card>
            )}

            <Card className="border-border shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Guided Organization Setup Wizard</CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">
                      Revisit industry recommendations, module presets, org structure, or step-by-step onboarding anytime.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Every feature, module, and staff role in Orvexa is customizable independently of your organization chart.
                </p>
              </CardContent>
              <CardFooter className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
                <Link href="/app/onboarding?stage=industries_size">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Re-run Recommendations
                  </Button>
                </Link>
                <Link href="/app/onboarding?mode=stepper">
                  <Button size="sm" className="h-8 text-xs gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Setup Stepper
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 1: Organization Details */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">General Organization Details</CardTitle>
              <CardDescription>Required organization metadata and regional settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Organization Name <span className="text-destructive font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Country <span className="text-destructive font-bold">*</span>
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="United States">United States</option>
                    <option value="India">India</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Timezone <span className="text-destructive font-bold">*</span>
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                    <option value="UTC+05:30 (India Standard Time)">UTC+05:30 (IST)</option>
                    <option value="UTC+00:00 (Greenwich Mean Time)">UTC+00:00 (GMT)</option>
                    <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                    <option value="UTC+08:00 (Singapore Standard Time)">UTC+08:00 (SGT)</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-border">
              <Button onClick={handleSaveDetails} disabled={savingDetails} size="sm">
                {savingDetails ? 'Saving...' : 'Save Organization Details'}
              </Button>
            </CardFooter>
          </Card>

          {/* Card: Common Holidays & Festivals Policy */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Common Holidays & Festivals</CardTitle>
                    <CardDescription className="text-xs">
                      Organization-wide recognized public holidays, regional festivals, and access controls
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-semibold text-[10px]">
                  Owner & Admin Controlled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 text-xs text-foreground space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Access Restricted to Admin and Owner Roles
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Only workspace Owners and Administrators have permission (<code className="bg-muted px-1 py-0.5 rounded font-mono text-[10px]">calendar:holidays:manage</code>) to configure company holidays and festivals. Regular team members and contributors see all approved holidays and festivals across the company calendar in view-only mode.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Operations Calendar Coverage
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Holidays and festivals appear directly on the unified Operations Calendar, respecting mandatory and optional observances for all shifts.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pre-Configured Common Festivals
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Quick presets are provided for Diwali, Pongal, Eid, Christmas, Tamil New Year, Republic Day, Independence Day, and custom holidays.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Configured in workspace settings and synced in real-time.
              </span>
              <Link href="/app/calendar?openHolidays=true">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Manage Calendar Holidays & Festivals
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* TAB: Personal Details */}
      {(activeTab === 'personal' || activeTab === 'profile') && (
        <div className="space-y-6 max-w-4xl">
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Personal Details</CardTitle>
                  <CardDescription className="text-xs">
                    Add your personal information and photo so your team recognizes you in the directory.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Profile Photo Section */}
              <div className="rounded-xl border border-border bg-surface-secondary/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Profile Photo
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Not mandatory
                    </Badge>
                  </div>
                  {personalAvatar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePersonalImage}
                      className="text-destructive hover:bg-destructive/10 h-7 text-xs gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="relative group shrink-0">
                    <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary/20 bg-surface-secondary flex items-center justify-center shadow-inner">
                      {personalAvatar ? (
                        <img
                          src={personalAvatar}
                          alt="Profile Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-2xl font-bold text-muted-foreground flex items-center justify-center h-full w-full bg-primary/10 text-primary">
                          {personalFirstName ? personalFirstName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <input
                      ref={personalFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handlePersonalImageSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => personalFileInputRef.current?.click()}
                      className="gap-2 text-xs font-semibold h-9"
                    >
                      <Upload className="h-3.5 w-3.5" /> Change Photo
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Optional. PNG, JPG or WEBP up to 5MB. You can always update or upload this later.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSavePersonalDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      First Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex"
                      value={personalFirstName}
                      onChange={(e) => setPersonalFirstName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mercer"
                      value={personalLastName}
                      onChange={(e) => setPersonalLastName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      Designation / Role
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Founder & CEO, Senior Engineer"
                      value={personalDesignation}
                      onChange={(e) => setPersonalDesignation(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Operating City / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru, India"
                    value={personalLocation}
                    onChange={(e) => setPersonalLocation(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">About / Short Bio</label>
                    <span className="text-[10px] text-muted-foreground">Optional</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="A brief intro about your role in the organization..."
                    value={personalBio}
                    onChange={(e) => setPersonalBio(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingPersonal}
                    className="gap-2 text-xs font-semibold"
                  >
                    {savingPersonal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Desktop Notifications & Sound Alert Configuration */}
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Desktop Notifications & Sound Preferences
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Personal per-user alert and audio chime settings for tasks and chat messages assigned to you.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Per-User Settings
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Chrome Desktop Permission */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-muted/20">
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span>Chrome / Browser Desktop Notifications</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        browserNotifPermission === 'granted'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : browserNotifPermission === 'denied'
                          ? 'bg-destructive/15 text-destructive'
                          : ''
                      }`}
                    >
                      {browserNotifPermission === 'granted'
                        ? 'Allowed'
                        : browserNotifPermission === 'denied'
                        ? 'Blocked in Browser'
                        : 'Not Enabled'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Receive real-time Chrome alerts when tasks, approvals, calendar invites, or chat messages target your account.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {browserNotifPermission !== 'granted' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={async () => {
                        const perm = await requestNotificationPermission();
                        setBrowserNotifPermission(perm);
                        if (perm === 'granted') {
                          handleUpdateNotifPrefs({ desktopNotificationsEnabled: true });
                        }
                      }}
                    >
                      Allow in Chrome
                    </Button>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifPrefs.desktopNotificationsEnabled}
                    onClick={() =>
                      handleUpdateNotifPrefs({
                        desktopNotificationsEnabled: !notifPrefs.desktopNotificationsEnabled,
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                      notifPrefs.desktopNotificationsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        notifPrefs.desktopNotificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Master Sound + Tone + Volume */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3.5 rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {notifPrefs.soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-blue-600" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-foreground">Alert Sound Effects</div>
                        <div className="text-[11px] text-muted-foreground">Play synthesized chime when alerts arrive</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs.soundEnabled}
                      onClick={() => handleUpdateNotifPrefs({ soundEnabled: !notifPrefs.soundEnabled })}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                        notifPrefs.soundEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          notifPrefs.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center pt-1">
                    <select
                      value={notifPrefs.soundType}
                      disabled={!notifPrefs.soundEnabled}
                      onChange={(e) =>
                        handleUpdateNotifPrefs({ soundType: e.target.value as NotificationSoundType })
                      }
                      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                    >
                      <option value="chime">Chime (Warm Two-Tone)</option>
                      <option value="bell">Bell (Crisp Ring)</option>
                      <option value="pop">Pop (Soft Ping)</option>
                      <option value="subtle">Subtle (Soft Tone)</option>
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1"
                      onClick={() => testNotificationSound(notifPrefs.soundType, notifPrefs.soundVolume)}
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Test Sound
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Volume</span>
                      <span className="font-mono">{Math.round((notifPrefs.soundVolume || 0.7) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      disabled={!notifPrefs.soundEnabled}
                      value={notifPrefs.soundVolume}
                      onChange={(e) => handleUpdateNotifPrefs({ soundVolume: Number(e.target.value) })}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>

                {/* Per-Category Sound Toggles */}
                <div className="p-3.5 rounded-lg border border-border space-y-3">
                  <div className="text-xs font-semibold text-foreground">Category Sound Triggers</div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                    <div>
                      <div className="text-xs font-medium text-foreground">Tasks, Work Items & Calendar Alerts</div>
                      <div className="text-[11px] text-muted-foreground">Chime when a task or event is assigned to you</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs.taskSoundEnabled}
                      onClick={() =>
                        handleUpdateNotifPrefs({ taskSoundEnabled: !notifPrefs.taskSoundEnabled })
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                        notifPrefs.taskSoundEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          notifPrefs.taskSoundEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="text-xs font-medium text-foreground">Team Chat Messages</div>
                      <div className="text-[11px] text-muted-foreground">Chime when someone sends a message in your chats</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs.chatSoundEnabled}
                      onClick={() =>
                        handleUpdateNotifPrefs({ chatSoundEnabled: !notifPrefs.chatSoundEnabled })
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                        notifPrefs.chatSoundEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          notifPrefs.chatSoundEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Modules & Features */}
      {activeTab === 'modules' && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Workspace Module Entitlements</CardTitle>
              <CardDescription>
                Enable or disable operational modules according to your organization's workflow needs.
              </CardDescription>
            </div>
            <Button onClick={() => handleSaveModules()} disabled={savingModules} size="sm">
              {savingModules ? 'Saving...' : 'Save Module Entitlements'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allModulesList.map((mod) => {
                const Icon = mod.icon;
                const isEnabled = enabledModules.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => handleInstantToggleModule(mod.key)}
                    className={`cursor-pointer p-4 rounded-lg border transition-all flex flex-col justify-between ${
                      isEnabled
                        ? 'border-primary bg-card ring-1 ring-primary/30 shadow-sm'
                        : 'border-border bg-surface-secondary/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                          isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => {}} // handled by div click
                          className="h-4 w-4 text-primary rounded border-input"
                        />
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{mod.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-normal">{mod.desc}</p>
                    </div>
                    <div className="mt-3 text-[10px] font-mono uppercase tracking-wider">
                      {isEnabled ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" /> Enabled
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Roles & Permissions (Image 3 2-Pane Configurator) */}
      {activeTab === 'roles' && canManageRoles && (
        <div className="space-y-6">
          {!isOwnerOrAdmin && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs flex items-start gap-2.5 text-foreground">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Delegated Role Configuration Access</div>
                <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
                  You have delegated permission to create and customize staff roles within your own permission ceiling and data scope (<span className="font-mono font-semibold text-foreground">{actorDataScope}</span>). Owner and Admin system roles cannot be modified.
                </p>
              </div>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-[310px_1fr] items-start">
            {/* Left Column: Workspace Roles Directory */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-foreground">Workspace Roles</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage roles and their permissions for this workspace.
                </p>
              </div>

              {/* Search Roles */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* System Roles */}
              <div className="space-y-1.5">
                {roles
                  .filter((r) => {
                    if (!r.isSystemRole) return false;
                    if (!roleSearch.trim()) return true;
                    const q = roleSearch.toLowerCase();
                    return (
                      r.name.toLowerCase().includes(q) ||
                      (r.description || '').toLowerCase().includes(q)
                    );
                  })
                  .map((r) => {
                    const isSelected = selectedRoleObj?.id === r.id || selectedRoleId === r.id;
                    const IconComp =
                      r.name === 'OWNER'
                        ? Crown
                        : r.name === 'ADMIN'
                        ? ShieldCheck
                        : Users;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedRoleId(r.id);
                          setRoleRightTab('permissions');
                        }}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 border ${
                          isSelected
                            ? 'border-blue-500/60 bg-blue-50/70 dark:bg-blue-950/30 shadow-xs'
                            : 'border-transparent bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-blue-600/15 text-blue-600'
                                : r.name === 'OWNER'
                                ? 'bg-amber-500/15 text-amber-600'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <IconComp className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`font-bold truncate ${
                                isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
                              }`}
                            >
                              {formatRoleDisplayName(r.name)}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {r.description || 'Core platform role'}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground border border-border/80 px-2 py-0.5 rounded-md bg-background font-medium">
                          System
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Custom Roles Collapsible Section */}
              <div className="pt-2 border-t border-border/70 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCustomRolesList(!showCustomRolesList)}
                  className="w-full flex items-center justify-between text-xs font-bold text-foreground py-1"
                >
                  <span>
                    Custom Roles ({roles.filter((r) => !r.isSystemRole).length})
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                      showCustomRolesList ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showCustomRolesList && (
                  <div className="space-y-1.5">
                    {roles
                      .filter((r) => {
                        if (r.isSystemRole) return false;
                        if (!roleSearch.trim()) return true;
                        const q = roleSearch.toLowerCase();
                        return (
                          r.name.toLowerCase().includes(q) ||
                          (r.description || '').toLowerCase().includes(q)
                        );
                      })
                      .map((r) => {
                        const isSelected = selectedRoleObj?.id === r.id || selectedRoleId === r.id;
                        const count = getRoleMemberCount(r);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedRoleId(r.id);
                              setRoleRightTab('permissions');
                            }}
                            className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 border ${
                              isSelected
                                ? 'border-blue-500/60 bg-blue-50/70 dark:bg-blue-950/30 shadow-xs'
                                : 'border-transparent bg-card hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                <Code2 className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-foreground truncate flex items-center gap-1.5">
                                  <span className="truncate">{r.name}</span>
                                  {r.isActive === false && (
                                    <span className="text-[9px] px-1 py-0 rounded bg-amber-500/15 text-amber-600">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {r.description || 'Custom workspace role'}
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground border border-border/80 px-2 py-0.5 rounded-md bg-background font-medium">
                              <Users className="h-3 w-3" /> {count}
                            </span>
                          </button>
                        );
                      })}
                    {roles.filter((r) => !r.isSystemRole).length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic py-1.5 px-1">
                        No custom roles created yet. Create role profiles for HR Recruitment, Generalist, Payroll, etc.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* + Create Custom Role Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateRoleModal(true)}
                className="w-full text-xs font-semibold h-9 gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <Plus className="h-3.5 w-3.5" /> Create Custom Role
              </Button>
            </div>

            {/* Right Column: Selected Role Details, Permissions, Members */}
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              {/* Role Banner Header */}
              <div className="p-5 pb-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    {selectedRoleObj?.name === 'OWNER' ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        {formatRoleDisplayName(selectedRoleObj?.name || 'ADMIN')}
                      </h3>
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        {selectedRoleObj?.isSystemRole ? 'System Role' : 'Custom Role'}
                      </span>
                      {selectedRoleObj?.isActive === false && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedRoleObj?.description || 'Organization administration and workspace management.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setRoleRightTab('members')}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedRoleMemberCount} Members</span>
                  </Button>
                  {selectedRoleObj && !selectedRoleObj.isSystemRole && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setRoleRightTab('details')}
                      title="Role Details & Lifecycle"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Sub-Navigation: Permissions | Members | Role Details */}
              <div className="px-5 flex items-center gap-5 border-b border-border/70 bg-muted/10">
                <button
                  type="button"
                  onClick={() => setRoleRightTab('permissions')}
                  className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    roleRightTab === 'permissions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" /> Permissions
                </button>
                <button
                  type="button"
                  onClick={() => setRoleRightTab('members')}
                  className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    roleRightTab === 'members'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" /> Members ({selectedRoleMemberCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleRightTab('details')}
                  className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    roleRightTab === 'details'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Info className="h-3.5 w-3.5" /> Role Details
                </button>
              </div>

              {/* SUB-TAB 1: Permissions (2-Pane Module List + Actions & Data Access Scope) */}
              {roleRightTab === 'permissions' && (
                <div className="p-5 space-y-4">
                  {/* Top Control Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Configure Permissions</h4>
                      <p className="text-xs text-muted-foreground">
                        Choose what this role can access and do across modules.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 relative">
                      {selectedRoleObj?.name !== 'OWNER' && (isOwnerOrAdmin || !selectedRoleObj?.isSystemRole) && (
                        <>
                          <div className="relative">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setCopyFromMenuOpen(!copyFromMenuOpen)}
                              className="h-8 text-xs gap-1.5"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy from Role
                            </Button>
                            {copyFromMenuOpen && (
                              <div className="absolute right-0 mt-1.5 w-56 rounded-lg border border-border bg-card shadow-lg z-30 py-1">
                                <div className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground border-b border-border/60">
                                  Clone Permissions From
                                </div>
                                {roles
                                  .filter((r) => r.id !== selectedRoleObj?.id)
                                  .map((r) => (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() => handleCopyFromRole(r.id)}
                                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/60 flex items-center justify-between"
                                    >
                                      <span className="font-medium text-foreground">{formatRoleDisplayName(r.name)}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {extractRolePermissionIds(r).length} perms
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={resettingRole}
                            onClick={handleResetRolePermissions}
                            className="h-8 text-xs gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {resettingRole ? 'Resetting...' : 'Reset'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick Filter Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filter permissions or modules (e.g. payroll, assets, invitations, leave)..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-14 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {permissionSearch && (
                      <button
                        type="button"
                        onClick={() => setPermissionSearch('')}
                        className="absolute right-2.5 top-1.5 text-muted-foreground hover:text-foreground text-[11px] font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* 2-Pane Split: Left Module Picker + Right Actions & Data Scope */}
                  {(() => {
                    const q = permissionSearch.toLowerCase().trim();
                    const visibleModules = catalogModuleNames.filter((modName) => {
                      if (!q) return true;
                      const display = (MODULE_DISPLAY_NAMES[modName] || modName).toLowerCase();
                      if (modName.toLowerCase().includes(q) || display.includes(q)) return true;
                      return effectiveCatalog.some(
                        (p) =>
                          (p.module || 'General') === modName &&
                          (p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)),
                      );
                    });

                    const activeModule = visibleModules.includes(selectedPermModule)
                      ? selectedPermModule
                      : visibleModules[0] || catalogModuleNames[0] || 'Assets';

                    const activeModPerms = effectiveCatalog
                      .filter((p) => {
                        if ((p.module || 'General') !== activeModule) return false;
                        if (!q) return true;
                        const display = (MODULE_DISPLAY_NAMES[activeModule] || activeModule).toLowerCase();
                        if (activeModule.toLowerCase().includes(q) || display.includes(q)) return true;
                        return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
                      })
                      .sort((a, b) => a.code.localeCompare(b.code));

                    const isOwnerSelected = selectedRoleObj?.name === 'OWNER';
                    const isRoleDisabled = selectedRoleObj?.isActive === false;
                    const isSystemLockedForDelegated = !isOwnerOrAdmin && Boolean(selectedRoleObj?.isSystemRole);
                    const isRoleReadOnly = isOwnerSelected || isRoleDisabled || isSystemLockedForDelegated;

                    const getModuleFriendlyLabel = (modName: string) => {
                      const raw = MODULE_DISPLAY_NAMES[modName] || modName;
                      return raw
                        .toLowerCase()
                        .split(' ')
                        .map((w) => (w === '&' ? '&' : w.charAt(0).toUpperCase() + w.slice(1)))
                        .join(' ');
                    };

                    const getModuleIcon = (modName: string) => {
                      switch (modName) {
                        case 'Assets':
                          return Package;
                        case 'Inventory':
                          return Package;
                        case 'Ledger':
                          return FileCheck;
                        case 'Documents':
                          return Folder;
                        case 'Projects':
                          return Briefcase;
                        case 'Tasks':
                          return CheckCircle2;
                        case 'People':
                          return Users;
                        case 'Attendance':
                        case 'Time':
                          return Clock;
                        case 'Leave':
                        case 'Calendar':
                          return Calendar;
                        case 'Approvals':
                          return ShieldCheck;
                        case 'Payroll':
                          return CreditCard;
                        case 'Reports':
                          return Award;
                        case 'WorkQueue':
                          return LayoutGrid;
                        default:
                          return Sliders;
                      }
                    };

                    const ActiveModIcon = getModuleIcon(activeModule);
                    const allModuleSelected =
                      isOwnerSelected ||
                      (activeModPerms.length > 0 &&
                        activeModPerms.every((p) => draftRolePermIds.includes(p.id)));

                    return (
                      <div className="rounded-xl border border-border overflow-hidden grid md:grid-cols-[220px_1fr] bg-background">
                        {/* Left Module List */}
                        <div className="border-b md:border-b-0 md:border-r border-border bg-muted/15 p-2 space-y-1 max-h-[430px] overflow-y-auto">
                          {visibleModules.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground p-3 text-center">No matching modules</p>
                          ) : (
                            visibleModules.map((modName) => {
                              const ModIcon = getModuleIcon(modName);
                              const modActions = effectiveCatalog.filter(
                                (p) => (p.module || 'General') === modName,
                              );
                              const grantedCount = isOwnerSelected
                                ? modActions.length
                                : modActions.filter((p) => draftRolePermIds.includes(p.id)).length;
                              const isModActive = activeModule === modName;
                              return (
                                <button
                                  key={modName}
                                  type="button"
                                  onClick={() => setSelectedPermModule(modName)}
                                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all text-left ${
                                    isModActive
                                      ? 'bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20'
                                      : 'text-foreground hover:bg-muted/50 border border-transparent'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <ModIcon className={`h-3.5 w-3.5 shrink-0 ${isModActive ? 'text-blue-600' : 'text-muted-foreground'}`} />
                                    <span className="truncate">{getModuleFriendlyLabel(modName)}</span>
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                      grantedCount > 0
                                        ? 'bg-blue-500/10 text-blue-600 font-semibold'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {grantedCount}/{modActions.length}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* Right Module Actions + Data Access Scope */}
                        <div className="p-4 flex flex-col justify-between space-y-5">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
                              <div className="flex items-start gap-2.5">
                                <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                  <ActiveModIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-foreground">
                                    {getModuleFriendlyLabel(activeModule)}
                                  </h5>
                                  <p className="text-[11px] text-muted-foreground">
                                    Control granular capabilities and access actions for {getModuleFriendlyLabel(activeModule).toLowerCase()}.
                                  </p>
                                </div>
                              </div>

                              {!isRoleReadOnly && activeModPerms.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const assignableIds = activeModPerms
                                      .filter((p) => isOwnerOrAdmin || checkPermission(activeWorkspaceCtx, p.code))
                                      .map((p) => p.id);
                                    if (assignableIds.length === 0) return;
                                    const allAssignableSelected = assignableIds.every((id) => draftRolePermIds.includes(id));
                                    if (allAssignableSelected) {
                                      setDraftRolePermIds((prev) => prev.filter((id) => !assignableIds.includes(id)));
                                    } else {
                                      setDraftRolePermIds((prev) => Array.from(new Set([...prev, ...assignableIds])));
                                    }
                                    setRolePermsDirty(true);
                                  }}
                                  className="text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
                                >
                                  {allModuleSelected ? 'Clear Module' : 'Select All'}
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="space-y-2.5">
                              <div className="text-xs font-bold text-foreground">Actions</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {activeModPerms.map((perm) => {
                                  const isGranted = isOwnerSelected || draftRolePermIds.includes(perm.id);
                                  const exceedsActorCeiling =
                                    !isOwnerOrAdmin && !checkPermission(activeWorkspaceCtx, perm.code);
                                  const permButtonDisabled = isRoleReadOnly || exceedsActorCeiling;
                                  return (
                                    <button
                                      key={perm.id}
                                      type="button"
                                      disabled={permButtonDisabled}
                                      title={exceedsActorCeiling ? 'Exceeds your own delegated permission ceiling' : perm.name}
                                      onClick={() => handleToggleDraftPermission(perm.id)}
                                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                                        isGranted
                                          ? 'border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20'
                                          : 'border-border/70 bg-card hover:bg-muted/20'
                                      } ${permButtonDisabled ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                      <div
                                        className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                                          isGranted
                                            ? 'bg-blue-600 border border-blue-600 text-white'
                                            : 'border border-border bg-background'
                                        }`}
                                      >
                                        {isGranted && <Check className="h-3 w-3 stroke-[3]" />}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-semibold text-foreground leading-snug flex items-center gap-1">
                                          <span className="truncate">{perm.name}</span>
                                          {exceedsActorCeiling && <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                                        </div>
                                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                          {perm.code}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Data Access Scope */}
                          <div className="pt-4 border-t border-border/60 space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                              <span>Data Access Scope</span>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {DATA_SCOPE_OPTIONS.map((opt) => {
                                const isActiveScope =
                                  (isOwnerSelected ? 'GLOBAL' : draftRoleDataScope) === opt.key;
                                const exceedsScopeCeiling =
                                  !isOwnerOrAdmin && (DATA_SCOPE_ORDER_MAP[opt.key] ?? 1) > actorDataScopeRank;
                                const scopeDisabled = isRoleReadOnly || exceedsScopeCeiling;
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    disabled={scopeDisabled}
                                    onClick={() => {
                                      setDraftRoleDataScope(opt.key);
                                      setRolePermsDirty(true);
                                    }}
                                    title={exceedsScopeCeiling ? `Exceeds your own ${actorDataScope} scope ceiling` : opt.desc}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                      isActiveScope
                                        ? 'border-blue-600 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold'
                                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                    } ${scopeDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  >
                                    <span
                                      className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                                        isActiveScope ? 'border-blue-600 bg-blue-600' : 'border-muted-foreground/50'
                                      }`}
                                    >
                                      {isActiveScope && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </span>
                                    <span>{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Customizable Team Scope Mapping */}
                            {(isOwnerSelected ? 'GLOBAL' : draftRoleDataScope) === 'TEAM' && (
                              <div className="mt-2.5 p-3 rounded-lg border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[11px] font-semibold text-foreground">
                                    Permitted Teams for This Role (Optional)
                                  </div>
                                  {draftRoleScopedTeamIds.length > 0 && (
                                    <button
                                      type="button"
                                      disabled={isRoleReadOnly}
                                      onClick={() => {
                                        setDraftRoleScopedTeamIds([]);
                                        setRolePermsDirty(true);
                                      }}
                                      className="text-[10px] font-semibold text-blue-600 hover:underline"
                                    >
                                      Reset to Own Team Only ({draftRoleScopedTeamIds.length})
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  {draftRoleScopedTeamIds.length === 0
                                    ? 'By default, users with this role only see their own assigned/led team and direct reports.'
                                    : `Users with this role can access records across their own team plus ${draftRoleScopedTeamIds.length} selected team(s).`}
                                </p>
                                {teams.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {teams.map((rawT) => {
                                      const t = rawT.data !== undefined ? rawT.data : rawT;
                                      const isSelected = draftRoleScopedTeamIds.includes(t.id);
                                      const deptLabel = t.department?.name || departments.find((d) => d.id === t.departmentId)?.name;
                                      return (
                                        <button
                                          key={t.id}
                                          type="button"
                                          disabled={isRoleReadOnly}
                                          onClick={() => {
                                            setDraftRoleScopedTeamIds((prev) =>
                                              prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                                            );
                                            setRolePermsDirty(true);
                                          }}
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                                            isSelected
                                              ? 'border-blue-600 bg-blue-600 text-white'
                                              : 'border-border bg-background text-foreground hover:border-blue-400'
                                          }`}
                                        >
                                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                          <span>{t.name}{deptLabel ? ` (${deptLabel})` : ''}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground italic">
                                    No teams created yet. Create teams under Organization Structure.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bottom Save Changes Bar */}
                  <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      {selectedRoleObj?.name === 'OWNER' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-muted-foreground">
                            Owner automatically retains full permissions across the entire workspace.
                          </span>
                        </>
                      ) : !isOwnerOrAdmin && selectedRoleObj?.isSystemRole ? (
                        <>
                          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">
                            System roles (Owner &amp; Admin) can only be modified by an Owner or Admin. Select or create a Staff role to customize permissions.
                          </span>
                        </>
                      ) : rolePermsDirty ? (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          <span className="text-amber-600 font-medium">
                            You have unsaved permission or data scope changes.
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-muted-foreground">
                            All permissions are configured for this role.
                          </span>
                        </>
                      )}
                    </div>

                    {selectedRoleObj?.name !== 'OWNER' && (isOwnerOrAdmin || !selectedRoleObj?.isSystemRole) && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={!rolePermsDirty || savingRolePerms || selectedRoleObj?.isActive === false}
                        onClick={handleSaveRolePermissions}
                        className="h-9 px-5 text-xs font-semibold"
                      >
                        {savingRolePerms ? 'Saving...' : 'Save Changes'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: Assigned Members */}
              {roleRightTab === 'members' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Assigned Members ({selectedRoleMemberCount})
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Workspace users currently assigned to {formatRoleDisplayName(selectedRoleObj?.name || '')}.
                      </p>
                    </div>
                    <Link href="/app/people?invite=1">
                      <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                        <Plus className="h-3.5 w-3.5" /> Assign / Invite Member
                      </Button>
                    </Link>
                  </div>

                  {loadingRoleMembers ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading members...
                    </div>
                  ) : (
                    (() => {
                      const list =
                        roleMembers.length > 0
                          ? roleMembers
                          : allMembersList.filter(
                              (m: any) =>
                                m.roleId === selectedRoleObj?.id ||
                                m.role?.id === selectedRoleObj?.id ||
                                (!m.roleId && m.accessRole === selectedRoleObj?.name),
                            );
                      if (list.length === 0) {
                        return (
                          <div className="py-10 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                            No members assigned to this role yet.
                          </div>
                        );
                      }
                      return (
                        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                          {list.map((m: any) => {
                            const fullName =
                              [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') ||
                              m.user?.email ||
                              'Member';
                            return (
                              <div
                                key={m.id}
                                className="flex items-center justify-between p-3 bg-card hover:bg-muted/20 text-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <UserAvatar
                                    firstName={m.user?.firstName}
                                    lastName={m.user?.lastName}
                                    avatarUrl={m.user?.avatarUrl}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-foreground truncate">{fullName}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {m.user?.email}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                  {m.designation?.title && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {m.designation.title}
                                    </Badge>
                                  )}
                                  {m.team?.name && (
                                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                                      Team: {m.team.name}
                                    </Badge>
                                  )}
                                  {m.department?.name && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {m.department.name}
                                    </Badge>
                                  )}
                                  {(m.effectiveDataScope || m.dataScope) && (
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                      {m.effectiveDataScope || m.dataScope}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* SUB-TAB 3: Role Details & Lifecycle */}
              {roleRightTab === 'details' && (
                <div className="p-5 space-y-5">
                  {selectedRoleObj?.isSystemRole ? (
                    <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs space-y-2">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600" /> Core System Role
                      </div>
                      <p className="text-muted-foreground">
                        <strong>{formatRoleDisplayName(selectedRoleObj.name)}</strong> is a built-in workspace role and cannot be deleted.
                        {selectedRoleObj.name !== 'OWNER' &&
                          ' You can customize its granular actions and data access scope from the Permissions tab.'}
                      </p>
                    </div>
                  ) : (
                    selectedRoleObj && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Role Lifecycle & Settings</h4>
                          <p className="text-xs text-muted-foreground">
                            Rename, deactivate, or safely remove {selectedRoleObj.name} with member migration.
                          </p>
                        </div>

                        {editingRoleId === selectedRoleObj.id ? (
                          <div className="space-y-3 border border-border p-4 rounded-lg bg-muted/20 max-w-md">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-foreground">Role Title *</label>
                              <input
                                type="text"
                                value={editRoleName}
                                onChange={(e) => setEditRoleName(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-foreground">Description</label>
                              <input
                                type="text"
                                value={editRoleDesc}
                                onChange={(e) => setEditRoleDesc(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="text-xs" onClick={() => handleRenameRole(selectedRoleObj.id)}>
                                Save Changes
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingRoleId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                setEditingRoleId(selectedRoleObj.id);
                                setEditRoleName(selectedRoleObj.name);
                                setEditRoleDesc(selectedRoleObj.description || '');
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Rename / Edit Description
                            </Button>

                            {selectedRoleObj.isActive !== false ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-amber-600 hover:bg-amber-500/10"
                                onClick={() => handleDeactivateRole(selectedRoleObj.id)}
                              >
                                Deactivate Role
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => handleReactivateRole(selectedRoleObj.id)}
                              >
                                Reactivate Role
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => {
                                setDeletingRoleId(selectedRoleObj.id);
                                setDeleteReassignRoleId('');
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Custom Role
                            </Button>
                          </div>
                        )}

                        {deletingRoleId === selectedRoleObj.id && (
                          <div className="space-y-3 border border-destructive/30 p-4 rounded-lg bg-destructive/5 text-xs max-w-md">
                            <p className="text-destructive font-semibold">
                              {selectedRoleMemberCount > 0
                                ? `Migrate ${selectedRoleMemberCount} member(s) to a fallback role before deleting:`
                                : 'Confirm permanent deletion of this custom role:'}
                            </p>
                            {selectedRoleMemberCount > 0 && (
                              <select
                                value={deleteReassignRoleId}
                                onChange={(e) => setDeleteReassignRoleId(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                              >
                                <option value="">-- Select Fallback Role --</option>
                                {roles
                                  .filter((r) => r.id !== selectedRoleObj.id)
                                  .map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name} {r.isSystemRole ? '(System)' : ''}
                                    </option>
                                  ))}
                              </select>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs"
                                disabled={selectedRoleMemberCount > 0 && !deleteReassignRoleId}
                                onClick={() => handleDeleteRole(selectedRoleObj.id)}
                              >
                                Confirm Delete
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setDeletingRoleId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Access Diagnostics & Effective Permissions Inspector (Collapsible) */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <Shield className="h-4 w-4 text-primary" />
              <span>Access Diagnostics & Effective Permissions Inspector</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
            </button>

            {showDiagnostics && (
              <Card className="border-border mt-3">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Access Diagnostics & Effective Permissions Inspector
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Review effective permissions and diagnose why a user can or cannot perform an action, including data scope boundaries.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Select Member *</label>
                      <select
                        value={selectedDiagnosticMemberId}
                        onChange={(e) => setSelectedDiagnosticMemberId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="">-- Choose Workspace Member --</option>
                        {workspace?.memberships?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.user?.firstName} {m.user?.lastName} ({m.accessRole} • {m.user?.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Action / Permission to Test *</label>
                      <select
                        value={diagnosticPermissionToTest}
                        onChange={(e) => setDiagnosticPermissionToTest(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="payroll:view">payroll:view (Restricted Payroll)</option>
                        <option value="payroll:export">payroll:export (Payroll Export)</option>
                        <option value="people:export">people:export (Directory Export)</option>
                        <option value="people:manage">people:manage (Employee Management)</option>
                        <option value="tasks:delete">tasks:delete (Task Deletion)</option>
                        <option value="tasks:assign">tasks:assign (Task Assignment)</option>
                        <option value="quality:audit">quality:audit (Conduct QA Audit)</option>
                        <option value="roles:manage">roles:manage (Manage Roles)</option>
                        <option value="billing:manage">billing:manage (Subscriptions & Billing)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        size="sm"
                        className="w-full text-xs h-8 gap-1"
                        disabled={diagnosingAccess || !selectedDiagnosticMemberId}
                        onClick={handleRunDiagnostic}
                      >
                        {diagnosingAccess ? 'Evaluating...' : 'Run Access Diagnostic'}
                      </Button>
                    </div>
                  </div>

                  {/* Diagnostic Results Box */}
                  {diagnosticResult && (
                    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/80 pb-2.5 gap-2">
                        <div>
                          <span className="text-xs font-bold text-foreground">
                            {diagnosticResult.membership?.userName}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-2 font-mono">
                            ({diagnosticResult.membership?.userEmail})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Platform: {diagnosticResult.membership?.accessRole}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            Role: {diagnosticResult.membership?.role?.name} ({diagnosticResult.membership?.role?.isActive ? 'Active' : 'Inactive'})
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Scope: {diagnosticResult.dataScopePolicy?.scope}
                          </Badge>
                        </div>
                      </div>

                      {/* Verdict Card */}
                      {diagnosticResult.evaluation && (
                        <div className={`p-3 rounded-md border text-xs flex items-start gap-2.5 ${
                          diagnosticResult.evaluation.isAllowed
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-destructive/30 bg-destructive/10 text-destructive'
                        }`}>
                          {diagnosticResult.evaluation.isAllowed ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-2">
                              <span>Status: {diagnosticResult.evaluation.isAllowed ? 'ALLOWED' : 'DENIED'}</span>
                              <span className="font-mono text-[10px] opacity-80">({diagnosticResult.evaluation.permission})</span>
                            </div>
                            <p className="text-[11px] leading-relaxed opacity-90">{diagnosticResult.evaluation.reason}</p>
                            <p className="text-[10px] opacity-75 font-mono">Data Scope Boundary: {diagnosticResult.evaluation.dataScopeConstraint}</p>
                          </div>
                        </div>
                      )}

                      {/* Effective Permissions Summary */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">Granted Effective Permissions</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {diagnosticResult.effectivePermissionsCount} total granted
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 rounded bg-card border border-border">
                          {diagnosticResult.effectivePermissions?.map((permCode: string) => (
                            <span key={permCode} className="text-[10px] font-mono bg-muted/60 px-1.5 py-0.5 rounded text-foreground">
                              {permCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Org Structure */}
      {activeTab === 'structure' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Departments */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Departments</span>
                <Badge variant="secondary" className="text-[10px]">{departments.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Operational units</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddDept} className="space-y-2 border-b border-border pb-3">
                <input
                  type="text"
                  required
                  placeholder="Department Name *"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Code (e.g. OPS)"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs px-3">Add</Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {departments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No departments created yet.</p>
                ) : (
                  departments.map((rawD) => {
                    const d = rawD.data !== undefined ? rawD.data : rawD;
                    const isEditing = editingDeptId === d.id;

                    if (isEditing) {
                      return (
                        <form
                          key={d.id}
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveDept(d.id);
                          }}
                          className="p-2 rounded-md bg-muted/60 border border-primary/30 space-y-1.5 text-xs"
                        >
                          <input
                            type="text"
                            required
                            value={editDeptName}
                            onChange={(e) => setEditDeptName(e.target.value)}
                            placeholder="Department Name *"
                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            autoFocus
                          />
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={editDeptCode}
                              onChange={(e) => setEditDeptCode(e.target.value)}
                              placeholder="Code (e.g. OPS)"
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                            <Button
                              type="submit"
                              size="sm"
                              disabled={savingDept}
                              className="h-7 text-xs px-2.5 shrink-0"
                            >
                              {savingDept ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={savingDept}
                              onClick={cancelEditDept}
                              className="h-7 text-xs px-2 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div key={d.id} className="group flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{d.name}</span>
                          {d.code && <span className="text-[10px] font-mono text-muted-foreground ml-2">({d.code})</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditDept(d)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-background"
                            title="Edit Department"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDept(d.id)}
                            className="text-destructive hover:opacity-80 transition-opacity p-1 rounded hover:bg-destructive/10"
                            title="Delete Department"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teams */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Teams</span>
                <Badge variant="secondary" className="text-[10px]">{teams.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Functional teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddTeam} className="space-y-2 border-b border-border pb-3">
                <input
                  type="text"
                  required
                  placeholder="Team Name *"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newTeamDeptId}
                    onChange={(e) => setNewTeamDeptId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">Select Dept (Optional)</option>
                    {departments.map((rawD) => {
                      const d = rawD.data !== undefined ? rawD.data : rawD;
                      return (
                        <option key={d.id} value={d.id} className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">
                          {d.name}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={newTeamLeadId}
                    onChange={(e) => setNewTeamLeadId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:outline-none"
                    title="Assign Team Lead (Optional)"
                  >
                    <option value="" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">Team Lead (Optional)</option>
                    {directoryMembers.map((m) => (
                      <option key={m.id} value={m.id} className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">
                        {m.user?.firstName} {m.user?.lastName}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" className="h-8 text-xs px-3 shrink-0">Add</Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {teams.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No teams created yet.</p>
                ) : (
                  teams.map((rawT) => {
                    const t = rawT.data !== undefined ? rawT.data : rawT;
                    const isEditing = editingTeamId === t.id;

                    if (isEditing) {
                      return (
                        <form
                          key={t.id}
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveTeam(t.id);
                          }}
                          className="p-2 rounded-md bg-muted/60 border border-primary/30 space-y-1.5 text-xs"
                        >
                          <input
                            type="text"
                            required
                            value={editTeamName}
                            onChange={(e) => setEditTeamName(e.target.value)}
                            placeholder="Team Name *"
                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            autoFocus
                          />
                          <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
                            <select
                              value={editTeamDeptId}
                              onChange={(e) => setEditTeamDeptId(e.target.value)}
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:outline-none"
                            >
                              <option value="" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">Select Dept (Optional)</option>
                              {departments.map((rawD) => {
                                const d = rawD.data !== undefined ? rawD.data : rawD;
                                return (
                                  <option key={d.id} value={d.id} className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">
                                    {d.name}
                                  </option>
                                );
                              })}
                            </select>
                            <select
                              value={editTeamLeadId}
                              onChange={(e) => setEditTeamLeadId(e.target.value)}
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:outline-none"
                              title="Team Lead"
                            >
                              <option value="" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">No Team Lead</option>
                              {directoryMembers.map((m) => (
                                <option key={m.id} value={m.id} className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">
                                  {m.user?.firstName} {m.user?.lastName}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={savingTeam}
                              className="h-7 text-xs px-2.5 shrink-0"
                            >
                              {savingTeam ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={savingTeam}
                              onClick={cancelEditTeam}
                              className="h-7 text-xs px-2 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </form>
                      );
                    }

                    const leadName = t.leadMembership?.user
                      ? `${t.leadMembership.user.firstName || ''} ${t.leadMembership.user.lastName || ''}`.trim()
                      : '';

                    return (
                      <div key={t.id} className="group flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-xs">
                        <div className="min-w-0 pr-2 flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{t.name}</span>
                          {(t.department?.name || t.departmentName) && (
                            <span className="text-[10px] text-muted-foreground">({t.department?.name || t.departmentName})</span>
                          )}
                          {leadName && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-300">
                              Lead: {leadName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditTeam(t)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-background"
                            title="Edit Team"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(t.id)}
                            className="text-destructive hover:opacity-80 transition-opacity p-1 rounded hover:bg-destructive/10"
                            title="Delete Team"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Designations with Configurable Permissions & Role Mapping */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span>Designations & Permission Profiles</span>
                  <Badge variant="secondary" className="text-[10px]">{designations.length}</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Configure job titles with linked departments, default roles & granular permissions
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowDesigConfigModal(true)}
                className="h-7 text-[11px] gap-1 shrink-0"
              >
                <Sliders className="h-3 w-3" /> Configure
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddDesig} className="space-y-2 border-b border-border pb-3">
                <input
                  type="text"
                  required
                  placeholder="Designation Title * (e.g. HR - Recruitment)"
                  value={newDesigTitle}
                  onChange={(e) => setNewDesigTitle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={newDesigDeptId}
                    onChange={(e) => setNewDesigDeptId(e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">All Departments</option>
                    {departments.map((rawD) => {
                      const dept = rawD.data !== undefined ? rawD.data : rawD;
                      return (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={newDesigAccessRole}
                    onChange={(e) => setNewDesigAccessRole(e.target.value as any)}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    {/* LEGACY_ROLE_COMMENTED_OUT: MANAGER and MEMBER hidden in favor of customizable staff roles
                    <option value="MEMBER">Role: Member</option>
                    <option value="MANAGER">Role: Manager</option>
                    */}
                    <option value="MEMBER">Role: Staff (Role / Designation)</option>
                    <option value="ADMIN">Role: Admin</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="Level"
                    value={newDesigLevel}
                    onChange={(e) => setNewDesigLevel(Number(e.target.value))}
                    className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDesigConfigModal(true)}
                    className="h-8 text-[11px] px-2.5 shrink-0"
                  >
                    Perms ({newDesigPerms.length})
                  </Button>
                  <Button type="submit" size="sm" className="h-8 text-xs px-3 flex-1">Add</Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {designations.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No designations created yet.</p>
                ) : (
                  designations.map((rawD) => {
                    const d = rawD.data !== undefined ? rawD.data : rawD;
                    const isEditing = editingDesigId === d.id;
                    const linkedDept = departments.find((dep) => (dep.id || dep.data?.id) === d.departmentId);
                    const linkedDeptName = linkedDept?.name || linkedDept?.data?.name;
                    const permCount = Array.isArray(d.permissionCodes) ? d.permissionCodes.length : 0;

                    if (isEditing) {
                      return (
                        <form
                          key={d.id}
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveDesig(d.id);
                          }}
                          className="p-2.5 rounded-md bg-muted/60 border border-primary/30 space-y-2 text-xs"
                        >
                          <input
                            type="text"
                            required
                            value={editDesigTitle}
                            onChange={(e) => setEditDesigTitle(e.target.value)}
                            placeholder="Designation Title *"
                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            autoFocus
                          />
                          <div className="grid grid-cols-3 gap-1">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={editDesigLevel}
                              onChange={(e) => setEditDesigLevel(Number(e.target.value))}
                              placeholder="Lvl"
                              className="rounded border border-input bg-background px-2 py-1 text-[11px]"
                            />
                            <select
                              value={editDesigAccessRole}
                              onChange={(e) => setEditDesigAccessRole(e.target.value as any)}
                              className="rounded border border-input bg-background px-1.5 py-1 text-[11px]"
                            >
                              {/* LEGACY_ROLE_COMMENTED_OUT:
                              <option value="MEMBER">MEMBER</option>
                              <option value="MANAGER">MANAGER</option>
                              */}
                              <option value="MEMBER">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <select
                              value={editDesigDataScope}
                              onChange={(e) => setEditDesigDataScope(e.target.value as any)}
                              className="rounded border border-input bg-background px-1.5 py-1 text-[11px]"
                            >
                              {DATA_SCOPE_OPTIONS.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {opt.key}
                                </option>
                              ))}
                            </select>
                          </div>
                          <select
                            value={editDesigDeptId}
                            onChange={(e) => setEditDesigDeptId(e.target.value)}
                            className="w-full rounded border border-input bg-background px-2 py-1 text-[11px]"
                          >
                            <option value="">All / No Linked Department</option>
                            {departments.map((dep) => {
                              const depObj = dep.data !== undefined ? dep.data : dep;
                              return (
                                <option key={depObj.id} value={depObj.id}>
                                  {depObj.name}
                                </option>
                              );
                            })}
                          </select>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>Permissions ({editDesigPerms.length} selected)</span>
                              <div className="flex gap-1">
                                {DESIGNATION_PERMISSION_PRESETS.slice(0, 3).map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      setEditDesigAccessRole(preset.accessRole);
                                      setEditDesigDataScope(preset.dataScope);
                                      setEditDesigPerms(preset.permissionCodes);
                                    }}
                                    className="px-1.5 py-0.2 rounded bg-background border border-border hover:border-primary text-[9px]"
                                  >
                                    {preset.label.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="max-h-28 overflow-y-auto grid grid-cols-1 gap-1 p-1.5 rounded bg-background border border-border">
                              {effectiveCatalog.map((perm) => {
                                const checked = editDesigPerms.includes(perm.code);
                                return (
                                  <label
                                    key={perm.id}
                                    className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        setEditDesigPerms((prev) =>
                                          checked
                                            ? prev.filter((c) => c !== perm.code)
                                            : [...prev, perm.code],
                                        )
                                      }
                                      className="h-3 w-3 accent-blue-600"
                                    />
                                    <span className="font-mono text-foreground">{perm.code}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={savingDesig}
                              className="h-7 text-xs px-2.5 flex-1"
                            >
                              {savingDesig ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={savingDesig}
                              onClick={cancelEditDesig}
                              className="h-7 text-xs px-2 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div key={d.id} className="group flex items-start justify-between p-2.5 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-xs gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{d.title}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">(Lvl {d.level || 1})</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {d.defaultAccessRole && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600">
                                {d.defaultAccessRole}
                              </span>
                            )}
                            {d.defaultDataScope && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-background border border-border text-muted-foreground">
                                {d.defaultDataScope}
                              </span>
                            )}
                            {linkedDeptName && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-background border border-border text-foreground">
                                {linkedDeptName}
                              </span>
                            )}
                            {permCount > 0 && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600">
                                {permCount} perms
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditDesig(d)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-background"
                            title="Edit Designation & Permissions"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDesig(d.id)}
                            className="text-destructive hover:opacity-80 transition-opacity p-1 rounded hover:bg-destructive/10"
                            title="Delete Designation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: Subscription & Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Subscription Card */}
          <Card className="border-primary/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Current Workspace Subscription</CardTitle>
                <CardDescription>Plan entitlements, seat quotas, and billing status</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {subscription?.status === 'ACTIVE' && (
                  <Badge variant="default" className="bg-emerald-600 text-white hover:bg-emerald-600 font-mono text-xs uppercase px-3 py-1">
                    Active
                  </Badge>
                )}
                {subscription?.status === 'PAST_DUE' && (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-500 border-amber-500/30 font-mono text-xs uppercase px-3 py-1">
                    Past Due (Grace Period)
                  </Badge>
                )}
                {subscription?.status === 'CANCELLED' && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-xs uppercase px-3 py-1">
                    Cancelled (Active Until Expiry)
                  </Badge>
                )}
                {subscription?.status === 'UNPAID' && (
                  <Badge variant="destructive" className="font-mono text-xs uppercase px-3 py-1">
                    Unpaid / Suspended
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
                <div>
                  <div className="text-2xl font-extrabold text-foreground">
                    {subscription?.plan?.name || 'Free Tier'}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span>
                      Seats Allocated:{' '}
                      <strong className="text-foreground">
                        {subscription?.activeMembersCount || 0} / {subscription?.seatCount || 5} seats
                      </strong>
                    </span>
                    {subscription?.pendingInvitationsCount > 0 && (
                      <span className="text-amber-500 font-medium">
                        ({subscription.pendingInvitationsCount} pending invitations)
                      </span>
                    )}
                    <span>•</span>
                    <span>
                      Cloud Storage:{' '}
                      <strong className="text-foreground">
                        {(subscription?.plan?.entitlements?.maxStorageMb || 1000) / 1000} GB
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="md:text-right">
                  <div className="text-xl font-bold text-foreground">
                    ₹{(subscription?.plan?.priceMonthly || 0).toLocaleString()} <span className="text-xs text-muted-foreground font-normal">/mo</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {subscription?.currentPeriodEnd
                      ? `Period End: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : 'Lifetime Access'}
                  </div>
                  {subscription?.status === 'ACTIVE' && subscription?.plan?.code !== 'FREE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cancellingSub}
                      onClick={handleCancelSubscription}
                      className="mt-2 text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
                    >
                      {cancellingSub ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Grace Period & Notice Alerts */}
              {subscription?.status === 'PAST_DUE' && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-500">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">7-Day Payment Grace Period Active:</span> Renewal payment could not be processed. Your organization maintains active access without service disruption. Please verify or update payment details to prevent feature downgrades. Customer data is never deleted.
                  </div>
                </div>
              )}

              {subscription?.status === 'CANCELLED' && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Subscription Cancelled:</span> Auto-renewal has been turned off. Your workspace maintains full access to plan features until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}. Customer records and data remain 100% intact.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Cycle Frequency Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Available Commercial Plans</h2>
              <p className="text-xs text-muted-foreground">Select the operational tier suited to your team scale.</p>
            </div>
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Annual Billing</span>
                <span className="rounded bg-emerald-500/15 px-1 py-0.2 text-[10px] font-semibold text-emerald-500">
                  2 Months Free
                </span>
              </button>
            </div>
          </div>

          {/* 3 Subscription Plan Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {plans
              .filter((p) => ['FREE', 'STARTER', 'BUSINESS'].includes(p.code))
              .map((p) => {
                const isCurrent = subscription?.planId === p.id;
                const isStarter = p.code === 'STARTER';
                const displayPrice =
                  billingCycle === 'yearly'
                    ? p.priceYearly === 0
                      ? 0
                      : Math.round(p.priceYearly / 12)
                    : p.priceMonthly;

                return (
                  <Card
                    key={p.id}
                    className={`relative flex flex-col justify-between border-border transition-all ${
                      isCurrent
                        ? 'border-primary ring-1 ring-primary shadow-sm bg-card'
                        : isStarter
                        ? 'border-primary/40 bg-card hover:border-primary/70'
                        : 'bg-card hover:border-border'
                    }`}
                  >
                    {isStarter && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="outline" className="bg-background text-primary border-primary text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5">
                          Current Plan
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pt-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-foreground">{p.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs line-clamp-2 min-h-[32px] mt-1">
                        {p.entitlements?.description || 'Operational management tier'}
                      </CardDescription>

                      <div className="pt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-foreground">
                            ₹{displayPrice.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">/month</span>
                        </div>
                        {billingCycle === 'yearly' && p.priceYearly > 0 && (
                          <div className="text-[11px] text-emerald-500 font-medium mt-0.5">
                            Billed annually at ₹{p.priceYearly.toLocaleString()}/yr
                          </div>
                        )}
                        {billingCycle === 'monthly' && p.priceMonthly > 0 && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Billed monthly
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs flex-grow">
                      <div className="space-y-2 border-t border-border pt-3">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span>Max Seats: {p.entitlements?.maxUsers || 5} team members</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span>Cloud Storage: {(p.entitlements?.maxStorageMb || 1000) / 1000} GB</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span>
                            {p.code === 'FREE' && 'Core Work: People, Tasks, Projects & Time'}
                            {p.code === 'STARTER' && 'Queues, Shifts, Leave, QA, SLAs & Approvals'}
                            {p.code === 'BUSINESS' && 'All Operational Modules + Priority SLAs'}
                          </span>
                        </div>
                      </div>

                      {p.entitlements?.conditions && (
                        <div className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground border border-border/50">
                          <span className="font-semibold text-foreground">Conditions:</span> {p.entitlements.conditions}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2">
                      <Button
                        variant={isCurrent ? 'outline' : isStarter ? 'default' : 'outline'}
                        disabled={isCurrent || p.code === 'FREE' || upgradingPlanId === p.id}
                        onClick={() => handleUpgrade(p.id)}
                        className="w-full text-xs h-9"
                      >
                        {isCurrent
                          ? 'Current Plan'
                          : upgradingPlanId === p.id
                          ? 'Initializing Payment...'
                          : p.code === 'FREE'
                          ? 'Free Tier'
                          : `Upgrade to ${p.name}`}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
          </div>

          {/* Invoices & Transaction History */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Invoices & Payment Receipts</span>
                <Badge variant="secondary" className="text-[10px]">
                  {subscription?.invoices?.length || 0} Records
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Verified payment history and downloadable tax invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscription?.invoices && subscription.invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 font-semibold">Invoice #</th>
                        <th className="pb-2 font-semibold">Date</th>
                        <th className="pb-2 font-semibold">Amount</th>
                        <th className="pb-2 font-semibold">GST / Tax</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold">Paid At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {subscription.invoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="py-2.5 font-mono font-medium text-foreground">{inv.invoiceNumber}</td>
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 font-semibold text-foreground">₹{inv.amount.toLocaleString()}</td>
                          <td className="py-2.5 text-muted-foreground">₹{inv.tax ? inv.tax.toLocaleString() : '0'}</td>
                          <td className="py-2.5">
                            <Badge variant="default" className="bg-emerald-600/15 text-emerald-500 border-emerald-500/30 text-[10px] font-mono">
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p className="font-medium text-foreground">No invoices generated yet</p>
                  <p className="text-[11px] mt-0.5">
                    Official tax invoices appear here automatically upon verified Razorpay payment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: Security & 2FA */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Section 1: Two-Factor Authentication */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Two-Factor Authentication (2FA)
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Secure your account using standard RFC 6238 time-based one-time passcodes (TOTP) and emergency recovery codes.
                  </CardDescription>
                </div>
                <Badge
                  variant={userProfile?.mfaEnabled ? 'default' : 'secondary'}
                  className={userProfile?.mfaEnabled ? 'bg-emerald-600/15 text-emerald-500 border-emerald-500/30 text-xs' : 'text-xs'}
                >
                  {userProfile?.mfaEnabled ? '2FA Enabled' : '2FA Disabled'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {userProfile?.mfaEnabled ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                      Two-Step Verification is Active
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Your account is protected. Every login requires your password plus a 6-digit authenticator code or one of your emergency recovery codes.
                    </p>
                  </div>

                  {!showDisableMfa ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDisableMfa(true)}
                      className="text-xs"
                    >
                      Disable Two-Factor Authentication
                    </Button>
                  ) : (
                    <form onSubmit={handleDisableMfa} className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3 max-w-md">
                      <div className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4" />
                        Confirm 2FA Deactivation
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        To disable two-step verification, confirm your password and enter a current authenticator or recovery code.
                      </p>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Account Password</label>
                        <div className="relative">
                          <input
                            type={showDisablePassword ? 'text' : 'password'}
                            required
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Your current password"
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-xs focus:ring-1 focus:ring-destructive focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDisablePassword(!showDisablePassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            aria-label={showDisablePassword ? 'Hide password' : 'Show password'}
                          >
                            {showDisablePassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">6-Digit Code or Recovery Code</label>
                        <input
                          type="text"
                          required
                          value={disableCode}
                          onChange={(e) => setDisableCode(e.target.value)}
                          placeholder="e.g. 123456 or a1b2c3d4"
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-destructive focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button type="submit" variant="destructive" size="sm" disabled={disablingMfa} className="text-xs">
                          {disablingMfa ? 'Disabling...' : 'Confirm Disable'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowDisableMfa(false);
                            setDisablePassword('');
                            setDisableCode('');
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {!enrollingMfa ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Add an extra layer of protection to your account. When enabled, signing in will require an authenticator app code in addition to your password.
                      </p>
                      <Button onClick={handleStartEnrollMfa} size="sm" className="text-xs gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" />
                        Enable Two-Factor Authentication
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-5 border border-border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-primary" />
                          Set Up Authenticator App
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEnrollingMfa(false);
                            setMfaEnrollData(null);
                            setMfaCode('');
                          }}
                          className="text-xs h-7"
                        >
                          Cancel
                        </Button>
                      </div>

                      {/* Step 1: Secret Key */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-foreground">
                          Step 1: Enter Secret Key in Authenticator
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator) and add an account manually using this secret key:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="bg-card border border-border px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wider text-primary select-all">
                            {mfaEnrollData?.secret}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 gap-1"
                            onClick={() => {
                              if (mfaEnrollData?.secret) {
                                navigator.clipboard.writeText(mfaEnrollData.secret);
                                toast.success('Secret key copied to clipboard');
                              }
                            }}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                        </div>
                      </div>

                      {/* Step 2: Emergency Recovery Codes */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-foreground">
                          Step 2: Save Emergency Recovery Codes
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Save these 8 single-use recovery codes in a secure location. If you lose access to your authenticator device, each code can be used once to log in.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-card p-3 rounded-md border border-border">
                          {mfaEnrollData?.recoveryCodes?.map((code, idx) => (
                            <div key={idx} className="font-mono text-xs text-foreground bg-muted/50 p-1 rounded text-center font-semibold">
                              {code}
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => {
                            if (mfaEnrollData?.recoveryCodes) {
                              navigator.clipboard.writeText(mfaEnrollData.recoveryCodes.join('\n'));
                              toast.success('8 recovery codes copied to clipboard');
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" /> Copy All Recovery Codes
                        </Button>
                      </div>

                      {/* Step 3: Verification */}
                      <form onSubmit={handleConfirmMfa} className="space-y-3 border-t border-border pt-4 max-w-sm">
                        <div className="text-xs font-semibold text-foreground">
                          Step 3: Enter 6-Digit Authenticator Code
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Enter the code shown in your authenticator app to confirm configuration:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            required
                            autoFocus
                            placeholder="000000"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                            className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-center text-sm font-mono tracking-widest focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                          <Button type="submit" size="sm" disabled={confirmingMfa} className="text-xs">
                            {confirmingMfa ? 'Verifying...' : 'Verify & Activate'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Password Management */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Password & Authentication
              </CardTitle>
              <CardDescription className="text-xs">
                Update your account password. Must contain at least 8 characters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3.5 max-w-md">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">New Password (minimum 8 characters) *</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={changingPassword} className="text-xs">
                  {changingPassword ? 'Updating Password...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Section 3: Workspace Member 2FA Administration (For Owners/Admins) */}
          {workspace?.memberships && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  Workspace Member Lockout Recovery
                </CardTitle>
                <CardDescription className="text-xs">
                  Administrators can safely reset 2FA credentials and revoke active sessions for locked-out members.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 font-semibold">Member</th>
                        <th className="pb-2 font-semibold">Email</th>
                        <th className="pb-2 font-semibold">Role</th>
                        <th className="pb-2 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {workspace.memberships.map((m: any) => (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="py-2.5 font-medium text-foreground">
                            {m.user?.firstName} {m.user?.lastName}
                          </td>
                          <td className="py-2.5 text-muted-foreground font-mono">{m.user?.email}</td>
                          <td className="py-2.5">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {m.accessRole}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                              disabled={resettingMfaUserId === m.user?.id}
                              onClick={() => handleAdminResetMfa(m.user?.id, m.user?.email)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {resettingMfaUserId === m.user?.id ? 'Resetting...' : 'Reset 2FA & Revoke Sessions'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal: Create Custom Role */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Create Custom Role</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define a new role profile with tailored module actions and data access scope.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR Executive, Recruiter, Payroll Specialist"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Description</label>
                <input
                  type="text"
                  placeholder="What is this role responsible for?"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Copy Permissions From (Optional)</label>
                <select
                  value={newRoleCopyFromId}
                  onChange={(e) => setNewRoleCopyFromId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Start from scratch (empty)</option>
                  {roles
                    .filter((r) => isOwnerOrAdmin || !r.isSystemRole)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatRoleDisplayName(r.name)} ({extractRolePermissionIds(r).length} permissions)
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Default Data Access Scope</label>
                <select
                  value={newRoleDataScope}
                  onChange={(e) => setNewRoleDataScope(e.target.value as any)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                >
                  {DATA_SCOPE_OPTIONS.filter(
                    (opt) => isOwnerOrAdmin || (DATA_SCOPE_ORDER_MAP[opt.key] ?? 1) <= actorDataScopeRank,
                  ).map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {newRoleDataScope === 'TEAM' && teams.length > 0 && (
                <div className="p-2.5 rounded-lg border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-1.5">
                  <div className="text-[11px] font-semibold text-foreground">
                    Permitted Teams (Leave empty for member's own assigned team)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {teams.map((rawT) => {
                      const t = rawT.data !== undefined ? rawT.data : rawT;
                      const checked = newRoleScopedTeamIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setNewRoleScopedTeamIds((prev) =>
                              prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
                            checked
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-border bg-background text-foreground hover:border-blue-400'
                          }`}
                        >
                          {checked && <Check className="h-3 w-3 stroke-[3]" />}
                          <span>{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateRoleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creatingRole}>
                  {creatingRole ? 'Creating...' : '+ Create Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Designation & Permissions */}
      {showDesigConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Create Designation with Permission Profile
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure job title, linked department, default role/scope & module permissions (e.g. HR - Recruitment vs HR Generalist).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDesigConfigModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Role Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Designation Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DESIGNATION_PERMISSION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (!newDesigTitle.trim()) setNewDesigTitle(preset.label);
                      setNewDesigAccessRole(preset.accessRole);
                      setNewDesigDataScope(preset.dataScope);
                      setNewDesigPerms(preset.permissionCodes);
                    }}
                    className="px-2.5 py-1 rounded-md border border-border bg-muted/30 hover:border-blue-500 hover:bg-blue-500/10 text-[11px] font-medium text-foreground transition-colors"
                    title={preset.titleHint}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddDesig} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Designation Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HR - Recruitment, HR Generalist"
                    value={newDesigTitle}
                    onChange={(e) => setNewDesigTitle(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Hierarchy Level</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newDesigLevel}
                      onChange={(e) => setNewDesigLevel(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Linked Dept</label>
                    <select
                      value={newDesigDeptId}
                      onChange={(e) => setNewDesigDeptId(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs"
                    >
                      <option value="">All / None</option>
                      {departments.map((rawD) => {
                        const dep = rawD.data !== undefined ? rawD.data : rawD;
                        return (
                          <option key={dep.id} value={dep.id}>
                            {dep.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Default Base Role</label>
                  <select
                    value={newDesigAccessRole}
                    onChange={(e) => setNewDesigAccessRole(e.target.value as any)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                  >
                    {/* LEGACY_ROLE_COMMENTED_OUT:
                    <option value="MEMBER">MEMBER</option>
                    <option value="MANAGER">MANAGER</option>
                    */}
                    <option value="MEMBER">Staff (Role / Designation)</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Default Data Access Scope</label>
                  <select
                    value={newDesigDataScope}
                    onChange={(e) => setNewDesigDataScope(e.target.value as any)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                  >
                    {DATA_SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Granular Permissions Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">
                    Designation Permissions ({newDesigPerms.length} selected)
                  </label>
                  {newDesigPerms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setNewDesigPerms([])}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border p-3 bg-muted/10 space-y-3">
                  {catalogModuleNames.map((modName) => {
                    const modPerms = effectiveCatalog.filter((p) => (p.module || 'General') === modName);
                    if (modPerms.length === 0) return null;
                    return (
                      <div key={modName} className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {MODULE_DISPLAY_NAMES[modName] || modName}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-1.5">
                          {modPerms.map((perm) => {
                            const checked = newDesigPerms.includes(perm.code);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-center gap-2 p-2 rounded border text-[11px] cursor-pointer ${
                                  checked
                                    ? 'border-blue-500/50 bg-blue-500/10 text-foreground'
                                    : 'border-border/70 bg-background text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setNewDesigPerms((prev) =>
                                      checked ? prev.filter((c) => c !== perm.code) : [...prev, perm.code],
                                    )
                                  }
                                  className="h-3.5 w-3.5 accent-blue-600"
                                />
                                <div className="min-w-0">
                                  <div className="font-mono font-semibold text-[10px] truncate">{perm.code}</div>
                                  <div className="text-[10px] opacity-80 truncate">{perm.name}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowDesigConfigModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Designation & Permissions
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
