'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
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
  Eye,
  EyeOff,
  CheckSquare,
  FolderKanban,
  CheckCheck,
  Crown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

// Human-friendly dictionary mapping raw database permissions into clear, actionable titles and descriptions
const PERMISSION_FRIENDLY_META: Record<string, { title: string; description: string }> = {
  // Approvals
  'approvals:approve': {
    title: 'Approve or Reject Requests',
    description: 'Authorize or reject operational submissions, leave applications, task completions, and expenses.',
  },
  'approvals:manage': {
    title: 'Configure Approval Chains',
    description: 'Define approval thresholds, routing rules, multi-stage workflows, and designated approvers.',
  },
  'approvals:view': {
    title: 'View Pending Approvals',
    description: 'Browse through active queues and inspect requests awaiting department or executive approval.',
  },

  // Attendance
  'attendance:clock': {
    title: 'Clock In, Out & Shift Tracker',
    description: 'Enables user to punch in for shifts, record meal/rest breaks, and track daily working hours.',
  },
  'attendance:edit': {
    title: 'Adjust Attendance Records',
    description: 'Modify time punch records, fix missed clocks, and manually update regular and overtime hours.',
  },
  'attendance:export': {
    title: 'Export Attendance Reports',
    description: 'Download full CSV and Excel summaries of team shift attendance, late arrivals, and total hours.',
  },
  'attendance:manage': {
    title: 'Full Attendance Administration',
    description: 'Configure shift schedules, overtime policies, grace periods, biometric sync, and attendance policies.',
  },
  'attendance:view': {
    title: 'View Attendance Records & History',
    description: 'View daily office presence, historical punch cards, timesheets, and attendance logs for staff.',
  },

  // Billing
  'billing:manage': {
    title: 'Manage Subscriptions & Billing',
    description: 'Change workspace plan tier, manage payment methods, download VAT/tax invoices, and adjust seats.',
  },

  // People
  'people:view': {
    title: 'View Employee Directory & Profiles',
    description: 'Search workspace member roster, view employee details, department placements, and contact cards.',
  },
  'people:create': {
    title: 'Add & Invite Team Members',
    description: 'Send invitation emails and onboard new hires into departments, reporting lines, and teams.',
  },
  'people:edit': {
    title: 'Edit Member Profiles & Assignments',
    description: 'Update designations, department assignments, reporting managers, core roles, and data scopes.',
  },
  'people:delete': {
    title: 'Deactivate & Offboard Members',
    description: 'Suspend workspace access, offboard employees, revoke active sessions, and reassign tasks.',
  },
  'people:export': {
    title: 'Export Member Directory',
    description: 'Download employee roster, staff IDs, department lists, and contact data into spreadsheets.',
  },
  'people:manage': {
    title: 'Full Workforce Administration',
    description: 'Comprehensive administration of team roster, role templates, access levels, and member records.',
  },

  // Projects
  'projects:view': {
    title: 'View Projects & Milestones',
    description: 'Access project boards, see created dates, assigners, deliverables, and progress trackers.',
  },
  'projects:create': {
    title: 'Create New Projects',
    description: 'Start new internal or client projects, set keys and prefixes, and define milestone schedules.',
  },
  'projects:edit': {
    title: 'Edit Project Settings & Scope',
    description: 'Modify project scope, update project assigners, assign team members, and adjust goals.',
  },
  'projects:delete': {
    title: 'Archive or Delete Projects',
    description: 'Retire finished initiatives or permanently remove canceled project records from workspace.',
  },
  'projects:manage': {
    title: 'Full Project Administration',
    description: 'Oversee all workspace projects, custom workflows, and global project portfolio rules.',
  },

  // Tasks
  'tasks:view': {
    title: 'View Tasks & Work Queue',
    description: 'Access work items, inspect progression percentages (0%, 25%, 75%, 100%), and review deadlines.',
  },
  'tasks:create': {
    title: 'Create & Assign Tasks',
    description: 'Create new work items, set estimated hours, configure priority, and assign team members.',
  },
  'tasks:edit': {
    title: 'Update Task Progress & Status',
    description: 'Transition tasks across stages (Todo, In Progress, In Review, Completed) and update notes.',
  },
  'tasks:delete': {
    title: 'Delete Work Items',
    description: 'Permanently remove duplicate, test, or invalid work items from the board.',
  },
  'tasks:assign': {
    title: 'Reassign Task Ownership',
    description: 'Transfer work items and delegate tasks between team members and specialists.',
  },
  'tasks:manage': {
    title: 'Full Work Queue Administration',
    description: 'Oversee all workspace tasks, workflow triggers, and team allocations.',
  },

  // Time
  'time:log': {
    title: 'Log Work Hours',
    description: 'Enter manual time entries against tasks and client projects for tracking and billing.',
  },
  'time:view': {
    title: 'View Time Sheets & Logs',
    description: 'Inspect logged hours, billable ratios, and team timesheet summaries.',
  },
  'time:approve': {
    title: 'Approve Timesheets',
    description: 'Authorize submitted weekly timesheets for payroll and billing calculations.',
  },
  'time:manage': {
    title: 'Configure Time Tracking Rules',
    description: 'Set maximum daily hours, billable rate categories, and timesheet submission periods.',
  },

  // Payroll
  'payroll:view': {
    title: 'View Payroll & Compensation',
    description: 'Access compensation records, salary bands, and calculated pay period reports.',
  },
  'payroll:calculate': {
    title: 'Run Payroll Calculations',
    description: 'Compute gross pay, allowances, overtime, and deductions for payroll cycles.',
  },
  'payroll:export': {
    title: 'Export Payroll & Bank Files',
    description: 'Generate bank transfer files, tax compliance reports, and pay stubs for distribution.',
  },
  'payroll:manage': {
    title: 'Full Compensation Administration',
    description: 'Manage salary structures, deduction formulas, and global payroll processing.',
  },

  // Quality
  'quality:view': {
    title: 'View Quality Audits',
    description: 'Browse QA scorecards, audit reviews, and compliance records across departments.',
  },
  'quality:audit': {
    title: 'Perform Quality Inspections',
    description: 'Audit deliverables, record defect logs, and score work item compliance against guidelines.',
  },
  'quality:manage': {
    title: 'Configure Quality Standards',
    description: 'Build audit checklists, defect classifications, and scoring thresholds.',
  },

  // SLA
  'sla:view': {
    title: 'View SLA Timers & Deadlines',
    description: 'Track resolution deadlines, breach countdowns, and escalation alerts in real time.',
  },
  'sla:manage': {
    title: 'Configure SLA Policies & Escalations',
    description: 'Define service level targets, warning thresholds, and executive alert chains.',
  },

  // Organization & Settings
  'org:manage': {
    title: 'Manage Organization Profile',
    description: 'Update company legal name, contact email, country, and logo.',
  },
  'invitations:manage': {
    title: 'Manage Invitations & Links',
    description: 'Resend, copy, or regenerate pending invitation links for members.',
  },
  'roles:manage': {
    title: 'Configure Custom Roles & Permissions',
    description: 'Create custom roles and fine-tune permission matrices for team roles.',
  },
  'departments:manage': {
    title: 'Manage Departments & Teams',
    description: 'Create, rename, and structure organizational departments and sub-teams.',
  },
  'settings:manage': {
    title: 'Manage Workspace Settings',
    description: 'Configure active modules, business type, and default workspace preferences.',
  },
};

const getPermissionMeta = (perm: any) => {
  const code = perm.code || '';
  if (PERMISSION_FRIENDLY_META[code]) {
    return {
      title: PERMISSION_FRIENDLY_META[code].title,
      description: PERMISSION_FRIENDLY_META[code].description,
      code,
    };
  }
  const title = perm.name || code.split(':')[1]?.replace(/_/g, ' ') || code;
  const description = `Controls access to the ${code} action within the ${perm.module || 'system'} module.`;
  return { title, description, code };
};

const getRoleDisplayTitle = (name?: string) => {
  if (!name) return 'Role';
  if (name === 'ADMIN') return 'HR EXECUTIVE';
  if (name === 'OWNER') return 'WORKSPACE OWNER';
  if (name === 'MANAGER') return 'OPERATIONS MANAGER';
  if (name === 'MEMBER') return 'TEAM MEMBER';
  return name;
};

const getRoleIcon = (name?: string) => {
  if (name === 'OWNER') return Crown;
  if (name === 'ADMIN') return ShieldAlert;
  if (name === 'MANAGER') return Briefcase;
  if (name === 'MEMBER') return UserCheck;
  return Sparkles;
};

const getRoleDescription = (r?: any) => {
  if (!r) return '';
  if (r.name === 'OWNER') {
    return 'Permanent root authority holding full, unrestricted access across all modules, billing, and organizational recovery.';
  }
  if (r.name === 'ADMIN') {
    return 'People Operations and HR Executives managing member onboarding, departments, structural permissions, and approvals.';
  }
  if (r.name === 'MANAGER') {
    return 'Team and operational leads managing projects, delegating work, approving timesheets, and auditing deliverables.';
  }
  if (r.name === 'MEMBER') {
    return 'Individual contributors completing assigned work items, logging attendance, and collaborating on projects.';
  }
  return r.description || 'Custom workspace role configured with specific module capabilities.';
};

const getModuleIcon = (modName: string) => {
  const lower = modName.toLowerCase();
  if (lower.includes('approval')) return CheckCheck;
  if (lower.includes('attendance')) return Clock;
  if (lower.includes('people') || lower.includes('invitation')) return Users;
  if (lower.includes('project')) return FolderKanban;
  if (lower.includes('task') || lower.includes('work')) return CheckSquare;
  if (lower.includes('time')) return Clock;
  if (lower.includes('payroll') || lower.includes('billing')) return CreditCard;
  if (lower.includes('quality')) return Award;
  if (lower.includes('sla')) return ShieldAlert;
  if (lower.includes('setting') || lower.includes('org') || lower.includes('role') || lower.includes('department')) return SettingsIcon;
  return Shield;
};

const getModuleColorClass = (modName: string) => {
  const lower = modName.toLowerCase();
  if (lower.includes('approval')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  if (lower.includes('attendance')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (lower.includes('people')) return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
  if (lower.includes('project')) return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
  if (lower.includes('task')) return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
  if (lower.includes('payroll')) return 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20';
  if (lower.includes('billing')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  if (lower.includes('quality')) return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
  if (lower.includes('sla')) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  return 'text-primary bg-primary/10 border-primary/20';
};

interface MatrixFeatureItem {
  id: string;
  title: string;
  category: 'Time & Attendance' | 'Performance & Productivity' | 'Workforce & HR' | 'Communication & Collaboration' | 'Administration & Governance';
  description: string;
  defaultMaster: boolean;
  defaultRoles: {
    admin: boolean;
    ops: boolean;
    hr: boolean;
    tl: boolean;
    emp: boolean;
  };
  permissionCodes?: string[];
}

const MATRIX_CATEGORIES = [
  'All',
  'Time & Attendance',
  'Performance & Productivity',
  'Workforce & HR',
  'Communication & Collaboration',
  'Administration & Governance',
] as const;

const ROLE_COLUMNS: { key: 'admin' | 'ops' | 'hr' | 'tl' | 'emp'; label: string; systemRoleName?: string }[] = [
  { key: 'admin', label: 'Admin / CEO', systemRoleName: 'ADMIN' },
  { key: 'ops', label: 'Operations Head', systemRoleName: 'MANAGER' },
  { key: 'hr', label: 'HR', systemRoleName: 'ADMIN' },
  { key: 'tl', label: 'Team Lead (TL)', systemRoleName: 'MANAGER' },
  { key: 'emp', label: 'Employee', systemRoleName: 'MEMBER' },
];

const FEATURE_MATRIX_ITEMS: MatrixFeatureItem[] = [
  // 1. Time & Attendance
  {
    id: 'checkin_checkout',
    title: 'Check-In & Check-Out',
    category: 'Time & Attendance',
    description: 'Enables staff check-in and check-out tracking with live shift duration calculations.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: true },
    permissionCodes: ['attendance:clock', 'attendance:view'],
  },
  {
    id: 'break_tracking',
    title: 'Break Tracking (Tea & Lunch)',
    category: 'Time & Attendance',
    description: 'Enables taking scheduled breaks with active countdown timers and total break duration logging.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: true },
    permissionCodes: ['attendance:clock'],
  },
  {
    id: 'no_volume_duration',
    title: 'No Volume Work Duration Tracking',
    category: 'Time & Attendance',
    description: 'Enables logging idle / no-volume periods with separate duration recording and amber status.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: true },
    permissionCodes: ['attendance:clock', 'tasks:view'],
  },
  {
    id: 'afk_inactivity_session_lock',
    title: 'AFK Inactivity Check & Session Lock',
    category: 'Time & Attendance',
    description: 'Monitors cursor activity, triggers 3-minute prompts and 45-second verification pings with 3-attempt escalation lock.',
    defaultMaster: true,
    defaultRoles: { admin: false, ops: false, hr: false, tl: false, emp: true },
    permissionCodes: [],
  },
  {
    id: 'shift_scheduling_roster',
    title: 'Shift Scheduling & Roster Planner',
    category: 'Time & Attendance',
    description: 'Manages day, evening, and night work shifts and employee roster scheduling.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: false },
    permissionCodes: ['attendance:manage'],
  },
  {
    id: 'attendance_regularization_logs',
    title: 'Attendance Regularization & Detailed Logs',
    category: 'Time & Attendance',
    description: 'Allows viewing, auditing, and regularizing staff attendance punch logs.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: false },
    permissionCodes: ['attendance:edit', 'attendance:export'],
  },

  // 2. Performance & Productivity
  {
    id: 'daily_performance_analytics',
    title: 'Daily Performance & Excel Analytics',
    category: 'Performance & Productivity',
    description: 'Daily target tracking, hourly volume calculation, speed scores, and automated Excel work report generation.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: false },
    permissionCodes: ['analytics:view', 'work_items:view'],
  },
  {
    id: 'quality_audits_defects',
    title: 'Quality Audits & Defect Logging',
    category: 'Performance & Productivity',
    description: 'QA scoring, sampling rates, error categorization, root-cause tags, and dispute resolution workflows.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: false, tl: true, emp: false },
    permissionCodes: ['quality:audit', 'quality:manage'],
  },
  {
    id: 'incentive_bonus_engine',
    title: 'Incentive & Bonus Calculation Engine',
    category: 'Performance & Productivity',
    description: 'Tiered productivity payout matrices, speed bonuses, penalty deductions, and monthly payroll export.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: false, emp: false },
    permissionCodes: ['payroll:view', 'payroll:export'],
  },
  {
    id: 'work_progression_blockers',
    title: 'Work Item Milestones & Blocker Escalation',
    category: 'Performance & Productivity',
    description: 'Task progression milestones, dependency blocker resolution, and SLA breach automated warnings.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: false, tl: true, emp: true },
    permissionCodes: ['tasks:assign', 'tasks:delete'],
  },

  // 3. Workforce & HR
  {
    id: 'employee_onboarding_lifecycle',
    title: 'Employee Onboarding & Member Directory',
    category: 'Workforce & HR',
    description: 'Invite workspace staff, designate organizational positions, collect KYC records, and manage access scopes.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: false, emp: false },
    permissionCodes: ['people:manage', 'people:export', 'invitations:manage'],
  },
  {
    id: 'dept_team_hierarchy',
    title: 'Department & Operational Hierarchy',
    category: 'Workforce & HR',
    description: 'Configure multi-level departments, sub-teams, reporting line managers, and pod allocations.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: false, emp: false },
    permissionCodes: ['departments:manage'],
  },
  {
    id: 'leave_policies_planner',
    title: 'Leave Policies & Holiday Planner',
    category: 'Workforce & HR',
    description: 'Annual leave balance accruals, compensatory-off requests, statutory holiday calendars, and approval flows.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: true },
    permissionCodes: ['approvals:view', 'approvals:approve'],
  },

  // 4. Communication & Collaboration
  {
    id: 'team_broadcasts_notices',
    title: 'Team Broadcasts & Priority Notices',
    category: 'Communication & Collaboration',
    description: 'Workspace-wide company announcements, policy alerts, critical updates, and acknowledgment receipts.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: false },
    permissionCodes: ['approvals:manage'],
  },
  {
    id: 'work_discussions_notes',
    title: 'Discussions & Work Context Notes',
    category: 'Communication & Collaboration',
    description: 'Internal task collaboration notes, thread discussions, mentions, and file attachments.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: true, tl: true, emp: true },
    permissionCodes: [],
  },

  // 5. Administration & Governance
  {
    id: 'org_settings_branding',
    title: 'Organization Settings & Custom Branding',
    category: 'Administration & Governance',
    description: 'Company branding, workspace theme colors, timezone configurations, and regional defaults.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: false, hr: false, tl: false, emp: false },
    permissionCodes: ['settings:manage'],
  },
  {
    id: 'subscription_invoicing',
    title: 'Subscription, Seats & Invoicing',
    category: 'Administration & Governance',
    description: 'Plan tier upgrades, user seat licensing, billing history, payment methods, and automated invoicing.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: false, hr: false, tl: false, emp: false },
    permissionCodes: ['billing:manage'],
  },
  {
    id: 'tamper_proof_audit_logs',
    title: 'Tamper-Proof Audit & Security Logs',
    category: 'Administration & Governance',
    description: 'Immutable audit trails of staff authentication, permission modifications, role reassignments, and exports.',
    defaultMaster: true,
    defaultRoles: { admin: true, ops: true, hr: false, tl: false, emp: false },
    permissionCodes: ['roles:manage'],
  },
];

type FeatureMatrixState = Record<
  string,
  {
    master: boolean;
    roles: {
      admin: boolean;
      ops: boolean;
      hr: boolean;
      tl: boolean;
      emp: boolean;
    };
  }
>;

const getInitialMatrixState = (): FeatureMatrixState => {
  const initial: FeatureMatrixState = {};
  FEATURE_MATRIX_ITEMS.forEach((item) => {
    initial[item.id] = {
      master: item.defaultMaster,
      roles: { ...item.defaultRoles },
    };
  });
  return initial;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'details' | 'modules' | 'roles' | 'structure' | 'billing' | 'security'>('details');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  // Security & 2FA states
  const [userProfile, setUserProfile] = useState<any>(null);
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
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [permFilterStatus, setPermFilterStatus] = useState<'all' | 'granted' | 'revoked'>('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');
  const [rolesViewMode, setRolesViewMode] = useState<'detail' | 'matrix'>('detail');

  // Feature Access & Role Matrix state (Requirement: Feature Access & Role Matrix matching spec)
  const [selectedMatrixCategory, setSelectedMatrixCategory] = useState<string>('All');
  const [matrixSearchQuery, setMatrixSearchQuery] = useState<string>('');
  const [matrixState, setMatrixState] = useState<FeatureMatrixState>(getInitialMatrixState);
  const [showAdvancedRoleTools, setShowAdvancedRoleTools] = useState<boolean>(false);
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orvexa_feature_access_matrix_v1');
        if (saved) {
          setMatrixState(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to parse saved matrix state', e);
      }
    }
  }, []);

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

  // Structure state (Departments, Teams, Designations)
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDeptId, setNewTeamDeptId] = useState('');
  const [newDesigTitle, setNewDesigTitle] = useState('');
  const [newDesigLevel, setNewDesigLevel] = useState(1);

  // Structure Edit state
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptCode, setEditDeptCode] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDeptId, setEditTeamDeptId] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  const [editingDesigId, setEditingDesigId] = useState<string | null>(null);
  const [editDesigTitle, setEditDesigTitle] = useState('');
  const [editDesigLevel, setEditDesigLevel] = useState(1);
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

      const [wsRes, rolesRes, permsRes, deptsRes, teamsRes, desigRes, subRes, planRes, meRes] = await Promise.all([
        currentWsId ? fetch(`${BRANDING.apiUrl}/workspaces/${currentWsId}`, { headers: activeHeaders }) : Promise.resolve(null),
        fetch(`${BRANDING.apiUrl}/roles`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/roles/permissions`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/departments`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/teams`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/designations`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/subscriptions/current`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/subscriptions/plans`),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers: activeHeaders }),
      ]);

      if (meRes) {
        const rawMe = await meRes.json();
        const meData = rawMe.data !== undefined ? rawMe.data : rawMe;
        if (meData && meData.id) setUserProfile(meData);
      }

      if (wsRes) {
        const rawWs = await wsRes.json();
        const wsData = rawWs.data !== undefined ? rawWs.data : rawWs;
        if (wsData && wsData.id) {
          setWorkspace(wsData);
          setName(wsData.name || '');
          setBusinessType(wsData.businessType || 'GENERAL');
          if (wsData.settings) {
            setCountry(wsData.settings.country || 'United States');
            setTimezone(wsData.settings.timezone || 'UTC-05:00 (Eastern Time)');
            setEnabledModules(wsData.settings.enabledModules || [
              'people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'leave', 'approvals', 'quality', 'sla', 'clients', 'billing'
            ]);
          }
        }
      }

      const rawRoles = await rolesRes.json();
      const rolesData = rawRoles.data !== undefined ? rawRoles.data : rawRoles;
      if (Array.isArray(rolesData)) {
        setRoles(rolesData);
        if (rolesData.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rolesData[0].id);
        }
      }

      const rawPerms = await permsRes.json();
      const permsData = rawPerms.data !== undefined ? rawPerms.data : rawPerms;
      if (Array.isArray(permsData)) setAllPermissions(permsData);

      const rawDepts = await deptsRes.json();
      const deptsData = rawDepts.data !== undefined ? rawDepts.data : rawDepts;
      if (Array.isArray(deptsData)) setDepartments(deptsData);

      const rawTeams = await teamsRes.json();
      const teamsData = rawTeams.data !== undefined ? rawTeams.data : rawTeams;
      if (Array.isArray(teamsData)) setTeams(teamsData);

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
      if (tabParam && ['details', 'modules', 'roles', 'structure', 'billing', 'security'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
    loadAllData();
  }, []);

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

  // Handler 2: Apply Profile Layout
  const handleApplyPreset = async (profileId: string) => {
    let presetModules = [
      'people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'leave', 'approvals', 'quality', 'sla', 'clients', 'billing'
    ];
    if (profileId === 'CORE_OPS') {
      presetModules = ['people', 'work_queue', 'quality', 'sla', 'time', 'attendance', 'leave', 'approvals'];
    } else if (profileId === 'PROJECTS_DELIVERY') {
      presetModules = ['people', 'projects', 'tasks', 'time', 'clients', 'approvals'];
    } else if (profileId === 'LEAN_SERVICES') {
      presetModules = ['people', 'projects', 'tasks', 'approvals', 'time', 'billing'];
    }

    setBusinessType(profileId);
    setEnabledModules(presetModules);

    try {
      await fetch(`${BRANDING.apiUrl}/workspaces/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          businessType: profileId,
          settings: { enabledModules: presetModules },
        }),
      });
      toast.success(`Applied ${profileId} operational profile!`);
    } catch (err: any) {
      toast.error('Error applying operational profile');
    }
  };

  // Handler 3: Save Module Entitlements
  const handleSaveModules = async () => {
    setSavingModules(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          settings: { enabledModules },
        }),
      });

      if (!res.ok) throw new Error('Failed to update modules');
      toast.success('Workspace module entitlements updated!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving modules');
    } finally {
      setSavingModules(false);
    }
  };

  const toggleModule = (modKey: string) => {
    if (enabledModules.includes(modKey)) {
      setEnabledModules(enabledModules.filter((m) => m !== modKey));
    } else {
      setEnabledModules([...enabledModules, modKey]);
    }
  };

  // Handler 4: Create Custom Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDesc.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create role');
      const data = await res.json();
      const newRole = data.data !== undefined ? data.data : data;
      toast.success('Custom role created!');
      setNewRoleName('');
      setNewRoleDesc('');
      setRoles([...roles, newRole]);
      setSelectedRoleId(newRole.id);
    } catch (err: any) {
      toast.error(err.message || 'Error creating role');
    } finally {
      setCreatingRole(false);
    }
  };

  // Handler 5: Toggle Role Permission
  const handleTogglePermission = async (roleId: string, permId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const currentPermIds: string[] = (role.permissions || []).map((p: any) => p.permissionId || p.id || p);
    let updatedPermIds: string[];

    if (currentPermIds.includes(permId)) {
      updatedPermIds = currentPermIds.filter((id) => id !== permId);
    } else {
      updatedPermIds = [...currentPermIds, permId];
    }

    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}/permissions`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ permissionIds: updatedPermIds }),
      });

      if (!res.ok) throw new Error('Failed to update permissions');

      setRoles(
        roles.map((r) => {
          if (r.id === roleId) {
            return {
              ...r,
              permissions: updatedPermIds.map((id) => ({ permissionId: id })),
            };
          }
          return r;
        }),
      );
      toast.success('Role permissions updated');
    } catch (err: any) {
      toast.error(err.message || 'Error updating role permission');
    }
  };

  // Handler 5a: Batch Toggle Module Permissions (Grant All / Revoke All for a Module)
  const handleBatchToggleModulePermissions = async (roleId: string, permIds: string[], grantAll: boolean) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.name === 'OWNER' || !role.isActive) return;

    const currentPermIds: string[] = (role.permissions || []).map((p: any) => p.permissionId || p.id || p);
    let updatedPermIds: string[];

    if (grantAll) {
      const set = new Set([...currentPermIds, ...permIds]);
      updatedPermIds = Array.from(set);
    } else {
      const toRemove = new Set(permIds);
      updatedPermIds = currentPermIds.filter((id) => !toRemove.has(id));
    }

    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}/permissions`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ permissionIds: updatedPermIds }),
      });

      if (!res.ok) throw new Error('Failed to update permissions');

      setRoles(
        roles.map((r) => {
          if (r.id === roleId) {
            return {
              ...r,
              permissions: updatedPermIds.map((id) => ({ permissionId: id })),
            };
          }
          return r;
        }),
      );
      toast.success(grantAll ? 'All module permissions granted' : 'Module permissions revoked');
    } catch (err: any) {
      toast.error(err.message || 'Error updating permissions');
    }
  };

  // Handler 5a2: Toggle All Role Permissions (Full Access / Clear All)
  const handleToggleAllRolePermissions = async (roleId: string, grantAll: boolean) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.name === 'OWNER' || !role.isActive) return;

    const updatedPermIds = grantAll ? allPermissions.map((p) => p.id) : [];

    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}/permissions`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ permissionIds: updatedPermIds }),
      });

      if (!res.ok) throw new Error('Failed to update permissions');

      setRoles(
        roles.map((r) => {
          if (r.id === roleId) {
            return {
              ...r,
              permissions: updatedPermIds.map((id) => ({ permissionId: id })),
            };
          }
          return r;
        }),
      );
      toast.success(grantAll ? 'Full platform access granted to role' : 'All permissions cleared from role');
    } catch (err: any) {
      toast.error(err.message || 'Error updating permissions');
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
      toast.success('Role updated successfully');
      setRoles(roles.map((r) => (r.id === roleId ? data : r)));
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

  // Handler 5g: Category Scroll Navigation for Feature Matrix
  const handleScrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const updateCategoryScrollProgress = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      setScrollProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
    }
  };

  // Handler 5h: Toggle Feature Master Switch
  const handleToggleMasterSwitch = (featureId: string) => {
    setMatrixState((prev) => {
      const current = prev[featureId] || {
        master: true,
        roles: { admin: true, ops: true, hr: true, tl: true, emp: true },
      };
      const nextMasterState = !current.master;
      const updated = {
        ...prev,
        [featureId]: {
          ...current,
          master: nextMasterState,
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('orvexa_feature_access_matrix_v1', JSON.stringify(updated));
      }
      const feat = FEATURE_MATRIX_ITEMS.find((f) => f.id === featureId);
      toast.success(`${feat?.title || 'Feature'} ${nextMasterState ? 'Enabled' : 'Disabled'}`);
      return updated;
    });
  };

  // Handler 5i: Toggle Feature Role Permission & Sync Backend
  const handleToggleFeatureRole = async (featureId: string, roleKey: 'admin' | 'ops' | 'hr' | 'tl' | 'emp') => {
    const feat = FEATURE_MATRIX_ITEMS.find((f) => f.id === featureId);
    const roleDef = ROLE_COLUMNS.find((r) => r.key === roleKey);
    let nextVal = false;

    setMatrixState((prev) => {
      const current = prev[featureId] || {
        master: true,
        roles: { admin: true, ops: true, hr: true, tl: true, emp: true },
      };
      nextVal = !current.roles[roleKey];
      const updated = {
        ...prev,
        [featureId]: {
          ...current,
          roles: {
            ...current.roles,
            [roleKey]: nextVal,
          },
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('orvexa_feature_access_matrix_v1', JSON.stringify(updated));
      }
      toast.success(`${feat?.title}: ${roleDef?.label} ${nextVal ? 'Granted' : 'Revoked'}`);
      return updated;
    });

    // Sync to backend role permissions if mapped
    if (feat?.permissionCodes && feat.permissionCodes.length > 0 && roleDef?.systemRoleName) {
      const targetRole = roles.find((r) => r.name === roleDef.systemRoleName);
      if (targetRole && targetRole.id && targetRole.name !== 'OWNER') {
        const matchedPermIds = allPermissions
          .filter((p) => feat.permissionCodes?.includes(p.code))
          .map((p) => p.id);

        if (matchedPermIds.length > 0) {
          const currentPermIds: string[] = (targetRole.permissions || []).map((p: any) => p.permissionId || p.id || p);
          let updatedPermIds: string[];
          if (nextVal) {
            updatedPermIds = Array.from(new Set([...currentPermIds, ...matchedPermIds]));
          } else {
            const toRemove = new Set(matchedPermIds);
            updatedPermIds = currentPermIds.filter((id) => !toRemove.has(id));
          }

          try {
            await fetch(`${BRANDING.apiUrl}/roles/${targetRole.id}/permissions`, {
              method: 'PATCH',
              headers: getHeaders(),
              body: JSON.stringify({ permissionIds: updatedPermIds }),
            });
            setRoles((prevRoles) =>
              prevRoles.map((r) =>
                r.id === targetRole.id
                  ? { ...r, permissions: updatedPermIds.map((id) => ({ permissionId: id })) }
                  : r
              )
            );
          } catch (e) {
            console.warn('Backend permission sync warning:', e);
          }
        }
      }
    }
  };

  // Handler 5j: Reset Matrix to Default Configuration
  const handleResetMatrixDefaults = () => {
    if (!confirm('Are you sure you want to reset all features and role access to system defaults?')) {
      return;
    }
    const initial: FeatureMatrixState = {};
    FEATURE_MATRIX_ITEMS.forEach((item) => {
      initial[item.id] = {
        master: item.defaultMaster,
        roles: { ...item.defaultRoles },
      };
    });
    setMatrixState(initial);
    if (typeof window !== 'undefined') {
      localStorage.setItem('orvexa_feature_access_matrix_v1', JSON.stringify(initial));
    }
    toast.success('Feature matrix reset to default access configuration');
  };

  // Handler 5k: Export Matrix Configuration as JSON
  const handleExportMatrix = () => {
    const exportData = FEATURE_MATRIX_ITEMS.map((item) => {
      const state = matrixState[item.id] || { master: item.defaultMaster, roles: item.defaultRoles };
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description,
        masterSwitch: state.master ? 'Enabled' : 'Disabled',
        admin_ceo: state.roles.admin ? 'On' : 'Off',
        operationsHead: state.roles.ops ? 'On' : 'Off',
        hr: state.roles.hr ? 'On' : 'Off',
        teamLead: state.roles.tl ? 'On' : 'Off',
        employee: state.roles.emp ? 'On' : 'Off',
      };
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orvexa-feature-role-matrix-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Matrix configuration exported successfully');
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
        body: JSON.stringify({ name: newTeamName.trim(), departmentId: newTeamDeptId || undefined }),
      });
      if (!res.ok) throw new Error('Failed to add team');
      const data = await res.json();
      const newTeam = data.data !== undefined ? data.data : data;
      setTeams([...teams, newTeam]);
      setNewTeamName('');
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
  };

  const cancelEditTeam = () => {
    setEditingTeamId(null);
    setEditTeamName('');
    setEditTeamDeptId('');
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
        }),
      });
      if (!res.ok) throw new Error('Failed to update team');
      const data = await res.json();
      const updated = data.data !== undefined ? data.data : data;
      const matchingDept = departments.find((d) => (d.id || d.data?.id) === editTeamDeptId);
      setTeams((prev) =>
        prev.map((t) => {
          const tid = t.id || t.data?.id;
          if (tid === id) {
            return {
              ...(t.data !== undefined ? t.data : t),
              name: editTeamName.trim(),
              departmentId: editTeamDeptId || null,
              department: matchingDept ? (matchingDept.data !== undefined ? matchingDept.data : matchingDept) : null,
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

  // Handler 8: Create Designation
  const handleAddDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesigTitle.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/designations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title: newDesigTitle.trim(), level: Number(newDesigLevel) }),
      });
      if (!res.ok) throw new Error('Failed to add designation');
      const data = await res.json();
      const newDesig = data.data !== undefined ? data.data : data;
      setDesignations([...designations, newDesig]);
      setNewDesigTitle('');
      toast.success('Designation created');
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
  };

  const cancelEditDesig = () => {
    setEditingDesigId(null);
    setEditDesigTitle('');
    setEditDesigLevel(1);
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
        }),
      });
      if (!res.ok) throw new Error('Failed to update designation');
      const data = await res.json();
      const updated = data.data !== undefined ? data.data : data;
      setDesignations((prev) =>
        prev.map((d) => {
          const did = d.id || d.data?.id;
          if (did === id) {
            return {
              ...(d.data !== undefined ? d.data : d),
              title: editDesigTitle.trim(),
              level: Number(editDesigLevel) || 1,
              ...(updated && typeof updated === 'object' ? updated : {}),
            };
          }
          return d;
        })
      );
      cancelEditDesig();
      toast.success('Designation updated successfully');
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
  ];

  // Operational Profile Presets
  const templatePresets = [
    { id: 'GENERAL', name: 'Comprehensive Suite', icon: Sparkles, desc: 'Universal operations workspace with all modules and engines enabled.' },
    { id: 'CORE_OPS', name: 'Core Operations', icon: LayoutGrid, desc: 'Optimized for high-throughput processing queues, QA audits, SLAs, and attendance.' },
    { id: 'PROJECTS_DELIVERY', name: 'Projects & Delivery', icon: Briefcase, desc: 'Optimized for projects, tasks, milestones, approvals, and client delivery.' },
    { id: 'LEAN_SERVICES', name: 'Lean Professional Services', icon: DollarSign, desc: 'Optimized for client deliverables, approval chains, time logging, and billing.' },
  ];

  const selectedRoleObj = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Workspace Settings & Customization</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure organization metadata, module entitlements, roles, structure, and subscriptions.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
          Workspace ID: {wsId?.slice(0, 8)}...
        </Badge>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-2">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'details'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" /> Organization Details
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'modules'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="h-4 w-4" /> Modules & Features
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'roles'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-4 w-4" /> Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'structure'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" /> Org Structure
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'billing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="h-4 w-4" /> Subscription & Billing
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <KeyRound className="h-4 w-4" /> Security & 2FA
        </button>
      </div>

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

          {/* Operational Profile Customization */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Operational Profile Layouts (Optional)</CardTitle>
                  <CardDescription>
                    Apply a recommended operational module profile anytime. Profiles set starting module layouts and can be customized at any time.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="uppercase font-mono text-[10px]">
                  Current: {businessType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {templatePresets.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isCurrent = businessType === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="h-4 w-4" />
                        </div>
                        {isCurrent ? (
                          <Badge variant="default" className="text-[10px]">Active</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] px-2"
                            onClick={() => handleApplyPreset(tmpl.id)}
                          >
                            Apply Preset
                          </Button>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{tmpl.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{tmpl.desc}</p>
                    </div>
                  );
                })}
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
            <Button onClick={handleSaveModules} disabled={savingModules} size="sm">
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
                    onClick={() => toggleModule(mod.key)}
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

      {/* TAB 3: Roles & Permissions (Workspace Roles as Column + Row-Wise Permission Access) */}
      {activeTab === 'roles' && (() => {
        // Group all permissions by module for the row-wise view
        const groupedPermissions: Record<string, any[]> = {};
        allPermissions.forEach((p) => {
          const mod = (p.module || 'system').toUpperCase();
          if (!groupedPermissions[mod]) groupedPermissions[mod] = [];
          groupedPermissions[mod].push(p);
        });

        const isOwnerRole = selectedRoleObj?.name === 'OWNER';
        const grantedPermIds = new Set(
          isOwnerRole
            ? allPermissions.map((p) => p.id)
            : (selectedRoleObj?.permissions || []).map((p: any) => p.permissionId || p.id || p)
        );

        // Filter permissions based on search query, module filter, and status filter
        const matchingModules = Object.entries(groupedPermissions)
          .map(([modName, perms]) => {
            if (selectedModuleFilter !== 'ALL' && modName !== selectedModuleFilter.toUpperCase()) {
              return null;
            }

            const filteredPerms = perms.filter((perm) => {
              const isGranted = grantedPermIds.has(perm.id);
              if (permFilterStatus === 'granted' && !isGranted) return false;
              if (permFilterStatus === 'revoked' && isGranted) return false;

              if (!permSearchQuery.trim()) return true;
              const q = permSearchQuery.toLowerCase();
              const meta = getPermissionMeta(perm);
              return (
                perm.code?.toLowerCase().includes(q) ||
                meta.title.toLowerCase().includes(q) ||
                meta.description.toLowerCase().includes(q) ||
                modName.toLowerCase().includes(q)
              );
            });

            if (filteredPerms.length === 0) return null;
            return [modName, filteredPerms] as [string, any[]];
          })
          .filter(Boolean) as [string, any[]][];

        const totalFilteredCount = matchingModules.reduce((acc, [, perms]) => acc + perms.length, 0);

        // Matrix View filtered features
        const filteredFeatures = FEATURE_MATRIX_ITEMS.filter((item) => {
          const matchesCategory =
            selectedMatrixCategory === 'All' || item.category === selectedMatrixCategory;
          const matchesSearch =
            !matrixSearchQuery.trim() ||
            item.title.toLowerCase().includes(matrixSearchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(matrixSearchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(matrixSearchQuery.toLowerCase());
          return matchesCategory && matchesSearch;
        });

        return (
          <div className="space-y-6">
            {/* Top Toolbar: View Mode Toggle & Global Utilities */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100/80">
                  <button
                    type="button"
                    onClick={() => setRolesViewMode('detail')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      rolesViewMode === 'detail'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    Role View (Column & Row-Wise)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRolesViewMode('matrix')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      rolesViewMode === 'matrix'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-[#0D7A70]" />
                    All-Roles Matrix Table
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportMatrix}
                  className="text-xs h-8 gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Export Matrix
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedRoleTools(!showAdvancedRoleTools)}
                  className="text-xs h-8 gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                >
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  {showAdvancedRoleTools ? 'Hide Diagnostics' : 'Access Diagnostics'}
                </Button>
              </div>
            </div>

            {/* PRIMARY VIEW: Workspace Roles as Column + Row-Wise Permission Access */}
            {rolesViewMode === 'detail' && (
              <div className="grid gap-6 lg:grid-cols-3 items-start">
                {/* COLUMN 1 (Left): Workspace Roles (Exact match of reference image) */}
                <div className="space-y-4">
                  <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Shield className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-900">
                              Workspace Roles
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                              Select a role to inspect or edit permissions
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs font-normal bg-slate-100 text-slate-600 border border-slate-200/60 px-2 py-0.5 rounded-md">
                          {roles.length} roles
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5 pt-3.5 px-3.5 pb-3.5">
                      {roles.map((r) => {
                        const isSelected = selectedRoleId === r.id;
                        const RoleIcon = getRoleIcon(r.name);
                        const displayName = getRoleDisplayTitle(r.name);
                        const assignedPermCount = r.name === 'OWNER' ? allPermissions.length : (r.permissions || []).length;

                        return (
                          <div
                            key={r.id}
                            onClick={() => setSelectedRoleId(r.id)}
                            className={`cursor-pointer p-3.5 rounded-xl text-xs transition-all border ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/40 text-blue-950 shadow-xs ring-1 ring-blue-500/40'
                                : 'border-slate-200/80 bg-white hover:bg-slate-50/80 hover:border-slate-300 text-slate-900'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  <RoleIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-slate-900">{displayName}</span>
                                    {!r.isActive && (
                                      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-600 bg-amber-50 px-1 py-0">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {r.isSystemRole ? 'Core Platform' : 'Custom Organization Role'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {r.isSystemRole ? (
                                  <Badge variant="outline" className="text-[11px] font-normal bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                                    System
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                    {r._count?.memberships || 0} members
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                              <span className="truncate max-w-[190px] font-medium text-slate-500">
                                {r.name === 'OWNER' ? 'Full platform access' : `${assignedPermCount} permissions active`}
                              </span>
                              <span className={`font-semibold text-xs ${isSelected ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                                {isSelected ? 'Selected' : 'View'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Selected Custom Role Lifecycle Actions */}
                  {selectedRoleObj && !selectedRoleObj.isSystemRole && (
                    <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">Role Management</CardTitle>
                        <CardDescription className="text-xs text-slate-500">Manage lifecycle for {selectedRoleObj.name}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {editingRoleId === selectedRoleObj.id ? (
                          <div className="space-y-2 border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                            <input
                              type="text"
                              value={editRoleName}
                              onChange={(e) => setEditRoleName(e.target.value)}
                              placeholder="Role Name"
                              className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              value={editRoleDesc}
                              onChange={(e) => setEditRoleDesc(e.target.value)}
                              placeholder="Description"
                              className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-xs"
                            />
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleRenameRole(selectedRoleObj.id)}>
                                Save Changes
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRoleId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 justify-start text-slate-700"
                              onClick={() => {
                                setEditingRoleId(selectedRoleObj.id);
                                setEditRoleName(selectedRoleObj.name);
                                setEditRoleDesc(selectedRoleObj.description || '');
                              }}
                            >
                              Rename / Edit Description
                            </Button>
                            {selectedRoleObj.isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => handleDeactivateRole(selectedRoleObj.id)}
                              >
                                Deactivate Role
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleReactivateRole(selectedRoleObj.id)}
                              >
                                Reactivate Role
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 justify-start text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingRoleId(selectedRoleObj.id)}
                            >
                              Delete Custom Role
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Create Custom Role Box */}
                  <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">Create Custom Role</CardTitle>
                      <CardDescription className="text-xs text-slate-500">Define specialized organizational permission sets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateRole} className="space-y-2.5">
                        <input
                          type="text"
                          required
                          placeholder="Role Title (e.g. Auditor Level 2)"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={newRoleDesc}
                          onChange={(e) => setNewRoleDesc(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                        />
                        <Button type="submit" disabled={creatingRole} size="sm" className="w-full text-xs h-8">
                          {creatingRole ? 'Creating...' : '+ Create Role'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* COLUMN 2 (Right): Permission Access (ROW-WISE) */}
                <div className="lg:col-span-2 space-y-4">
                  <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
                    {/* Role Header Banner */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                            {(() => {
                              const IconComp = getRoleIcon(selectedRoleObj?.name);
                              return <IconComp className="h-5 w-5" />;
                            })()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                Permissions for {getRoleDisplayTitle(selectedRoleObj?.name)}
                              </h2>
                              {selectedRoleObj?.isActive ? (
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-50 text-[10px] px-2 py-0.5">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500/30 text-amber-700 bg-amber-50 text-[10px] px-2 py-0.5">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {getRoleDescription(selectedRoleObj)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <Badge variant="secondary" className="text-xs font-mono bg-white border border-slate-200 text-slate-700 px-2.5 py-1">
                            {selectedRoleObj?.name === 'OWNER'
                              ? `${allPermissions.length} / ${allPermissions.length} granted`
                              : `${(selectedRoleObj?.permissions || []).length} / ${allPermissions.length} granted`}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Search & Filter Controls */}
                    <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={permSearchQuery}
                            onChange={(e) => setPermSearchQuery(e.target.value)}
                            placeholder="Search permissions by name, description, or code..."
                            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 placeholder:text-slate-400"
                          />
                        </div>

                        {/* Filter Status: All | Granted | Revoked */}
                        <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50/80 shrink-0">
                          {(['all', 'granted', 'revoked'] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setPermFilterStatus(status)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all cursor-pointer ${
                                permFilterStatus === status
                                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Module Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        <button
                          type="button"
                          onClick={() => setSelectedModuleFilter('ALL')}
                          className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                            selectedModuleFilter === 'ALL'
                              ? 'bg-[#0D7A70] text-white shadow-2xs font-semibold'
                              : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          All Modules
                        </button>
                        {Array.from(new Set(allPermissions.map((p) => p.module || 'system'))).sort().map((mod) => (
                          <button
                            key={mod}
                            type="button"
                            onClick={() => setSelectedModuleFilter(mod)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all uppercase shrink-0 cursor-pointer ${
                              selectedModuleFilter === mod
                                ? 'bg-[#0D7A70] text-white shadow-2xs font-semibold'
                                : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {mod}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permission Access ROW-WISE List */}
                    <CardContent className="p-4 sm:p-5 space-y-6">
                      {matchingModules.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                          <Search className="h-6 w-6 text-slate-400 mx-auto opacity-60" />
                          <p className="text-sm font-semibold text-slate-800">No permissions found</p>
                          <p className="text-xs text-slate-500">
                            No permissions match &quot;{permSearchQuery}&quot; with current filter status.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPermSearchQuery('');
                              setPermFilterStatus('all');
                              setSelectedModuleFilter('ALL');
                            }}
                            className="mt-2 text-xs text-[#0D7A70] font-semibold hover:underline cursor-pointer"
                          >
                            Reset Search & Filters
                          </button>
                        </div>
                      ) : (
                        matchingModules.map(([modName, perms]) => {
                          const isLocked = isOwnerRole || !selectedRoleObj?.isActive;
                          const ModuleIcon = getModuleIcon(modName);

                          return (
                            <div key={modName} className="space-y-2.5">
                              {/* Module Group Bar */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                                    <ModuleIcon className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                    {modName}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    ({perms.length} {perms.length === 1 ? 'action' : 'actions'})
                                  </span>
                                </div>

                                {/* Quick Batch Module Actions */}
                                {!isLocked && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleBatchToggleModulePermissions(selectedRoleId!, perms.map((p) => p.id), true)}
                                      className="text-[11px] font-semibold text-[#0D7A70] hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      Grant All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => handleBatchToggleModulePermissions(selectedRoleId!, perms.map((p) => p.id), false)}
                                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      Revoke All
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Row-Wise Permission List */}
                              <div className="space-y-2">
                                {perms.map((perm) => {
                                  const isGranted = isOwnerRole || grantedPermIds.has(perm.id);
                                  const meta = getPermissionMeta(perm);

                                  return (
                                    <div
                                      key={perm.id}
                                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                                        isGranted
                                          ? 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                                          : 'border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-slate-300'
                                      }`}
                                    >
                                      {/* Left Side: Permission Info */}
                                      <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                          isGranted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                          <Check className={`h-4 w-4 stroke-[2.5] ${isGranted ? 'opacity-100' : 'opacity-30'}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-slate-900 tracking-tight">
                                              {meta.title}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200/60">
                                              {perm.code}
                                            </span>
                                            {isGranted ? (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                                <Check className="h-3 w-3 stroke-[3]" /> Enabled
                                              </span>
                                            ) : (
                                              <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                                                Disabled
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                                            {meta.description}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Right Side: Row-Wise Toggle Switch */}
                                      <div className="flex items-center justify-end gap-3 shrink-0 sm:pl-4 sm:border-l sm:border-slate-100">
                                        <div className="text-right">
                                          <span className={`block text-xs font-bold transition-colors ${
                                            isGranted ? 'text-[#0D7A70]' : 'text-slate-400'
                                          }`}>
                                            {isGranted ? 'Enabled' : 'Disabled'}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {isLocked ? (isOwnerRole ? 'Owner Root Access' : 'Role Inactive') : (isGranted ? 'Click to Revoke' : 'Click to Grant')}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          disabled={isLocked}
                                          onClick={() => handleTogglePermission(selectedRoleId!, perm.id)}
                                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            isLocked ? 'cursor-not-allowed opacity-60' : ''
                                          } ${isGranted ? 'bg-[#0D7A70]' : 'bg-slate-300'}`}
                                        >
                                          <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                              isGranted ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* SECONDARY VIEW: All-Roles Matrix Table */}
            {rolesViewMode === 'matrix' && (
              <div className="space-y-4">
                {/* Categories Bar & Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div
                      ref={categoryScrollRef}
                      onScroll={updateCategoryScrollProgress}
                      className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {MATRIX_CATEGORIES.map((cat) => {
                        const isActive = selectedMatrixCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedMatrixCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                              isActive
                                ? 'bg-[#0D7A70] text-white shadow-xs font-semibold'
                                : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleScrollCategories('left')}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded cursor-pointer"
                        title="Scroll categories left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="w-56 h-1.5 bg-slate-200/90 rounded-full relative overflow-hidden">
                        <div
                          className="h-full bg-slate-500 rounded-full transition-all duration-150"
                          style={{
                            width: '35%',
                            transform: `translateX(${(scrollProgress / 100) * (224 * 0.65)}px)`,
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleScrollCategories('right')}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded cursor-pointer"
                        title="Scroll categories right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative shrink-0 w-full md:w-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search features..."
                      value={matrixSearchQuery}
                      onChange={(e) => setMatrixSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D7A70]/20 focus:border-[#0D7A70] text-slate-800 placeholder:text-slate-400 w-full md:w-64 transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/90 bg-white">
                          <th className="text-left text-sm font-bold text-slate-800 py-4 px-6 min-w-[340px]">
                            Feature & Description
                          </th>
                          <th className="text-center text-sm font-bold text-slate-800 py-4 px-4 min-w-[120px]">
                            Master Switch
                          </th>
                          {ROLE_COLUMNS.map((col) => (
                            <th key={col.key} className="text-center text-sm font-bold text-slate-800 py-4 px-4 min-w-[110px]">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredFeatures.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                              <Search className="h-6 w-6 text-slate-400 mx-auto mb-2 opacity-60" />
                              <p className="font-semibold text-slate-700">No features found</p>
                              <p className="text-slate-400 mt-1">
                                No features match &quot;{matrixSearchQuery}&quot; in {selectedMatrixCategory}.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setMatrixSearchQuery('');
                                  setSelectedMatrixCategory('All');
                                }}
                                className="mt-3 text-xs text-[#0D7A70] font-semibold hover:underline cursor-pointer"
                              >
                                Reset Search & Filters
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredFeatures.map((item) => {
                            const itemState = matrixState[item.id] || {
                              master: item.defaultMaster,
                              roles: { ...item.defaultRoles },
                            };
                            const isMasterOn = itemState.master;

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="py-4.5 px-6 text-left align-middle">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[14px] text-slate-900 tracking-tight">
                                      {item.title}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                                      {item.category}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1.5 max-w-xl leading-relaxed">
                                    {item.description}
                                  </p>
                                </td>

                                <td className="py-4.5 px-4 text-center align-middle">
                                  <div className="flex flex-col items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMasterSwitch(item.id)}
                                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        isMasterOn ? 'bg-[#0D7A70]' : 'bg-slate-300'
                                      }`}
                                    >
                                      <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                          isMasterOn ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                    <span
                                      className={`text-[11px] mt-1.5 transition-colors ${
                                        isMasterOn ? 'font-bold text-[#0D7A70]' : 'font-semibold text-slate-400'
                                      }`}
                                    >
                                      {isMasterOn ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>
                                </td>

                                {ROLE_COLUMNS.map((col) => {
                                  const isRoleOn = isMasterOn && (itemState.roles[col.key] ?? item.defaultRoles[col.key]);
                                  const isLocked = !isMasterOn;

                                  return (
                                    <td key={col.key} className="py-4.5 px-4 text-center align-middle">
                                      <div className="flex flex-col items-center justify-center">
                                        <button
                                          type="button"
                                          disabled={isLocked}
                                          onClick={() => handleToggleFeatureRole(item.id, col.key)}
                                          className={`w-5 h-5 rounded-[4px] transition-all flex items-center justify-center ${
                                            isLocked
                                              ? 'border-2 border-slate-200 bg-slate-100 cursor-not-allowed opacity-50'
                                              : isRoleOn
                                              ? 'bg-[#0D7A70] text-white hover:bg-[#0B665E] shadow-2xs cursor-pointer'
                                              : 'border-2 border-slate-300 bg-white hover:border-slate-400 cursor-pointer'
                                          }`}
                                        >
                                          {isRoleOn && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </button>
                                        <span
                                          className={`text-[11px] mt-1.5 transition-colors ${
                                            isLocked
                                              ? 'text-slate-300 font-medium'
                                              : isRoleOn
                                              ? 'font-bold text-[#0D7A70]'
                                              : 'font-medium text-slate-400'
                                          }`}
                                        >
                                          {isRoleOn ? 'On' : 'Off'}
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Access Diagnostics Inspector */}
            {showAdvancedRoleTools && (
              <Card className="border border-slate-200 shadow-xs bg-white rounded-2xl overflow-hidden mt-6">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Access Diagnostics & Effective Permissions Inspector
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Review effective permissions and diagnose why a user can or cannot perform an action, including data scope boundaries.
                  </CardDescription>
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
        );
      })()}

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
                  <Button type="submit" size="sm" className="h-8 text-xs px-3">Add</Button>
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
                          <div className="flex gap-1.5">
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

                    return (
                      <div key={t.id} className="group flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{t.name}</span>
                          {(t.department?.name || t.departmentName) && (
                            <span className="text-[10px] text-muted-foreground ml-2">({t.department?.name || t.departmentName})</span>
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

          {/* Designations */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Designations</span>
                <Badge variant="secondary" className="text-[10px]">{designations.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Job titles & levels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddDesig} className="space-y-2 border-b border-border pb-3">
                <input
                  type="text"
                  required
                  placeholder="Designation Title *"
                  value={newDesigTitle}
                  onChange={(e) => setNewDesigTitle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="Level (1-10)"
                    value={newDesigLevel}
                    onChange={(e) => setNewDesigLevel(Number(e.target.value))}
                    className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs px-3 w-full">Add Title</Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {designations.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No designations created yet.</p>
                ) : (
                  designations.map((rawD) => {
                    const d = rawD.data !== undefined ? rawD.data : rawD;
                    const isEditing = editingDesigId === d.id;

                    if (isEditing) {
                      return (
                        <form
                          key={d.id}
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveDesig(d.id);
                          }}
                          className="p-2 rounded-md bg-muted/60 border border-primary/30 space-y-1.5 text-xs"
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
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={editDesigLevel}
                              onChange={(e) => setEditDesigLevel(Number(e.target.value))}
                              placeholder="Level (1-10)"
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                            <Button
                              type="submit"
                              size="sm"
                              disabled={savingDesig}
                              className="h-7 text-xs px-2.5 shrink-0"
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
                      <div key={d.id} className="group flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{d.title}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">(Level {d.level || 1})</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditDesig(d)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-background"
                            title="Edit Designation"
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
    </div>
  );
}
