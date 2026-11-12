'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import {
  PreStepperOnboarding,
  type PreStepperStage,
} from '@/components/onboarding/PreStepperOnboarding';
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Check,
  Shield,
  Link2,
  Copy,
  Mail,
  RefreshCw,
} from 'lucide-react';

const ONBOARDING_PERM_GROUPS: Array<{ group: string; perms: Array<{ code: string; label: string }> }> = [
  {
    group: 'Tasks & Projects',
    perms: [
      { code: 'projects:view', label: 'View Projects' },
      { code: 'projects:create', label: 'Create Projects' },
      { code: 'projects:edit', label: 'Edit Projects' },
      { code: 'tasks:view', label: 'View Tasks' },
      { code: 'tasks:create', label: 'Create Tasks' },
      { code: 'tasks:edit', label: 'Update Tasks' },
      { code: 'tasks:assign', label: 'Assign Tasks' },
      { code: 'tasks:review', label: 'Review / Approve Work' },
      { code: 'tasks:complete', label: 'Mark Tasks Done' },
    ],
  },
  {
    group: 'People, Invites & Delegation',
    perms: [
      { code: 'people:view', label: 'View Directory' },
      { code: 'people:create', label: 'Add People' },
      { code: 'people:edit', label: 'Edit People' },
      { code: 'invitations:manage', label: 'Invite Team & Share Links' },
      { code: 'roles:manage', label: 'Manage Permissions (Delegated)' },
      { code: 'departments:manage', label: 'Manage Departments & Teams' },
    ],
  },
  {
    group: 'Time, Attendance & Leave',
    perms: [
      { code: 'time:view', label: 'View Time Logs' },
      { code: 'time:log', label: 'Log Time' },
      { code: 'time:approve', label: 'Approve Timesheets' },
      { code: 'attendance:view', label: 'View Attendance' },
      { code: 'attendance:clock', label: 'Clock In / Out' },
      { code: 'attendance:edit', label: 'Adjust Attendance' },
      { code: 'leave:view', label: 'View Leave' },
      { code: 'leave:apply', label: 'Apply Leave' },
      { code: 'leave:approve', label: 'Approve Leave Requests' },
      { code: 'leave:manage', label: 'Configure Leave Policies' },
    ],
  },
  {
    group: 'Approvals, Assets & Reports',
    perms: [
      { code: 'approvals:view', label: 'View Approvals' },
      { code: 'approvals:approve', label: 'Action Approvals' },
      { code: 'requests:manage', label: 'Manage Requests' },
      { code: 'payroll:view', label: 'View Payroll' },
      { code: 'payroll:edit', label: 'Edit Payroll' },
      { code: 'assets:view', label: 'View Assets' },
      { code: 'assets:create', label: 'Create Assets' },
      { code: 'calendar:view:all', label: 'View Calendar (All)' },
      { code: 'calendar:create', label: 'Create Events' },
      { code: 'reports:view', label: 'View Analytics' },
    ],
  },
];

const ONBOARDING_PERM_OPTIONS = ONBOARDING_PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.code));

function buildGmailComposeUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams();
  params.set('view', 'cm');
  params.set('fs', '1');
  if (to) params.set('to', to);
  params.set('su', subject);
  params.set('body', body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function OnboardingJourneyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get('stage') as PreStepperStage | null;
  const modeParam = searchParams.get('mode');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [showPreStepper, setShowPreStepper] = useState<boolean>(false);
  const [preStepperStage, setPreStepperStage] = useState<PreStepperStage>('welcome');
  const [activeStep, setActiveStep] = useState<string>('profile');

  // Step 1: Profile
  const [orgName, setOrgName] = useState('');
  const [businessType, setBusinessType] = useState('GENERAL');
  const [country, setCountry] = useState('India');
  const [timezone, setTimezone] = useState('UTC+05:30 (India Standard Time)');
  const [orgSize, setOrgSize] = useState('0-10');

  // Step 2: Schedule
  const [workingDays, setWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);

  // Step 3: Holidays
  const [holidays, setHolidays] = useState<Array<{ name: string; date: string; type: string }>>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayType, setNewHolidayType] = useState('NATIONAL');

  // Step 4: Locations
  const [locations, setLocations] = useState<
    Array<{ name: string; city: string; country: string; isPrimary: boolean }>
  >([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [newLocCountry, setNewLocCountry] = useState('India');
  const [newLocIsPrimary, setNewLocIsPrimary] = useState(false);

  // Step 5: Departments, Teams & Designations
  const [departments, setDepartments] = useState<Array<{ id?: string; name: string; code: string }>>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  const [teams, setTeams] = useState<
    Array<{ id?: string; name: string; departmentId?: string; departmentName?: string }>
  >([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDeptName, setNewTeamDeptName] = useState('');

  const [designations, setDesignations] = useState<
    Array<{
      id?: string;
      title: string;
      level: number;
      departmentName?: string;
      departmentId?: string;
      /* LEGACY_ROLE_COMMENTED_OUT: internal DB carrier defaults to MEMBER; access comes from Role & Scope */
      defaultAccessRole: string;
      defaultDataScope: 'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL';
      permissionCodes: string[];
    }>
  >([]);
  const [newDesigTitle, setNewDesigTitle] = useState('');
  const [newDesigLevel, setNewDesigLevel] = useState(2);
  const [newDesigDeptName, setNewDesigDeptName] = useState('');
  const [newDesigScope, setNewDesigScope] = useState<
    'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL'
  >('TEAM');
  const [newDesigPerms, setNewDesigPerms] = useState<string[]>([
    'projects:view',
    'tasks:view',
    'tasks:create',
    'tasks:edit',
    'people:view',
  ]);

  // Step 6: Organization Roles & Permissions (Owner, Admin + Customizable Staff Roles)
  const [staffRoles, setStaffRoles] = useState<
    Array<{
      id?: string;
      name: string;
      description?: string;
      isSystemRole?: boolean;
      dataScope: 'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL';
      scopedTeamIds?: string[];
      permissionCodes: string[];
    }>
  >([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleScope, setNewRoleScope] = useState<
    'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL'
  >('TEAM');
  const [newRolePerms, setNewRolePerms] = useState<string[]>([
    'projects:view',
    'tasks:view',
    'tasks:create',
    'tasks:edit',
    'tasks:assign',
    'time:view',
    'time:log',
    'leave:view',
    'leave:apply',
    'people:view',
  ]);

  // Step 7: Team Invites (Single + Bulk + Shareable Workspace Link + Compose in Gmail)
  const [inviteMode, setInviteMode] = useState<'single' | 'bulk'>('single');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteSelection, setInviteSelection] = useState<string>(''); // "role:<id>" | "sys:ADMIN"
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteDeptId, setInviteDeptId] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [inviteDesigId, setInviteDesigId] = useState('');
  const [inviteDesigTitle, setInviteDesigTitle] = useState('');
  const [inviteDataScope, setInviteDataScope] = useState('ASSIGNED');
  const [invitePerms, setInvitePerms] = useState<string[]>([]);
  const [showInvitePermEditor, setShowInvitePermEditor] = useState(false);

  const [shareLinkData, setShareLinkData] = useState<any>(null);
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [lastSentInvite, setLastSentInvite] = useState<{
    email: string;
    firstName: string;
    inviteLink?: string;
    roleName?: string;
  } | null>(null);

  const [bulkRows, setBulkRows] = useState<
    Array<{
      email: string;
      firstName: string;
      lastName: string;
      departmentId?: string;
      teamId?: string;
      designationId?: string;
      designationTitle?: string;
      roleId?: string;
      accessRole?: string;
      dataScope?: string;
    }>
  >([{ email: '', firstName: '', lastName: '' }]);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  const [sentInvites, setSentInvites] = useState<Array<{ email: string; inviteLink?: string }>>([]);
  const [sendingInvite, setSendingInvite] = useState(false);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  const loadShareInviteLink = async () => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/invite-link`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const raw = await res.json();
      const payload = raw?.data !== undefined ? raw.data : raw;
      setShareLinkData(payload);
    } catch {}
  };

  const loadStatus = async (forceStepper = false) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/status`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load status');

      const payload = data.data !== undefined ? data.data : data;
      setStatus(payload);

      // Determine whether Pre-Stepper (Welcome Dog / Industries+Size / Modules / Choice) should be shown
      const validStages: PreStepperStage[] = [
        'welcome',
        'industries_size',
        'recommended_modules',
        'org_structure_choice',
      ];
      if (!forceStepper && stageParam && validStages.includes(stageParam)) {
        setPreStepperStage(stageParam);
        setShowPreStepper(true);
      } else if (
        !forceStepper &&
        modeParam !== 'stepper' &&
        !payload.isCompleted &&
        payload.preStepper?.orgStructureChoice !== 'setup_now' &&
        !payload.preStepper?.skipped
      ) {
        if (!payload.preStepper?.welcomeDone) {
          setPreStepperStage('welcome');
        } else if (!payload.preStepper?.industriesDone) {
          setPreStepperStage('industries_size');
        } else if (!payload.preStepper?.modulesDone) {
          setPreStepperStage('recommended_modules');
        } else {
          setPreStepperStage('org_structure_choice');
        }
        setShowPreStepper(true);
      } else {
        setShowPreStepper(false);
      }

      let regOrgName = '';
      let regBusinessType = 'GENERAL';
      let regOrgSize = '0-10';
      let userLocation = '';

      if (typeof window !== 'undefined') {
        try {
          const wsCache = localStorage.getItem('orvexa_cached_workspace');
          if (wsCache) {
            const parsedWs = JSON.parse(wsCache);
            regOrgName = parsedWs?.workspace?.name || '';
            regBusinessType = parsedWs?.workspace?.businessType || 'GENERAL';
          }
          const userCache = localStorage.getItem('user');
          if (userCache) {
            const parsedUser = JSON.parse(userCache);
            if (!regOrgName && parsedUser.workspaceName) regOrgName = parsedUser.workspaceName;
            if (parsedUser.businessType) regBusinessType = parsedUser.businessType;
            if (parsedUser.orgSize) regOrgSize = parsedUser.orgSize;
            if (parsedUser.location) userLocation = parsedUser.location;
          }
        } catch {}
      }

      const setup = payload.setupData || {};
      const profileData = setup.profile || {};
      setOrgName(profileData.name || regOrgName || '');
      setBusinessType(profileData.businessType || regBusinessType || 'GENERAL');
      setCountry(profileData.country || 'India');
      setTimezone(profileData.timezone || 'UTC+05:30 (India Standard Time)');
      setOrgSize(profileData.orgSize || payload.orgSize || regOrgSize || '0-10');

      if (setup.schedule) {
        setWorkingDays(setup.schedule.workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
        setStartTime(setup.schedule.startTime || '09:00');
        setEndTime(setup.schedule.endTime || '18:00');
        setWorkHoursPerDay(setup.schedule.workHoursPerDay || 8);
      }

      if (Array.isArray(setup.holidays) && setup.holidays.length > 0) {
        setHolidays(setup.holidays);
      } else {
        const curYear = new Date().getFullYear();
        setHolidays([
          { name: 'Republic Day', date: `${curYear}-01-26`, type: 'NATIONAL' },
          { name: 'Independence Day', date: `${curYear}-08-15`, type: 'NATIONAL' },
          { name: 'Gandhi Jayanti', date: `${curYear}-10-02`, type: 'NATIONAL' },
          { name: 'Diwali', date: `${curYear}-11-01`, type: 'COMPANY' },
        ]);
      }

      const fallbackCity = (userLocation || 'Mumbai').replace(/,\s*India/i, '').trim() || 'Mumbai';
      if (Array.isArray(setup.locations) && setup.locations.length > 0) {
        setLocations(setup.locations);
        setNewLocName(setup.locations[0].name || 'Headquarters');
        setNewLocCity(setup.locations[0].city || fallbackCity);
        setNewLocIsPrimary(true);
      } else {
        setLocations([{ name: 'Headquarters', city: fallbackCity, country: 'India', isPrimary: true }]);
        setNewLocName('Headquarters');
        setNewLocCity(fallbackCity);
        setNewLocCountry('India');
        setNewLocIsPrimary(true);
      }

      let deptData = Array.isArray(setup.departments) && setup.departments.length > 0 ? setup.departments : [];
      if (deptData.length === 0) {
        deptData = [
          { name: 'Engineering', code: 'ENG' },
          { name: 'Human Resources', code: 'HR' },
          { name: 'Operations', code: 'OPS' },
          { name: 'Finance', code: 'FIN' },
        ];
      }
      setDepartments(deptData);

      if (Array.isArray(setup.teams)) {
        setTeams(
          setup.teams.map((t: any) => ({
            id: t.id,
            name: t.name,
            departmentId: t.departmentId || t.department?.id || '',
            departmentName: t.department?.name || t.departmentName || '',
          })),
        );
      }

      if (Array.isArray(setup.designations)) {
        setDesignations(
          setup.designations.map((dg: any) => ({
            id: dg.id,
            title: dg.title,
            level: dg.level || 1,
            departmentId: dg.departmentId || '',
            departmentName:
              deptData.find((dp: any) => dp.id === dg.departmentId)?.name || dg.departmentName || '',
            defaultAccessRole: dg.defaultAccessRole || 'MEMBER',
            defaultDataScope: dg.defaultDataScope || 'ASSIGNED',
            permissionCodes: Array.isArray(dg.permissionCodes) ? dg.permissionCodes : [],
          })),
        );
      }

      if (Array.isArray(setup.roles)) {
        const customOnly = setup.roles.filter((r: any) => !r.isSystemRole);
        setStaffRoles(customOnly);
        if (customOnly.length > 0 && !inviteSelection) {
          const defaultStaff =
            customOnly.find((r: any) => r.name.toLowerCase().includes('staff')) || customOnly[0];
          setInviteSelection(`role:${defaultStaff.id}`);
          setInviteRoleId(defaultStaff.id);
          setInviteRole('MEMBER');
          setInviteDataScope(defaultStaff.dataScope || 'ASSIGNED');
          setInvitePerms(defaultStaff.permissionCodes || []);
        }
      }

      if (setup.shareInviteLink) {
        setShareLinkData(setup.shareInviteLink);
      }

      const completedSteps: string[] = payload.completedSteps || [];
      if (!completedSteps.includes('profile') && !regOrgName) {
        setActiveStep('profile');
      } else if (!completedSteps.includes('schedule')) {
        setActiveStep('schedule');
      } else if (!completedSteps.includes('holidays')) {
        setActiveStep('holidays');
      } else if (!completedSteps.includes('locations')) {
        setActiveStep('locations');
      } else if (!completedSteps.includes('departments')) {
        setActiveStep('departments');
      } else if (!completedSteps.includes('roles')) {
        setActiveStep('roles');
      } else if (!completedSteps.includes('team_invite')) {
        setActiveStep('team_invite');
      } else {
        setActiveStep('schedule');
      }
    } catch {
      toast.error('Unable to load onboarding status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [stageParam, modeParam]);

  const saveStepData = async (step: string, data: any, markCompleted: boolean = true) => {
    setSaving(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/step`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ step, data, markCompleted }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Failed to save setup step');

      const updatedStatus = resData.data !== undefined ? resData.data : resData;
      setStatus(updatedStatus);
      return updatedStatus;
    } catch (err: any) {
      toast.error(err.message || 'Error saving step');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const stepsList = [
    { id: 'profile', name: 'Org Profile', icon: Building2, mandatory: true },
    { id: 'schedule', name: 'Work Schedule', icon: Clock, mandatory: true },
    { id: 'holidays', name: 'Holidays', icon: Calendar, mandatory: false },
    { id: 'locations', name: 'Locations', icon: MapPin, mandatory: false },
    { id: 'departments', name: 'Depts & Teams', icon: Building2, mandatory: false },
    { id: 'roles', name: 'Roles & Access', icon: Shield, mandatory: false },
    { id: 'team_invite', name: 'Invite Team', icon: Users, mandatory: false },
  ];

  const handleNext = async () => {
    try {
      if (activeStep === 'profile') {
        if (!orgName.trim()) {
          toast.error('Organization name is required.');
          return;
        }
        await saveStepData('profile', { name: orgName, businessType, country, timezone, orgSize });
        setActiveStep('schedule');
      } else if (activeStep === 'schedule') {
        if (workingDays.length === 0) {
          toast.error('Select at least one working day.');
          return;
        }
        await saveStepData('schedule', { workingDays, startTime, endTime, workHoursPerDay });
        setActiveStep('holidays');
      } else if (activeStep === 'holidays') {
        await saveStepData('holidays', { holidays });
        setActiveStep('locations');
      } else if (activeStep === 'locations') {
        await saveStepData('locations', { locations });
        setActiveStep('departments');
      } else if (activeStep === 'departments') {
        const updatedStatus = await saveStepData('departments', {
          departments,
          teams,
          designations,
        });
        const setup = updatedStatus?.setupData || {};
        if (Array.isArray(setup.departments)) setDepartments(setup.departments);
        if (Array.isArray(setup.teams)) {
          setTeams(
            setup.teams.map((t: any) => ({
              id: t.id,
              name: t.name,
              departmentId: t.departmentId || t.department?.id || '',
              departmentName: t.department?.name || t.departmentName || '',
            })),
          );
        }
        if (Array.isArray(setup.designations)) {
          setDesignations(
            setup.designations.map((dg: any) => ({
              id: dg.id,
              title: dg.title,
              level: dg.level || 1,
              departmentId: dg.departmentId || '',
              departmentName:
                setup.departments?.find((dp: any) => dp.id === dg.departmentId)?.name || '',
              defaultAccessRole: dg.defaultAccessRole || 'MEMBER',
              defaultDataScope: dg.defaultDataScope || 'ASSIGNED',
              permissionCodes: Array.isArray(dg.permissionCodes) ? dg.permissionCodes : [],
            })),
          );
        }
        setActiveStep('roles');
      } else if (activeStep === 'roles') {
        const updatedStatus = await saveStepData('roles', { roles: staffRoles });
        const setupRoles = updatedStatus?.setupData?.roles;
        if (Array.isArray(setupRoles)) {
          const customOnly = setupRoles.filter((r: any) => !r.isSystemRole);
          setStaffRoles(customOnly);
        }
        setActiveStep('team_invite');
      } else if (activeStep === 'team_invite') {
        await saveStepData('team_invite', { completed: true });
        toast.success('Organization setup complete! Welcome to ' + BRANDING.name + '.');
        router.push('/app/home');
      }
    } catch {
      // handled via toast in saveStepData
    }
  };

  const handleBack = () => {
    const currentIdx = stepsList.findIndex((s) => s.id === activeStep);
    if (currentIdx > 0) {
      setActiveStep(stepsList[currentIdx - 1].id);
    }
  };

  const handleSkip = () => {
    const currentIdx = stepsList.findIndex((s) => s.id === activeStep);
    if (currentIdx < stepsList.length - 1) {
      setActiveStep(stepsList[currentIdx + 1].id);
    } else {
      router.push('/app/home');
    }
  };

  const refreshLiveOrgOptions = async () => {
    try {
      const hdrs = getHeaders();
      const [dRes, tRes, dgRes, rRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/departments`, { headers: hdrs }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/teams`, { headers: hdrs }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/designations`, { headers: hdrs }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/roles`, { headers: hdrs }).catch(() => null),
      ]);
      if (dRes?.ok) {
        const raw = await dRes.json();
        const list = raw?.data !== undefined ? raw.data : raw;
        if (Array.isArray(list) && list.length > 0) setDepartments(list);
      }
      if (tRes?.ok) {
        const raw = await tRes.json();
        const list = raw?.data !== undefined ? raw.data : raw;
        if (Array.isArray(list)) {
          setTeams(
            list.map((t: any) => ({
              id: t.id,
              name: t.name,
              departmentId: t.departmentId || t.department?.id || '',
              departmentName: t.department?.name || '',
            })),
          );
        }
      }
      if (dgRes?.ok) {
        const raw = await dgRes.json();
        const list = raw?.data !== undefined ? raw.data : raw;
        if (Array.isArray(list) && list.length > 0) {
          setDesignations(
            list.map((dg: any) => ({
              id: dg.id,
              title: dg.title,
              level: dg.level || 1,
              departmentId: dg.departmentId || '',
              defaultAccessRole: dg.defaultAccessRole || 'MEMBER',
              defaultDataScope: dg.defaultDataScope || 'ASSIGNED',
              permissionCodes: Array.isArray(dg.permissionCodes) ? dg.permissionCodes : [],
            })),
          );
        }
      }
      if (rRes?.ok) {
        const raw = await rRes.json();
        const list = raw?.data !== undefined ? raw.data : raw;
        if (Array.isArray(list)) {
          const customOnly = list
            .filter((r: any) => !r.isSystemRole)
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              isSystemRole: false,
              dataScope: r.dataScope || 'ASSIGNED',
              scopedTeamIds: r.scopedTeamIds || [],
              permissionCodes: Array.isArray(r.permissionCodes)
                ? r.permissionCodes
                : (r.permissions || [])
                    .map((rp: any) => rp.permission?.code || rp.code)
                    .filter(Boolean),
            }));
          setStaffRoles(customOnly);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!showPreStepper && (activeStep === 'team_invite' || activeStep === 'roles')) {
      refreshLiveOrgOptions();
      if (activeStep === 'team_invite') {
        loadShareInviteLink();
      }
    }
  }, [activeStep, showPreStepper]);

  const handleSelectInviteRoleOrSys = (val: string) => {
    setInviteSelection(val);
    if (val === 'sys:ADMIN') {
      setInviteRole('ADMIN');
      setInviteRoleId('');
      setInviteDataScope('GLOBAL');
      setInvitePerms([]);
      return;
    }
    if (val.startsWith('role:')) {
      const rId = val.slice(5);
      const matched = staffRoles.find((r) => r.id === rId || r.name === rId);
      setInviteRole('MEMBER'); // Internal DB carrier; actual permissions driven by roleId
      setInviteRoleId(matched?.id || '');
      if (matched?.dataScope) setInviteDataScope(matched.dataScope);
      if (Array.isArray(matched?.permissionCodes)) {
        setInvitePerms(matched.permissionCodes);
      }
      if (matched?.name && !inviteDesigTitle) {
        setInviteDesigTitle(matched.name);
      }
    } else {
      setInviteRole('MEMBER');
      setInviteRoleId('');
    }
  };

  const handleSelectInviteDesignation = (desigId: string) => {
    setInviteDesigId(desigId);
    const matched = designations.find((d) => d.id === desigId || d.title === desigId);
    if (matched) {
      setInviteDesigTitle(matched.title);
      if (matched.defaultDataScope) setInviteDataScope(matched.defaultDataScope);
      if (matched.departmentId) setInviteDeptId(matched.departmentId);
      if (Array.isArray(matched.permissionCodes) && matched.permissionCodes.length > 0) {
        setInvitePerms(matched.permissionCodes);
      }
    } else {
      setInviteDesigTitle('');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const selectedRoleObj = staffRoles.find((r) => r.id === inviteRoleId);
      const res = await fetch(`${BRANDING.apiUrl}/people/invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email: inviteEmail.trim(),
          firstName: inviteFirstName.trim() || 'Team',
          lastName: inviteLastName.trim() || 'Member',
          accessRole: inviteRole === 'ADMIN' ? 'ADMIN' : 'MEMBER',
          ...(inviteRoleId ? { roleId: inviteRoleId } : {}),
          departmentId: inviteDeptId || undefined,
          teamId: inviteTeamId || undefined,
          designationId: designations.find((d) => d.id === inviteDesigId)?.id || undefined,
          designationTitle: inviteDesigTitle || selectedRoleObj?.name || undefined,
          dataScope: inviteDataScope || undefined,
          ...(invitePerms.length > 0 ? { permissionCodes: invitePerms } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invitation failed');
      const payload = data?.data !== undefined ? data.data : data;
      const generatedLink = payload?.inviteLink || payload?.invitation?.inviteLink;

      toast.success('Invitation created for ' + inviteEmail);
      setLastSentInvite({
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim() || 'there',
        inviteLink: generatedLink,
        roleName: inviteRole === 'ADMIN' ? 'Admin' : selectedRoleObj?.name || inviteDesigTitle || 'Staff',
      });
      setSentInvites((prev) => [...prev, { email: inviteEmail.trim(), inviteLink: generatedLink }]);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleUpdateShareLink = async (patch: any) => {
    setShareLinkLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/invite-link`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(patch),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw?.message || 'Failed to update invite link');
      const payload = raw?.data !== undefined ? raw.data : raw;
      setShareLinkData(payload);
      toast.success(patch.regenerate ? 'Shareable invite link regenerated!' : 'Shareable invite link updated');
    } catch (err: any) {
      toast.error(err?.message || 'Error updating shareable invite link');
    } finally {
      setShareLinkLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard!');
  };

  const handleOpenGmailDraft = (toEmail: string, firstName: string, linkUrl: string, roleLabel?: string) => {
    const subject = `You're invited to join ${orgName || BRANDING.name} on ${BRANDING.name}`;
    const body = `Hi ${firstName || 'there'},\n\nI'd like to invite you to join ${orgName || 'our team'} on ${BRANDING.name}${
      roleLabel ? ` as ${roleLabel}` : ''
    }.\n\nClick the link below to accept your invitation and complete your profile setup:\n${linkUrl}\n\nBest regards,\n${
      orgName || BRANDING.name
    } Team`;
    window.open(buildGmailComposeUrl(toEmail, subject, body), '_blank', 'noopener,noreferrer');
  };

  const handleParseBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed = lines
      .map((line) => {
        const parts = line.split(/[,\t;]+/).map((p) => p.trim());
        const email = parts[0] || '';
        const firstName = parts[1] || email.split('@')[0] || 'Team';
        const lastName = parts[2] || '';
        return { email, firstName, lastName };
      })
      .filter((r) => r.email.includes('@'));

    if (parsed.length === 0) {
      toast.error('No valid email rows found. Format: email@company.com, FirstName, LastName');
      return;
    }
    setBulkRows((prev) => {
      const existingNonEmpty = prev.filter((r) => r.email.trim().length > 0);
      return [...existingNonEmpty, ...parsed];
    });
    setBulkPasteText('');
    toast.success(`Added ${parsed.length} row(s) to bulk invite queue`);
  };

  const handleSendBulkInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = bulkRows.filter((r) => r.email.trim().includes('@'));
    if (validRows.length === 0) {
      toast.error('Add at least one valid email address.');
      return;
    }
    setSendingBulk(true);
    setBulkResults(null);
    try {
      const selectedRoleObj = staffRoles.find((r) => r.id === inviteRoleId);
      const invitations = validRows.map((row) => {
        const rowDesig = designations.find((d) => d.id === (row.designationId || inviteDesigId));
        return {
          email: row.email.trim(),
          firstName: (row.firstName || row.email.split('@')[0] || 'Team').trim(),
          lastName: (row.lastName || '').trim(),
          accessRole: inviteRole === 'ADMIN' ? 'ADMIN' : 'MEMBER',
          ...(row.roleId || inviteRoleId ? { roleId: row.roleId || inviteRoleId } : {}),
          departmentId: row.departmentId || inviteDeptId || rowDesig?.departmentId || undefined,
          teamId: row.teamId || inviteTeamId || undefined,
          designationId: rowDesig?.id || undefined,
          designationTitle:
            row.designationTitle || rowDesig?.title || selectedRoleObj?.name || inviteDesigTitle || undefined,
          dataScope: row.dataScope || rowDesig?.defaultDataScope || inviteDataScope || undefined,
          ...(invitePerms.length > 0 ? { permissionCodes: invitePerms } : {}),
        };
      });

      const res = await fetch(`${BRANDING.apiUrl}/people/invite/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ invitations }),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw?.message || 'Bulk invitation failed');
      const payload = raw?.data !== undefined ? raw.data : raw;
      const results = payload?.results || [];
      setBulkResults(results);
      const sentItems = results
        .filter((r: any) => r.status === 'SENT')
        .map((r: any) => ({ email: r.email, inviteLink: r.inviteLink }));
      if (sentItems.length > 0) {
        setSentInvites((prev) => [...prev, ...sentItems]);
      }
      toast.success(payload?.message || `Dispatched ${sentItems.length} invitation(s)`);
    } catch (err: any) {
      toast.error(err?.message || 'Bulk invitation failed');
    } finally {
      setSendingBulk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show Welcome Dog + Industry/8-Size + Recommended Modules + Choice BEFORE the stepper tabs
  if (showPreStepper) {
    return (
      <PreStepperOnboarding
        workspaceName={orgName || status?.setupData?.profile?.name}
        initialStage={preStepperStage}
        initialIndustries={status?.industries || []}
        initialOrgSize={status?.orgSize || orgSize || '0-10'}
        initialEnabledModules={status?.enabledModules || []}
        initialFeatureToggles={status?.moduleFeatureToggles || {}}
        onEnterStepper={() => {
          setShowPreStepper(false);
          router.replace('/app/onboarding?mode=stepper');
          loadStatus(true);
        }}
        onSkipToDashboard={() => {
          router.push('/app/home');
        }}
      />
    );
  }

  const currentStepObj = stepsList.find((s) => s.id === activeStep);
  const isMandatory = currentStepObj?.mandatory;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Onboarding Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-primary font-semibold">
                Organization Structure Setup
              </span>
              <Badge variant="outline" className="text-[10px]">
                {status?.isCompleted ? 'Core Setup Completed' : 'Setup In Progress'}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1">
              Configure Your Organization
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up schedules, locations, departments, custom staff roles, and invite links step by step.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreStepperStage('industries_size');
                setShowPreStepper(true);
              }}
              className="text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Modules &amp; Size
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/app/home')}
              className="text-xs"
            >
              Exit to Dashboard
            </Button>
            {status?.isCompleted && (
              <Button
                size="sm"
                onClick={() => router.push('/app/home')}
                className="text-xs gap-1.5"
              >
                Finish Setup <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Overall Setup Progress</span>
            <span className="font-semibold text-foreground">{status?.progressPercentage || 0}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${status?.progressPercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Steps Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {stepsList.map((s, idx) => {
            const isCompleted = status?.completedSteps?.includes(s.id);
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs transition-all text-center ${
                  isActive
                    ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                    : isCompleted
                    ? 'border-border bg-card text-foreground font-medium hover:border-muted-foreground'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-current text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <span className="truncate w-full">{s.name}</span>
                <span className="text-[9px] mt-0.5 text-muted-foreground">
                  {s.mandatory ? '(Required)' : '(Optional)'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Step Form Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span>{currentStepObj?.name}</span>
              {isMandatory ? (
                <Badge variant="default" className="text-[10px] uppercase font-mono">Mandatory</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] uppercase font-mono">Optional</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {activeStep === 'profile' && 'Verify your organization name, primary industry, country, and timezone.'}
              {activeStep === 'schedule' && 'Define standard working hours, days, and shifts for attendance.'}
              {activeStep === 'holidays' && 'Add national or company public holidays to the workspace calendar.'}
              {activeStep === 'locations' && 'Register office locations (headquarters, branches, remote hubs).'}
              {activeStep === 'departments' && 'Create departments, functional teams, and workplace designations.'}
              {activeStep === 'roles' && 'Owner and Admin are your system roles. Create and customize Staff Roles with independent module & scope permissions.'}
              {activeStep === 'team_invite' && 'Invite team members via email/Gmail or copy your shareable workspace invite link.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {/* STEP 1: Organization Profile */}
            {activeStep === 'profile' && (
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Legal or brand name of the company"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Primary Industry</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="GENERAL">General Business &amp; Services</option>
                    <option value="IT_SOFTWARE">Software, IT &amp; Technology</option>
                    <option value="OPERATIONS_BPO">Operations, BPO &amp; Support</option>
                    <option value="MARKETING_AGENCY">Marketing, Creative &amp; Agency</option>
                    <option value="FINANCE_ACCOUNTING">Finance, Accounting &amp; Consulting</option>
                    <option value="HEALTHCARE">Healthcare &amp; Wellness</option>
                    <option value="RETAIL_ECOMMERCE">Retail, D2C &amp; E-Commerce</option>
                    <option value="MANUFACTURING_LOGISTICS">Manufacturing &amp; Logistics</option>
                    <option value="EDUCATION">Education &amp; Training</option>
                    <option value="CONSTRUCTION_REAL_ESTATE">Construction &amp; Real Estate</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Country *</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="Singapore">Singapore</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Timezone *</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="UTC+05:30 (India Standard Time)">UTC+05:30 IST</option>
                      <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                      <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                      <option value="UTC+00:00 (London)">UTC+00:00 (London)</option>
                      <option value="UTC+01:00 (Central European Time)">UTC+01:00 (CET)</option>
                      <option value="UTC+08:00 (Singapore / HK)">UTC+08:00 (SGT / HK)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Organization Size *</label>
                  <select
                    value={orgSize}
                    onChange={(e) => setOrgSize(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="0-10">0 - 10 employees</option>
                    <option value="11-25">11 - 25 employees</option>
                    <option value="26-50">26 - 50 employees</option>
                    <option value="51-100">51 - 100 employees</option>
                    <option value="101-250">101 - 250 employees</option>
                    <option value="251-500">251 - 500 employees</option>
                    <option value="501-1000">501 - 1,000 employees</option>
                    <option value="1000+">Above 1,000 employees</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: Work Schedule */}
            {activeStep === 'schedule' && (
              <div className="space-y-5 max-w-xl">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Working Days *</label>
                  <div className="flex flex-wrap gap-2">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                      const isSelected = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setWorkingDays((prev) =>
                              isSelected ? prev.filter((d) => d !== day) : [...prev, day],
                            )
                          }
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-background text-muted-foreground border-input hover:border-foreground'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Hours / Day</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={workHoursPerDay}
                      onChange={(e) => setWorkHoursPerDay(Number(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Public Holidays */}
            {activeStep === 'holidays' && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Holiday Name (e.g. Republic Day)"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="sm:col-span-5 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="sm:col-span-3 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <select
                    value={newHolidayType}
                    onChange={(e) => setNewHolidayType(e.target.value)}
                    className="sm:col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="NATIONAL">NATIONAL</option>
                    <option value="COMPANY">COMPANY</option>
                    <option value="OPTIONAL">OPTIONAL</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="sm:col-span-2 text-xs h-8 font-semibold"
                    onClick={() => {
                      if (!newHolidayName.trim() || !newHolidayDate) return;
                      setHolidays([
                        ...holidays,
                        { name: newHolidayName.trim(), date: newHolidayDate, type: newHolidayType },
                      ]);
                      setNewHolidayName('');
                      setNewHolidayDate('');
                    }}
                  >
                    + Add Holiday
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {holidays.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No holidays added yet. Add national/company holidays or click Save &amp; Continue.
                    </p>
                  ) : (
                    holidays.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{h.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({h.date})
                          </span>
                          <Badge variant="outline" className="text-[9px] py-0">
                            {h.type}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHolidays(holidays.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Office Locations */}
            {activeStep === 'locations' && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Location Name (e.g. Head Office)"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="sm:col-span-4 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="City (e.g. Mumbai)"
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                    className="sm:col-span-3 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <select
                    value={newLocCountry}
                    onChange={(e) => setNewLocCountry(e.target.value)}
                    className="sm:col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Singapore">Singapore</option>
                    <option value="United Arab Emirates">UAE</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="sm:col-span-2 text-xs h-8 font-semibold"
                    onClick={() => {
                      if (!newLocName.trim() || !newLocCity.trim()) return;
                      setLocations([
                        ...locations,
                        {
                          name: newLocName.trim(),
                          city: newLocCity.trim(),
                          country: newLocCountry.trim(),
                          isPrimary: newLocIsPrimary || locations.length === 0,
                        },
                      ]);
                      setNewLocName('');
                      setNewLocCity('');
                      setNewLocIsPrimary(false);
                    }}
                  >
                    + Add Location
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    id="setAsPrimary"
                    checked={newLocIsPrimary}
                    onChange={(e) => setNewLocIsPrimary(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input accent-primary"
                  />
                  <label htmlFor="setAsPrimary" className="cursor-pointer">
                    Set as Primary location
                  </label>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No office locations added yet.
                    </p>
                  ) : (
                    locations.map((loc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({loc.city}, {loc.country})
                          </span>
                          {loc.isPrimary && (
                            <Badge variant="default" className="text-[9px] py-0">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocations(locations.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Departments, Teams & Designations */}
            {activeStep === 'departments' && (
              <div className="space-y-6">
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      1. Departments ({departments.length})
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Departments structure reporting and analytics without locking module access.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Department Name (e.g. Human Resources)"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="sm:col-span-6 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Code (e.g. HR)"
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                      className="sm:col-span-3 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="sm:col-span-3 text-xs h-8 font-semibold"
                      onClick={() => {
                        if (!newDeptName.trim()) return;
                        setDepartments([
                          ...departments,
                          { name: newDeptName.trim(), code: newDeptCode.trim().toUpperCase() },
                        ]);
                        setNewDeptName('');
                        setNewDeptCode('');
                      }}
                    >
                      + Add Department
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {departments.map((d, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border text-xs"
                      >
                        <span className="font-semibold text-foreground">{d.name}</span>
                        {d.code && (
                          <span className="text-[10px] font-mono text-muted-foreground">({d.code})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setDepartments(departments.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teams */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      2. Functional Teams ({teams.length})
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Create squads or sub-teams inside departments (e.g. Platform Squad, Talent Ops).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Team Name (e.g. Core Engineering)"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="sm:col-span-5 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    />
                    <select
                      value={newTeamDeptName}
                      onChange={(e) => setNewTeamDeptName(e.target.value)}
                      className="sm:col-span-4 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    >
                      <option value="">Link to Department (Optional)</option>
                      {departments.map((d, idx) => (
                        <option key={d.id || idx} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      className="sm:col-span-3 text-xs h-8 font-semibold"
                      onClick={() => {
                        if (!newTeamName.trim()) return;
                        const matchedDept = departments.find((dp) => dp.name === newTeamDeptName);
                        setTeams([
                          ...teams,
                          {
                            name: newTeamName.trim(),
                            departmentName: newTeamDeptName || undefined,
                            departmentId: matchedDept?.id || undefined,
                          },
                        ]);
                        setNewTeamName('');
                      }}
                    >
                      + Add Team
                    </Button>
                  </div>

                  {teams.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {teams.map((t, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border text-xs"
                        >
                          <span className="font-semibold text-foreground">{t.name}</span>
                          {t.departmentName && (
                            <span className="text-[10px] text-muted-foreground">
                              ({t.departmentName})
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setTeams(teams.filter((_, idx) => idx !== i))}
                            className="text-destructive hover:opacity-80"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Designations (Unified with Roles — no MANAGER/MEMBER confusion) */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      3. Job Titles / Designations ({designations.length})
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Add workplace job titles. Permissions and data visibility scope customize automatically without needing rigid Manager/Member tiers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Job Title / Designation (e.g. Software Engineer)"
                      value={newDesigTitle}
                      onChange={(e) => setNewDesigTitle(e.target.value)}
                      className="sm:col-span-5 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    />
                    <select
                      value={newDesigDeptName}
                      onChange={(e) => setNewDesigDeptName(e.target.value)}
                      className="sm:col-span-4 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d, idx) => (
                        <option key={d.id || idx} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newDesigScope}
                      onChange={(e) => setNewDesigScope(e.target.value as any)}
                      className="sm:col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="ASSIGNED">Scope: Assigned</option>
                      <option value="OWN">Scope: Personal</option>
                      <option value="TEAM">Scope: Team</option>
                      <option value="DEPARTMENT">Scope: Department</option>
                      <option value="GLOBAL">Scope: Org-wide</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-border bg-muted/15 max-h-28 overflow-y-auto">
                    {ONBOARDING_PERM_OPTIONS.map((code) => {
                      const checked = newDesigPerms.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() =>
                            setNewDesigPerms((prev) =>
                              checked ? prev.filter((c) => c !== code) : [...prev, code],
                            )
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                            checked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-foreground'
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs h-8 font-semibold"
                      onClick={() => {
                        if (!newDesigTitle.trim()) {
                          toast.error('Enter a designation title');
                          return;
                        }
                        const matchedDept = departments.find((dp) => dp.name === newDesigDeptName);
                        setDesignations((prev) => [
                          ...prev.filter(
                            (d) => d.title.toLowerCase() !== newDesigTitle.trim().toLowerCase(),
                          ),
                          {
                            title: newDesigTitle.trim(),
                            level: Number(newDesigLevel) || 2,
                            departmentName: newDesigDeptName || undefined,
                            departmentId: matchedDept?.id || undefined,
                            defaultAccessRole: 'MEMBER', // internal carrier only
                            defaultDataScope: newDesigScope,
                            permissionCodes: [...newDesigPerms],
                          },
                        ]);
                        setNewDesigTitle('');
                        toast.success('Designation added');
                      }}
                    >
                      + Add Designation
                    </Button>
                  </div>

                  {designations.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1 border-t border-border/60">
                      {designations.map((dg, idx) => (
                        <div
                          key={dg.id || idx}
                          className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30 border border-border/70 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-foreground">{dg.title}</span>
                            <Badge variant="secondary" className="text-[9px] font-mono">
                              Scope: {dg.defaultDataScope}
                            </Badge>
                            {dg.departmentName && (
                              <span className="text-[10px] text-muted-foreground">
                                • {dg.departmentName}
                              </span>
                            )}
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              • {dg.permissionCodes?.length || 0} perms
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDesignations(designations.filter((_, i) => i !== idx))
                            }
                            className="text-destructive hover:opacity-80 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 6: Roles & Access (Owner, Admin + Customizable Staff Roles) */}
            {activeStep === 'roles' && (
              <div className="space-y-5">
                {/* System Roles Card */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Platform System Roles (Fixed)
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Only Owner &amp; Admin are platform roles
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-purple-500/30 bg-card flex items-start gap-2.5">
                      <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px]">
                        Owner
                      </Badge>
                      <p className="text-[11px] text-muted-foreground">
                        Full workspace ownership, billing, subscription management, and unrestricted access.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-card flex items-start gap-2.5">
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                        Admin
                      </Badge>
                      <p className="text-[11px] text-muted-foreground">
                        Full workspace administration across modules, teams, roles, and settings.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Create Custom Staff Organization Role */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Create / Customize Staff Roles ({staffRoles.length})
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Grant independent module permissions and optional delegation (Team Lead can invite &amp; configure team permissions; HR Specialist can approve leave/directory org-wide).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      type="text"
                      placeholder="Role Name (e.g. Team Lead, HR Specialist, Analyst)"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="sm:col-span-5 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Short description (optional)"
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      className="sm:col-span-4 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    />
                    <select
                      value={newRoleScope}
                      onChange={(e) => setNewRoleScope(e.target.value as any)}
                      className="sm:col-span-3 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                    >
                      <option value="ASSIGNED">Scope: Assigned</option>
                      <option value="OWN">Scope: Personal</option>
                      <option value="TEAM">Scope: Team</option>
                      <option value="DEPARTMENT">Scope: Department</option>
                      <option value="GLOBAL">Scope: Org-wide</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ONBOARDING_PERM_GROUPS.map((grp) => (
                      <div
                        key={grp.group}
                        className="rounded-lg border border-border/80 bg-muted/15 p-3 space-y-2"
                      >
                        <div className="text-[11px] font-bold text-foreground">{grp.group}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {grp.perms.map((p) => {
                            const active = newRolePerms.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() =>
                                    setNewRolePerms((prev) =>
                                      active ? prev.filter((c) => c !== p.code) : [...prev, p.code],
                                    )
                                  }
                                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                                />
                                <span className="truncate">{p.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs font-semibold gap-1.5"
                      onClick={() => {
                        if (!newRoleName.trim()) {
                          toast.error('Enter a role name');
                          return;
                        }
                        const upper = newRoleName.trim().toUpperCase();
                        if (['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(upper)) {
                          toast.error('Please use a descriptive staff role name (e.g. Team Lead, Specialist).');
                          return;
                        }
                        setStaffRoles((prev) => [
                          ...prev.filter((r) => r.name.toLowerCase() !== newRoleName.trim().toLowerCase()),
                          {
                            name: newRoleName.trim(),
                            description: newRoleDesc.trim() || `Configured access profile for ${newRoleName.trim()}`,
                            dataScope: newRoleScope,
                            permissionCodes: [...newRolePerms],
                          },
                        ]);
                        setNewRoleName('');
                        setNewRoleDesc('');
                        toast.success('Staff role added — click Save & Continue to apply.');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add / Update Staff Role
                    </Button>
                  </div>

                  {staffRoles.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border/60">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Configured Staff Roles
                      </div>
                      {staffRoles.map((r, idx) => (
                        <div
                          key={r.id || r.name || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/20 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-foreground">{r.name}</span>
                              <Badge variant="outline" className="text-[9px] font-mono">
                                Scope: {r.dataScope}
                              </Badge>
                              {(r.permissionCodes?.includes('roles:manage') ||
                                r.permissionCodes?.includes('invitations:manage')) && (
                                <Badge variant="secondary" className="text-[9px]">
                                  Can Invite &amp; Configure Access
                                </Badge>
                              )}
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                • {r.permissionCodes?.length || 0} permissions
                              </span>
                            </div>
                            {r.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {r.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setNewRoleName(r.name);
                                setNewRoleDesc(r.description || '');
                                setNewRoleScope(r.dataScope || 'TEAM');
                                setNewRolePerms(r.permissionCodes || []);
                              }}
                              className="text-[11px] text-primary hover:underline font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setStaffRoles(staffRoles.filter((_, i) => i !== idx))}
                              className="text-destructive hover:opacity-80 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 7: Team Invites (Single + Bulk + Compose in Gmail + Shareable Invite Link) */}
            {activeStep === 'team_invite' && (
              <div className="space-y-5">
                {/* Shareable Workspace Link Banner */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/[0.04] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-primary" />
                        <span>Shareable Workspace Invite Link</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Anyone with this link can create an account, land on Profile Setup, and join your workspace.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={shareLinkLoading || !shareLinkData?.joinUrl}
                        onClick={() => handleCopyLink(shareLinkData?.joinUrl)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!shareLinkData?.joinUrl}
                        onClick={() =>
                          handleOpenGmailDraft(
                            inviteEmail || '',
                            inviteFirstName || 'Team',
                            shareLinkData?.joinUrl,
                          )
                        }
                        className="text-xs h-8 gap-1.5"
                      >
                        <Mail className="h-3.5 w-3.5 text-red-500" />
                        Share via Gmail
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={shareLinkLoading}
                        onClick={() => handleUpdateShareLink({ regenerate: true })}
                        title="Reset invite code"
                        className="h-8 w-8"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${shareLinkLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  {shareLinkData?.joinUrl && (
                    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground truncate">
                      {shareLinkData.joinUrl}
                    </div>
                  )}
                </div>

                {/* Mode Selector */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setInviteMode('single')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        inviteMode === 'single'
                          ? 'bg-background text-primary shadow-xs'
                          : 'text-muted-foreground'
                      }`}
                    >
                      Single Invitation
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteMode('bulk')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        inviteMode === 'bulk'
                          ? 'bg-background text-primary shadow-xs'
                          : 'text-muted-foreground'
                      }`}
                    >
                      Bulk Invitations
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {staffRoles.length} Staff Role(s) • {departments.length} Dept(s) • {teams.length} Team(s)
                  </span>
                </div>

                {/* Shared Role / Placement / Independent Permission Config */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/15 space-y-3 text-xs">
                  <div className="font-bold text-foreground">
                    {inviteMode === 'bulk'
                      ? 'Default Role & Placement for Bulk Batch'
                      : 'Configure Invitee Role, Placement & Scope'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Role</label>
                      <select
                        value={inviteSelection}
                        onChange={(e) => handleSelectInviteRoleOrSys(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                      >
                        <option value="">-- Select Staff Role --</option>
                        {staffRoles.map((r, idx) => (
                          <option key={r.id || idx} value={`role:${r.id || r.name}`}>
                            {r.name} ({r.dataScope})
                          </option>
                        ))}
                        <option value="sys:ADMIN">Admin (Platform Admin)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Designation Title</label>
                      <select
                        value={inviteDesigId}
                        onChange={(e) => handleSelectInviteDesignation(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                      >
                        <option value="">-- Optional Job Title --</option>
                        {designations.map((d, idx) => (
                          <option key={d.id || idx} value={d.id || d.title}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Department</label>
                      <select
                        value={inviteDeptId}
                        onChange={(e) => setInviteDeptId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                      >
                        <option value="">-- Select Department --</option>
                        {departments
                          .filter((d) => d.id)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Team &amp; Data Scope</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={inviteTeamId}
                          onChange={(e) => setInviteTeamId(e.target.value)}
                          className="rounded-md border border-input bg-background px-1.5 py-1.5 text-xs"
                        >
                          <option value="">Any Team</option>
                          {teams
                            .filter(
                              (t) =>
                                t.id &&
                                (!inviteDeptId || !t.departmentId || t.departmentId === inviteDeptId),
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                        <select
                          value={inviteDataScope}
                          onChange={(e) => setInviteDataScope(e.target.value)}
                          className="rounded-md border border-input bg-background px-1.5 py-1.5 text-xs"
                        >
                          <option value="ASSIGNED">ASSIGNED</option>
                          <option value="OWN">OWN</option>
                          <option value="TEAM">TEAM</option>
                          <option value="DEPARTMENT">DEPT</option>
                          <option value="GLOBAL">GLOBAL</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowInvitePermEditor(!showInvitePermEditor)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      {showInvitePermEditor ? 'Hide' : 'Customize'} Member Permission Exceptions ({invitePerms.length} selected)
                    </button>
                    {showInvitePermEditor && (
                      <div className="mt-2 flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-border bg-background max-h-32 overflow-y-auto">
                        {ONBOARDING_PERM_OPTIONS.map((code) => {
                          const active = invitePerms.includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() =>
                                setInvitePerms((prev) =>
                                  active ? prev.filter((c) => c !== code) : [...prev, code],
                                )
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted/20 text-muted-foreground border-border'
                              }`}
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {inviteMode === 'single' ? (
                  <form onSubmit={handleSendInvite} className="space-y-3 border-b border-border pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">First Name</label>
                        <input
                          type="text"
                          placeholder="First name"
                          value={inviteFirstName}
                          onChange={(e) => setInviteFirstName(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Last Name</label>
                        <input
                          type="text"
                          placeholder="Last name"
                          value={inviteLastName}
                          onChange={(e) => setInviteLastName(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Work Email *</label>
                        <input
                          type="email"
                          required
                          placeholder="teammate@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {shareLinkData?.joinUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOpenGmailDraft(
                              inviteEmail,
                              inviteFirstName || 'there',
                              shareLinkData.joinUrl,
                            )
                          }
                          className="text-xs h-8 gap-1.5"
                        >
                          <Mail className="h-3.5 w-3.5 text-red-500" />
                          Compose in Gmail
                        </Button>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sendingInvite}
                        className="text-xs h-8 font-semibold"
                      >
                        {sendingInvite ? 'Sending...' : 'Send Email Invitation'}
                      </Button>
                    </div>

                    {lastSentInvite?.inviteLink && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            Personal invite link ready for {lastSentInvite.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(lastSentInvite.inviteLink!)}
                            className="h-7 text-[11px] gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy Link
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleOpenGmailDraft(
                                lastSentInvite.email,
                                lastSentInvite.firstName,
                                lastSentInvite.inviteLink!,
                                lastSentInvite.roleName,
                              )
                            }
                            className="h-7 text-[11px] gap-1"
                          >
                            <Mail className="h-3 w-3 text-red-500" />
                            Send via Gmail
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleSendBulkInvites} className="space-y-3 border-b border-border pb-4 text-xs">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <textarea
                        rows={2}
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        placeholder="Quick paste one per line: email@company.com, FirstName, LastName"
                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleParseBulkPaste}
                        className="shrink-0 text-xs"
                      >
                        Add Lines
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {bulkRows.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                          <input
                            type="email"
                            placeholder="email@company.com *"
                            value={row.email}
                            onChange={(e) =>
                              setBulkRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, email: e.target.value } : r)),
                              )
                            }
                            className="sm:col-span-4 rounded border border-input bg-background px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="First Name"
                            value={row.firstName}
                            onChange={(e) =>
                              setBulkRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, firstName: e.target.value } : r,
                                ),
                              )
                            }
                            className="sm:col-span-2 rounded border border-input bg-background px-2 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={row.lastName}
                            onChange={(e) =>
                              setBulkRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, lastName: e.target.value } : r,
                                ),
                              )
                            }
                            className="sm:col-span-2 rounded border border-input bg-background px-2 py-1.5 text-xs"
                          />
                          <select
                            value={row.roleId || ''}
                            onChange={(e) =>
                              setBulkRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, roleId: e.target.value } : r,
                                ),
                              )
                            }
                            className="sm:col-span-3 rounded border border-input bg-background px-2 py-1.5 text-[11px]"
                          >
                            <option value="">
                              Use Default ({staffRoles.find((r) => r.id === inviteRoleId)?.name || 'Staff'})
                            </option>
                            {staffRoles.map((sr, sIdx) => (
                              <option key={sr.id || sIdx} value={sr.id}>
                                {sr.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setBulkRows((prev) =>
                                prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
                              )
                            }
                            className="sm:col-span-1 text-destructive p-1 flex justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setBulkRows((prev) => [...prev, { email: '', firstName: '', lastName: '' }])
                        }
                        className="text-xs h-8 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Another Row
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sendingBulk}
                        className="text-xs h-8 font-semibold"
                      >
                        {sendingBulk
                          ? 'Dispatching Bulk Batch...'
                          : `Send ${bulkRows.filter((r) => r.email.trim()).length} Bulk Invitations`}
                      </Button>
                    </div>

                    {bulkResults && (
                      <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1 max-h-32 overflow-y-auto">
                        {bulkResults.map((res: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="font-mono">{res.email}</span>
                            <span
                              className={
                                res.status === 'SENT'
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-destructive'
                              }
                            >
                              {res.status === 'SENT' ? 'Sent' : res.error || 'Failed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>
                )}

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">
                    Sent Invitations ({sentInvites.length})
                  </div>
                  {sentInvites.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">
                      No invitations dispatched yet. Invite teammates above, share your workspace link, or skip for later.
                    </p>
                  ) : (
                    sentInvites.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Invitation ready for {item.email}</span>
                        </div>
                        {item.inviteLink && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(item.inviteLink!)}
                              className="underline text-[11px]"
                            >
                              Copy Link
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenGmailDraft(item.email, 'there', item.inviteLink!)
                              }
                              className="underline text-[11px]"
                            >
                              Gmail
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeStep !== 'profile' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="text-xs gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              {!isMandatory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {activeStep === 'team_invite' ? 'Skip for later' : 'Skip this step'}
                </Button>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={handleNext}
              className="text-xs gap-1.5 font-semibold"
            >
              {saving
                ? 'Saving Progress...'
                : activeStep === 'team_invite'
                ? 'Finish Setup'
                : 'Save & Continue'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingJourneyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingJourneyContent />
    </Suspense>
  );
}
