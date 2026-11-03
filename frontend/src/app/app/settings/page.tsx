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
  ChevronDown,
  Package,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

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
  Organization: 18,
  Invitations: 19,
  Roles: 20,
  Departments: 21,
  Settings: 22,
  Billing: 23,
};

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  Assets: 'COMPANY ASSETS',
  Inventory: 'INVENTORY & STOCK',
  Ledger: 'MOVEMENT LEDGER',
  Documents: 'DOCUMENT VAULT',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'details' | 'modules' | 'roles' | 'structure' | 'billing' | 'security'>('details');
  const [permissionSearch, setPermissionSearch] = useState('');

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
        const systemOrder = ['ADMIN', 'MANAGER', 'MEMBER', 'OWNER'];
        const sorted = [...rolesData].sort((a, b) => {
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
          const adminRole = sorted.find((r) => r.name === 'ADMIN') || sorted[0];
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update modules');

      setWorkspace((prev: any) => ({
        ...prev,
        settings: {
          ...(prev?.settings || {}),
          enabledModules,
        },
      }));
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

  // Handler 5: Toggle Role Permission with Group Dependency Rules
  const handleTogglePermission = async (roleId: string, permId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const currentPermIds: string[] = (role.permissions || []).map((p: any) => p.permissionId || p.permission?.id || p.id || p.code || (typeof p === 'string' ? p : '')).filter(Boolean);
    const targetPerm = (allPermissions.length > 0 ? allPermissions : DEFAULT_PERMISSIONS_CATALOG).find((p) => p.id === permId || p.code === permId);
    const isCurrentlyChecked = (role.permissions || []).some((p: any) =>
      p === permId ||
      p.permissionId === permId ||
      p.id === permId ||
      p.permission?.id === permId ||
      p.permission?.code === permId ||
      p.code === permId ||
      (targetPerm && (p.permission?.code === targetPerm.code || p.code === targetPerm.code || p.permissionId === targetPerm.id))
    );

    let updatedPermIds: string[];

    // Modules with view-dependency enforcement
    const dependencyGroups = ['assets', 'inventory', 'ledger', 'documents'];
    const targetCode = targetPerm?.code || '';
    const [targetGroup] = targetCode.split(':');

    if (isCurrentlyChecked) {
      // Unchecking
      if (dependencyGroups.includes(targetGroup) && targetCode === `${targetGroup}:view`) {
        // Unchecking view unchecks all permissions in that group
        const groupPermIds = allPermissions
          .filter((p) => p.code.startsWith(`${targetGroup}:`))
          .map((p) => p.id);
        updatedPermIds = currentPermIds.filter((id) => !groupPermIds.includes(id));
      } else {
        updatedPermIds = currentPermIds.filter((id) => id !== permId);
      }
    } else {
      // Checking
      updatedPermIds = [...currentPermIds, permId];

      if (dependencyGroups.includes(targetGroup) && targetCode !== `${targetGroup}:view`) {
        // Checking any non-view permission automatically checks the view permission
        const viewPerm = allPermissions.find((p) => p.code === `${targetGroup}:view`);
        if (viewPerm && !updatedPermIds.includes(viewPerm.id)) {
          updatedPermIds.push(viewPerm.id);
        }
      }
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
    { key: 'assets', name: 'Assets, Inventory & Docs', icon: Package, desc: 'Company hardware and asset tracking, stock inventory, movements ledger, and document vault.' },
  ];

  // Operational Profile Presets
  const templatePresets = [
    { id: 'GENERAL', name: 'Comprehensive Suite', icon: Sparkles, desc: 'Universal operations workspace with all modules and engines enabled.' },
    { id: 'CORE_OPS', name: 'Core Operations', icon: LayoutGrid, desc: 'Optimized for high-throughput processing queues, QA audits, SLAs, and attendance.' },
    { id: 'PROJECTS_DELIVERY', name: 'Projects & Delivery', icon: Briefcase, desc: 'Optimized for projects, tasks, milestones, approvals, and client delivery.' },
    { id: 'LEAN_SERVICES', name: 'Lean Professional Services', icon: DollarSign, desc: 'Optimized for client deliverables, approval chains, time logging, and billing.' },
  ];

  const selectedRoleObj =
    roles.find((r) => r.id === selectedRoleId) ||
    roles.find((r) => r.name === 'ADMIN') ||
    roles[0];

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

      {/* TAB 3: Roles & Permissions */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Roles List & Create */}
            <div className="space-y-4">
              {/* Workspace Roles Card */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
                <h3 className="text-sm font-bold text-foreground">Workspace Roles</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3.5">
                  Select a role to inspect or edit permissions
                </p>

                <div className="space-y-2">
                  {roles.map((r) => {
                    const isSelected = selectedRoleObj?.id === r.id || selectedRoleId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRoleId(r.id)}
                        className={`cursor-pointer p-3 rounded-lg text-xs transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                            : 'border-border/80 bg-card hover:border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                            {r.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-normal truncate mt-0.5 max-w-[190px]">
                            {r.description || 'Workspace role'}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {r.isSystemRole ? (
                            <span className="text-[10px] text-muted-foreground border border-border/80 px-2 py-0.5 rounded-md bg-background font-medium">
                              System
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                              {r._count?.memberships || 0} members
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Role Actions (For Custom Roles) */}
              {selectedRoleObj && !selectedRoleObj.isSystemRole && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider">Role Configuration</CardTitle>
                    <CardDescription className="text-[11px]">Manage lifecycle for {selectedRoleObj.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {editingRoleId === selectedRoleObj.id ? (
                      <div className="space-y-2 border border-border p-2.5 rounded-md bg-muted/20">
                        <input
                          type="text"
                          value={editRoleName}
                          onChange={(e) => setEditRoleName(e.target.value)}
                          placeholder="Role Name"
                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={editRoleDesc}
                          onChange={(e) => setEditRoleDesc(e.target.value)}
                          placeholder="Description"
                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                        />
                        <div className="flex gap-1.5 pt-1">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleRenameRole(selectedRoleObj.id)}>
                            Save
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
                          className="text-xs h-7 justify-start"
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
                            className="text-xs h-7 justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            onClick={() => handleDeactivateRole(selectedRoleObj.id)}
                          >
                            Deactivate Role
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => handleReactivateRole(selectedRoleObj.id)}
                          >
                            Reactivate Role
                          </Button>
                        )}

                        {deletingRoleId === selectedRoleObj.id ? (
                          <div className="space-y-2 border border-destructive/30 p-2.5 rounded-md bg-destructive/5 text-xs">
                            <p className="text-[11px] text-destructive font-medium">
                              {selectedRoleObj._count?.memberships > 0
                                ? `Migrate ${selectedRoleObj._count.memberships} member(s) to a fallback role before deleting:`
                                : 'Confirm deletion of this custom role:'}
                            </p>
                            {selectedRoleObj._count?.memberships > 0 && (
                              <select
                                value={deleteReassignRoleId}
                                onChange={(e) => setDeleteReassignRoleId(e.target.value)}
                                className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
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
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs flex-1"
                                disabled={selectedRoleObj._count?.memberships > 0 && !deleteReassignRoleId}
                                onClick={() => handleDeleteRole(selectedRoleObj.id)}
                              >
                                Confirm Delete
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeletingRoleId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 justify-start text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeletingRoleId(selectedRoleObj.id);
                              setDeleteReassignRoleId('');
                            }}
                          >
                            Delete Custom Role
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* CREATE CUSTOM ROLE Card */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
                  CREATE CUSTOM ROLE
                </h4>
                <form onSubmit={handleCreateRole} className="space-y-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Role Title (e.g. Auditor Level 2)"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={creatingRole}
                    className="w-full mt-2 rounded-md border border-border/80 bg-muted/40 hover:bg-muted py-2 text-xs font-medium text-foreground transition-colors flex items-center justify-center gap-1"
                  >
                    {creatingRole ? 'Creating...' : '+ Create Role'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Permissions for Selected Role */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs">
                {/* Header */}
                <div className="flex items-start justify-between pb-5 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">
                        Permissions for <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedRoleObj?.name || 'ADMIN'}</span>
                      </h3>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure fine-grained module actions and permissions for this role.
                    </p>
                  </div>
                  {selectedRoleObj?.isSystemRole && (
                    <span className="text-xs font-medium text-foreground border border-border px-3 py-1 rounded-md bg-background shrink-0">
                      Core Platform Role
                    </span>
                  )}
                </div>

                {selectedRoleObj && !selectedRoleObj.isSystemRole && selectedRoleObj.isActive === false && (
                  <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>This role is currently deactivated. Permissions are suspended for all assigned members.</span>
                  </div>
                )}

                {/* Quick Search for Permissions */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search permissions or modules (e.g. assets, inventory, stock, attendance)..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {permissionSearch && (
                    <button
                      type="button"
                      onClick={() => setPermissionSearch('')}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Permissions by Module */}
                <div className="space-y-6 max-h-[620px] overflow-y-auto pr-2 mt-4">
                  {Array.from(new Set((allPermissions.length > 0 ? allPermissions : DEFAULT_PERMISSIONS_CATALOG).map((p) => p.module || 'General')))
                    .sort((a, b) => {
                      const orderA = MODULE_DISPLAY_ORDER[a] ?? 99;
                      const orderB = MODULE_DISPLAY_ORDER[b] ?? 99;
                      if (orderA !== orderB) return orderA - orderB;
                      return a.localeCompare(b);
                    })
                    .filter((modName) => {
                      if (!permissionSearch.trim()) return true;
                      const q = permissionSearch.toLowerCase().trim();
                      const effectiveCatalog = allPermissions.length > 0 ? allPermissions : DEFAULT_PERMISSIONS_CATALOG;
                      const matchesMod = modName.toLowerCase().includes(q) || (MODULE_DISPLAY_NAMES[modName] || '').toLowerCase().includes(q);
                      const hasMatchingPerm = effectiveCatalog.some(
                        (p) => (p.module || 'General') === modName && (p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
                      );
                      return matchesMod || hasMatchingPerm;
                    })
                    .map((modName) => {
                      const effectiveCatalog = allPermissions.length > 0 ? allPermissions : DEFAULT_PERMISSIONS_CATALOG;
                      const q = permissionSearch.toLowerCase().trim();
                      const modPerms = effectiveCatalog
                        .filter((p) => {
                          if ((p.module || 'General') !== modName) return false;
                          if (!q) return true;
                          const matchesMod = modName.toLowerCase().includes(q) || (MODULE_DISPLAY_NAMES[modName] || '').toLowerCase().includes(q);
                          if (matchesMod) return true;
                          return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
                        })
                        .sort((a, b) => a.code.localeCompare(b.code));

                      if (modPerms.length === 0) return null;

                      const groupTitle = MODULE_DISPLAY_NAMES[modName] || modName.toUpperCase();

                      return (
                        <div key={modName} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                              <span>{groupTitle}</span>
                              {['Assets', 'Inventory', 'Ledger', 'Documents'].includes(modName) && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/40 text-primary">
                                  Assets & Docs
                                </Badge>
                              )}
                            </h4>
                            <span className="text-[10px] text-muted-foreground bg-muted font-medium px-2 py-0.5 rounded-md">
                              {modPerms.length} {modPerms.length === 1 ? 'action' : 'actions'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {modPerms.map((perm) => {
                              const assignedPerms: any[] = selectedRoleObj?.permissions || [];
                              const isGranted =
                                selectedRoleObj?.name === 'OWNER' ||
                                assignedPerms.some((p) => {
                                  const code = p.permission?.code || p.code || (typeof p === 'string' ? p : '');
                                  const id = p.permissionId || p.permission?.id || p.id;
                                  return code === perm.code || id === perm.id || p === perm.id || p === perm.code;
                                });

                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => {
                                    if (selectedRoleObj?.name !== 'OWNER' && selectedRoleObj?.isActive !== false) {
                                      handleTogglePermission(selectedRoleObj.id, perm.id);
                                    }
                                  }}
                                  className={`flex items-start justify-between p-3.5 rounded-lg border text-xs transition-all cursor-pointer ${
                                    isGranted
                                      ? 'border-blue-200 bg-blue-50/40 dark:border-blue-900/60 dark:bg-blue-950/20'
                                      : 'border-border/80 bg-card hover:border-border hover:bg-muted/10'
                                  }`}
                                >
                                  <div className="pr-3 flex-1 min-w-0">
                                    <div className="font-bold text-foreground text-xs leading-none">
                                      {perm.code}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                                      {perm.name}
                                    </div>
                                  </div>
                                  <div className="shrink-0 mt-0.5">
                                    <div
                                      className={`h-4 w-4 rounded flex items-center justify-center transition-colors ${
                                        isGranted
                                          ? 'bg-blue-600 border border-blue-600 text-white'
                                          : 'border border-border/80 bg-background'
                                      }`}
                                    >
                                      {isGranted && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
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
