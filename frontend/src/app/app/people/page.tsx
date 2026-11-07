'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  User,
  UserPlus,
  Building2,
  Briefcase,
  Shield,
  ShieldAlert,
  Crown,
  AlertCircle,
  Mail,
  MoreVertical,
  Search,
  Calendar,
  AlertTriangle,
  UserX,
  UserCheck,
  RotateCcw,
  Trash2,
  FileText,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Laptop,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Info,
  Pencil,
  ArrowUpRight,
  Eye,
  EyeOff,
  Landmark,
  ShieldCheck,
  MapPin,
  Phone,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Network,
  Lock,
  Filter,
  ListFilter,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/user-avatar';

export default function PeoplePage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
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
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.id || '';
      }
    } catch {}
    return '';
  });
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return (parsed.email || '').toLowerCase().trim();
      }
    } catch {}
    return '';
  });
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Permission helpers: Owner & HR (Admin) can edit any member; others can only edit their own profile
  const isCurrentUserOwnerOrAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const isSelfMember = (m: any): boolean => {
    if (!m) return false;
    const myUid = (currentUserId || '').trim();
    const myEmail = (currentUserEmail || '').toLowerCase().trim();
    const myMid = (currentMemberId || '').trim();

    const mUid = (m.userId || m.user?.id || '').trim();
    const mEmail = (m.user?.email || m.email || '').toLowerCase().trim();
    const mId = (m.id || '').trim();

    if (myUid && mUid && myUid === mUid) return true;
    if (myMid && mId && myMid === mId) return true;
    if (myEmail && mEmail && myEmail === mEmail) return true;

    return false;
  };

  const canEditMember = (m: any): boolean => {
    if (!m) return false;
    // The Workspace Owner account is protected: only the Owner themselves can edit their record
    if (m.accessRole === 'OWNER') {
      return isSelfMember(m);
    }
    // For other members, either the member themselves or an Admin/Owner can edit
    return isCurrentUserOwnerOrAdmin || isSelfMember(m);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showOrgChartModal, setShowOrgChartModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<any>(null);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [loadingEmployeeTasks, setLoadingEmployeeTasks] = useState(false);
  const [showAssignedTasks, setShowAssignedTasks] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDept('');
    setFilterDesignation('');
    setFilterTeam('');
    setFilterRole('');
  };

  const handleOpenEmployeeProfile = async (member: any) => {
    if (member?.accessRole === 'OWNER') return;
    setViewingEmployee(member);
    setShowAssignedTasks(false);
    setLoadingEmployeeTasks(true);
    setEmployeeTasks([]);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const wsId = typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (wsId) headers['x-workspace-id'] = wsId;

      // 1. Fetch tasks filtered by assignee membership
      const res = await fetch(`${BRANDING.apiUrl}/tasks?assigneeMembershipId=${member.id}`, { headers });
      let list: any[] = [];
      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      }

      // 2. Fallback: if query returned 0, fetch all tasks and filter client-side
      if (list.length === 0) {
        const allRes = await fetch(`${BRANDING.apiUrl}/tasks`, { headers }).catch(() => null);
        if (allRes && allRes.ok) {
          const allData = await allRes.json();
          const allTasks: any[] = Array.isArray(allData.data) ? allData.data : Array.isArray(allData) ? allData : [];
          list = allTasks.filter((t: any) => {
            if (t.assigneeMembershipId === member.id) return true;
            if (Array.isArray(t.assigneeMembershipIds) && t.assigneeMembershipIds.includes(member.id)) return true;
            if (t.assigneeId === member.id || (member.userId && t.assigneeId === member.userId)) return true;
            if (t.assignee?.id === member.id || (member.userId && t.assignee?.userId === member.userId)) return true;
            if (
              t.assignee?.user?.email &&
              member.user?.email &&
              t.assignee.user.email.toLowerCase().trim() === member.user.email.toLowerCase().trim()
            ) {
              return true;
            }
            return false;
          });
        }
      }

      setEmployeeTasks(list);
    } catch (err) {
      console.error('Error fetching employee tasks:', err);
      if (member.assignedTasks && Array.isArray(member.assignedTasks)) {
        setEmployeeTasks(member.assignedTasks);
      }
    } finally {
      setLoadingEmployeeTasks(false);
    }
  };

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding'>('personal');
  const [createdInviteInfo, setCreatedInviteInfo] = useState<{
    email: string;
    link: string;
    emailDelivered?: boolean;
    senderName?: string;
    senderEmail?: string;
  } | null>(null);

  // Offboarding modal state
  const [showOffboardModal, setShowOffboardModal] = useState(false);
  const [offboardMember, setOffboardMember] = useState<any>(null);
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [reassignToId, setReassignToId] = useState('');

  // Transfer Ownership modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  // Edit Role & Designation modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [updatingMember, setUpdatingMember] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'personal' | 'banking' | 'identity' | 'org'>('personal');
  const [showMemberSecrets, setShowMemberSecrets] = useState<Record<string, boolean>>({});
  const toggleMemberSecret = (key: string) => {
    setShowMemberSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getMemberExtraData = (m: any) => {
    if (!m) return {};
    let extra: any = {};
    if (m.emergencyContact) {
      if (typeof m.emergencyContact === 'string') {
        try {
          extra = JSON.parse(m.emergencyContact);
        } catch {
          extra = { emergencyName: m.emergencyContact };
        }
      } else if (typeof m.emergencyContact === 'object') {
        extra = m.emergencyContact;
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`orvexa_member_extra_${m.id}`);
        if (cached) {
          extra = { ...JSON.parse(cached), ...extra };
        }
      } catch {}
    }
    return extra;
  };

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    accessRole: 'MEMBER',
    roleId: '',
    departmentId: '',
    teamId: '',
    designationId: '',
    designationTitle: '',
    dataScope: 'ASSIGNED',
    // Personal Details
    dateOfBirth: '',
    gender: 'male',
    address: '',
    district: '',
    statePostcode: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    // Bank Account Details
    bankName: '',
    branchName: '',
    accountHolder: '',
    accountNumber: '',
    ifscCode: '',
    // Identity Details (Aadhaar & PAN)
    aadhaarNumber: '',
    panNumber: '',
    docApprovedId: false,
    docPanCard: false,
    docPassportPhoto: false,
  });

  // Invite Form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    accessRole: 'MEMBER',
    roleId: '',
    departmentId: '',
    teamId: '',
    designationId: '',
    designationTitle: '',
    reportsToId: '',
    dataScope: 'ASSIGNED',
  });

  // =========================================================================
  // SMART ROLE & SCOPE TEMPLATES BY DESIGNATION (AUTO-MAPPING)
  // =========================================================================
  const SMART_DESIGNATION_TEMPLATES = [
    {
      keywords: ['ceo', 'founder', 'co-founder', 'president', 'chief executive', 'owner'],
      role: 'OWNER',
      scope: 'WORKSPACE',
      deptKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      teamKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      label: 'Executive Leadership',
      description: 'Full organization-wide administrative ownership and global visibility across all records.',
    },
    {
      keywords: ['director', 'vp', 'vice president', 'head of', 'general manager', 'coo', 'cto', 'cfo', 'cpo'],
      role: 'MANAGER',
      scope: 'WORKSPACE',
      deptKeywords: ['management', 'executive', 'operations'],
      teamKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      label: 'Senior Leadership',
      description: 'Cross-functional leadership with enterprise-wide data access and operations management.',
    },
    {
      keywords: ['operations manager', 'department manager', 'branch manager', 'delivery manager', 'program manager'],
      role: 'MANAGER',
      scope: 'DEPARTMENT',
      deptKeywords: ['operations', 'general'],
      teamKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      label: 'Department Management',
      description: 'Departmental oversight, approvals, and cross-team workflow orchestration.',
    },
    {
      keywords: ['hr', 'human resources', 'recruiter', 'people ops', 'talent', 'talent acquisition'],
      role: 'ADMIN',
      scope: 'DEPARTMENT',
      deptKeywords: ['hr', 'human', 'people'],
      teamKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      label: 'HR & People Operations',
      description: 'Organization administration, employee records, onboarding, and leave approvals.',
    },
    {
      keywords: ['tech lead', 'team lead', 'lead engineer', 'engineering lead', 'scrum master', 'lead developer', 'principal engineer', 'architect'],
      role: 'MANAGER',
      scope: 'TEAM',
      deptKeywords: ['tech', 'engineering', 'development', 'software', 'it'],
      teamKeywords: ['lead', 'core', 'engineering'],
      label: 'Technical Team Lead',
      description: 'Supervises squad work items, sprint tracking, and task delegation.',
    },
    {
      keywords: ['software engineer', 'developer', 'frontend', 'backend', 'fullstack', 'ios', 'android', 'mobile engineer', 'web developer', 'programmer'],
      role: 'MEMBER',
      scope: 'TEAM',
      deptKeywords: ['tech', 'engineering', 'development', 'software', 'it'],
      teamKeywords: ['frontend', 'backend', 'mobile', 'web', 'dev'],
      label: 'Software Engineering',
      description: 'Collaborates on sprint deliverables and team work items.',
    },
    {
      keywords: ['qa', 'quality', 'tester', 'test engineer', 'qa auditor', 'automation engineer', 'qc'],
      role: 'MEMBER',
      scope: 'TEAM',
      deptKeywords: ['tech', 'engineering', 'quality', 'qa'],
      teamKeywords: ['qa', 'testing', 'quality'],
      label: 'Quality Assurance',
      description: 'Access to team work items for testing, defect tracking, and verification.',
    },
    {
      keywords: ['product manager', 'product owner', 'associate product manager', 'pm'],
      role: 'MANAGER',
      scope: 'TEAM',
      deptKeywords: ['product', 'tech', 'engineering'],
      teamKeywords: ['product'],
      label: 'Product Management',
      description: 'Defines requirements, manages backlogs, and tracks feature milestones.',
    },
    {
      keywords: ['designer', 'ui', 'ux', 'product designer', 'graphic designer', 'visual designer', 'creative'],
      role: 'MEMBER',
      scope: 'TEAM',
      deptKeywords: ['design', 'product', 'creative'],
      teamKeywords: ['design', 'ui'],
      label: 'Product Design',
      description: 'Collaborates on design deliverables, assets, and design system tasks.',
    },
    {
      keywords: ['marketing', 'sales', 'growth', 'social media', 'content', 'copywriter', 'seo', 'account executive', 'bdr', 'sdr'],
      role: 'MEMBER',
      scope: 'TEAM',
      deptKeywords: ['marketing', 'sales', 'growth', 'commercial'],
      teamKeywords: ['marketing', 'sales'],
      label: 'Marketing & Sales',
      description: 'Collaborates on campaigns, outbound deals, and promotional tasks.',
    },
    {
      keywords: ['finance', 'accountant', 'accounts', 'billing', 'payroll', 'controller', 'auditor'],
      role: 'MEMBER',
      scope: 'DEPARTMENT',
      deptKeywords: ['finance', 'accounts', 'billing'],
      teamKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      label: 'Finance & Compliance',
      description: 'Access to departmental financial records, billing, and accounting items.',
    },
    {
      keywords: ['contractor', 'freelancer', 'consultant', 'intern', 'temporary', 'vendor', 'trainee'],
      role: 'MEMBER',
      scope: 'ASSIGNED',
      deptKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      teamKeywords: [] as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[],
      label: 'External Contributor / Intern',
      description: 'Strictly restricted to explicitly assigned tasks with zero access to peer data.',
    },
  ];

  const QUICK_DESIGNATION_PRESETS = [
    'Software Engineer',
    'Tech Lead',
    'QA Auditor',
    'Product Manager',
    'HR Executive',
    'Operations Manager',
    'Contractor / Freelancer',
  ];

  const [matchedTemplate, setMatchedTemplate] = useState<{
    label: string;
    description: string;
    role: string;
    scope: string;
  } | null>(null);

  const handleDesignationChange = (title: string) => {
    const cleanTitle = title.trim().toLowerCase();

    // Find matching template
    const template = SMART_DESIGNATION_TEMPLATES.find((tpl) =>
      tpl.keywords.some((kw) => cleanTitle.includes(kw))
    );

    if (template) {
      // Find matching department if possible
      let matchedDeptId = inviteForm.departmentId;
      if (template.deptKeywords && template.deptKeywords.length > 0) {
        const foundDept = departments.find((rawD) => {
          const d = rawD.data !== undefined ? rawD.data : rawD;
          const dName = (d.name || '').toLowerCase();
          return template.deptKeywords.some((dk) => dName.includes(dk));
        });
        if (foundDept) {
          const dObj = foundDept.data !== undefined ? foundDept.data : foundDept;
          matchedDeptId = dObj.id;
        }
      }

      // Find matching team if possible
      let matchedTeamId = inviteForm.teamId;
      if (template.teamKeywords && template.teamKeywords.length > 0) {
        const foundTeam = teams.find((rawT) => {
          const t = rawT.data !== undefined ? rawT.data : rawT;
          const tName = (t.name || '').toLowerCase();
          return template.teamKeywords.some((tk) => tName.includes(tk));
        });
        if (foundTeam) {
          const tObj = foundTeam.data !== undefined ? foundTeam.data : foundTeam;
          matchedTeamId = tObj.id;
        }
      }

      setMatchedTemplate({
        label: template.label,
        description: template.description,
        role: template.role,
        scope: template.scope,
      });

      setInviteForm((prev) => ({
        ...prev,
        designationTitle: title,
        accessRole: template.role,
        dataScope: template.scope,
        departmentId: matchedDeptId,
        teamId: matchedTeamId,
      }));
    } else {
      setMatchedTemplate(null);
      setInviteForm((prev) => ({
        ...prev,
        designationTitle: title,
      }));
    }
  };

  const getHeaders = () => {
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const activeWsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: activeToken ? `Bearer ${activeToken}` : '',
      ...(activeWsId && activeWsId !== 'undefined' && activeWsId !== 'null' ? { 'x-workspace-id': activeWsId } : {}),
    };
  };

  const headers = getHeaders();

  const normalizeInviteLink = (linkOrToken: string) => {
    if (!linkOrToken) return '';
    if (typeof window !== 'undefined') {
      try {
        if (linkOrToken.startsWith('http')) {
          const url = new URL(linkOrToken);
          return `${window.location.origin}${url.pathname}${url.search}`;
        }
        return `${window.location.origin}/accept-invitation?token=${linkOrToken}`;
      } catch {
        return `${window.location.origin}/accept-invitation?token=${linkOrToken}`;
      }
    }
    return linkOrToken;
  };

  const copyInviteLink = (linkOrToken: string) => {
    const fullUrl = normalizeInviteLink(linkOrToken);
    navigator.clipboard.writeText(fullUrl).then(
      () => toast.success('Invitation link copied to clipboard!'),
      () => toast.info('Link: ' + fullUrl),
    );
  };

  const loadData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!token || !wsId) return;
    try {
      const activeHeaders = getHeaders();
      const [memRes, invRes, deptRes, desigRes, teamRes, roleRes, meRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/people`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/people/invitations`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/departments`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/designations`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/teams`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/roles`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers: activeHeaders }),
      ]);

      const rawMem = await memRes.json();
      const rawInv = await invRes.json();
      const rawDept = await deptRes.json();
      const rawDesig = await desigRes.json();
      const rawTeam = await teamRes.json();
      const rawRole = await roleRes.json();
      const rawMe = await meRes.json();

      const memData = rawMem.data !== undefined ? rawMem.data : rawMem;
      const invData = rawInv.data !== undefined ? rawInv.data : rawInv;
      const deptData = rawDept.data !== undefined ? rawDept.data : rawDept;
      const desigData = rawDesig.data !== undefined ? rawDesig.data : rawDesig;
      const teamData = rawTeam.data !== undefined ? rawTeam.data : rawTeam;
      const roleData = rawRole.data !== undefined ? rawRole.data : rawRole;

      const rawMemList = Array.isArray(memData) ? memData : [];
      rawMemList.sort((a: any, b: any) => {
        if (a.accessRole === 'OWNER' && b.accessRole !== 'OWNER') return -1;
        if (a.accessRole !== 'OWNER' && b.accessRole === 'OWNER') return 1;
        return 0;
      });
      setMembers(rawMemList);
      setInvitations(Array.isArray(invData) ? invData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setDesignations(Array.isArray(desigData) ? desigData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);

      const meData = rawMe.data !== undefined ? rawMe.data : rawMe;
      if (meData) {
        if (meData.id) setCurrentUserId(meData.id);
        if (meData.email) setCurrentUserEmail(meData.email.toLowerCase().trim());
        if (meData.memberships) {
          const currentMem = meData.memberships.find((m: any) => m.workspaceId === wsId);
          if (currentMem) {
            setCurrentUserRole(currentMem.accessRole);
            if (currentMem.id) setCurrentMemberId(currentMem.id);
            if (currentMem.userId) setCurrentUserId(currentMem.userId);
          }
        }
      }
      const activeMembersList = Array.isArray(memData) ? memData : [];
      if (meData?.id || meData?.email) {
        const myEmail = (meData.email || '').toLowerCase().trim();
        const myId = meData.id;
        const matchingMem = activeMembersList.find(
          (m: any) =>
            (m.userId && m.userId === myId) ||
            (m.user?.id && m.user.id === myId) ||
            (m.user?.email && m.user.email.toLowerCase().trim() === myEmail) ||
            (m.email && m.email.toLowerCase().trim() === myEmail)
        );
        if (matchingMem) {
          if (matchingMem.id) setCurrentMemberId(matchingMem.id);
          if (matchingMem.accessRole) setCurrentUserRole(matchingMem.accessRole);
        }
      }
    } catch (err: any) {
      console.error('Error loading people data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to open a specific member profile by ID or email
  const openMemberById = (idOrEmail: string, memberList = members) => {
    if (!idOrEmail || memberList.length === 0) return;
    const cleanTarget = idOrEmail.toLowerCase().trim();
    const target = memberList.find(
      (m: any) =>
        (m.id && m.id.toLowerCase() === cleanTarget) ||
        (m.userId && m.userId.toLowerCase() === cleanTarget) ||
        (m.user?.id && m.user.id.toLowerCase() === cleanTarget) ||
        (m.employeeId && m.employeeId.toLowerCase() === cleanTarget) ||
        (m.user?.email && m.user.email.toLowerCase() === cleanTarget) ||
        (m.email && m.email.toLowerCase() === cleanTarget)
    );

    if (target) {
      if (target.accessRole === 'OWNER') {
        const ownerCard = document.getElementById('workspace-owner-card');
        if (ownerCard) {
          ownerCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        handleOpenEmployeeProfile(target);
      }
    }
  };

  // Sync with searchParams / URL query parameter (?memberId=... or ?id=...)
  useEffect(() => {
    let memberIdParam = searchParams?.get('memberId') || searchParams?.get('id');
    if (!memberIdParam && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      memberIdParam = urlParams.get('memberId') || urlParams.get('id');
    }
    if (memberIdParam && members.length > 0) {
      openMemberById(memberIdParam, members);
    }
  }, [searchParams, members]);

  // Listen to custom navigation events from CommonSearchBar when already on /app/people
  useEffect(() => {
    const handleNav = (e: any) => {
      const href = e.detail?.href || '';
      if (href.includes('/app/people')) {
        try {
          const urlObj = new URL(href, window.location.origin);
          const idParam = urlObj.searchParams.get('memberId') || urlObj.searchParams.get('id');
          if (idParam && members.length > 0) {
            openMemberById(idParam, members);
          }
        } catch {}
      }
    };

    window.addEventListener('orvexa-navigate', handleNav);
    return () => window.removeEventListener('orvexa-navigate', handleNav);
  }, [members]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invitation failed');

      const payload = data.data || data;
      const rawLink =
        payload.inviteLink ||
        (payload.invitation?.token
          ? `${window.location.origin}/accept-invitation?token=${payload.invitation.token}`
          : null);
      const generatedLink = normalizeInviteLink(rawLink);

      if (generatedLink) {
        setCreatedInviteInfo({
          email: inviteForm.email,
          link: generatedLink,
          emailDelivered: payload.emailDelivered,
          senderName: payload.senderName,
          senderEmail: payload.senderEmail,
        });
        navigator.clipboard.writeText(generatedLink).catch(() => {});
        toast.success(
          payload.emailDelivered
            ? `Invitation email delivered to ${inviteForm.email}!`
            : 'Invitation link generated and copied to clipboard!',
        );
      } else {
        toast.success('Invitation sent successfully!');
      }

      setShowInviteModal(false);
      setMatchedTemplate(null);
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        accessRole: 'MEMBER',
        roleId: '',
        departmentId: '',
        teamId: '',
        designationId: '',
        designationTitle: '',
        reportsToId: '',
        dataScope: 'ASSIGNED',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Invitation failed');
    }
  };

  const handleResendInvite = async (invId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/invitations/${invId}/resend`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Resend failed');

      const payload = data.data || data;
      const rawLink = payload.inviteLink || payload.invitation?.token;
      const link = normalizeInviteLink(rawLink);
      if (link) {
        setCreatedInviteInfo({
          email: payload.invitation?.email || 'user',
          link,
          emailDelivered: payload.emailDelivered,
          senderName: payload.senderName,
          senderEmail: payload.senderEmail,
        });
        navigator.clipboard.writeText(link).catch(() => {});
        toast.success(
          payload.emailDelivered
            ? `Invitation email resent to ${payload.invitation?.email || 'user'}!`
            : 'Fresh invitation link regenerated and copied to clipboard!',
        );
      } else {
        toast.success('Invitation link refreshed');
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/invitations/${invId}/revoke`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Invitation revoked');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSuspendMember = async (membershipId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/${membershipId}/suspend`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Member access suspended');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReactivateMember = async (membershipId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/${membershipId}/reactivate`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Member access reactivated');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/${membershipId}/remove`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Member removed from workspace');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleInitiateOffboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offboardMember) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/${offboardMember.id}/offboard/initiate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lastWorkingDate, exitReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Now complete offboarding
      const completeRes = await fetch(`${BRANDING.apiUrl}/people/${offboardMember.id}/offboard/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reassignToMembershipId: reassignToId || undefined }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.message);

      toast.success('Employee offboarded successfully. Access revoked & assets recovered.');
      setShowOffboardModal(false);
      setOffboardMember(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerId) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/transfer-ownership`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newOwnerMembershipId: newOwnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Workspace ownership transferred successfully');
      setShowTransferModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenEditModal = (m: any) => {
    if (!canEditMember(m)) {
      if (m?.accessRole === 'OWNER') {
        toast.error('The workspace owner profile is protected and can only be modified by the owner.');
      } else {
        toast.error('You only have permission to edit your own details. HR (Admin) or Owner access is required to edit other members.');
      }
      return;
    }
    setEditingMember(m);
    if (!isCurrentUserOwnerOrAdmin && editModalTab === 'org') {
      setEditModalTab('personal');
    }
    const extra = getMemberExtraData(m);
    const bank = extra.bankDetails || {};
    const idDocs = extra.identityDocs || {};
    const personal = extra.personal || {};

    setEditForm({
      firstName: m.user?.firstName || '',
      lastName: m.user?.lastName || '',
      email: m.user?.email || '',
      phone: m.user?.phone || extra.phone || '',
      accessRole: m.accessRole || 'MEMBER',
      roleId: m.roleId || m.role?.id || '',
      departmentId: m.departmentId || m.department?.id || '',
      teamId: m.teamId || m.team?.id || '',
      designationId: m.designationId || m.designation?.id || '',
      designationTitle: m.designation?.title || '',
      dataScope: m.dataScope || 'ASSIGNED',

      // Personal Details
      dateOfBirth: personal.dateOfBirth || extra.dateOfBirth || '',
      gender: personal.gender || extra.gender || 'male',
      address: personal.address || extra.address || '',
      district: personal.district || extra.district || '',
      statePostcode: personal.statePostcode || extra.statePostcode || '',
      emergencyName: extra.emergencyName || (typeof extra.name === 'string' ? extra.name : '') || '',
      emergencyPhone: extra.emergencyPhone || (typeof extra.phone === 'string' ? extra.phone : '') || '',
      emergencyRelationship: extra.emergencyRelationship || (typeof extra.relationship === 'string' ? extra.relationship : '') || '',

      // Bank Account Details
      bankName: bank.bankName || extra.bankName || '',
      branchName: bank.branchName || extra.branchName || '',
      accountHolder: bank.accountHolder || extra.accountHolder || `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim(),
      accountNumber: bank.accountNumber || extra.accountNumber || '',
      ifscCode: bank.ifscCode || extra.ifscCode || '',

      // Identity & Verification (Aadhaar & PAN)
      aadhaarNumber: idDocs.aadhaarNumber || extra.aadhaarNumber || '',
      panNumber: idDocs.panNumber || extra.panNumber || '',
      docApprovedId: Boolean(idDocs.docApprovedId ?? extra.docApprovedId),
      docPanCard: Boolean(idDocs.docPanCard ?? extra.docPanCard),
      docPassportPhoto: Boolean(idDocs.docPassportPhoto ?? extra.docPassportPhoto),
    });
    setShowEditModal(true);
  };

  const handleSaveMemberOrgDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!canEditMember(editingMember)) {
      toast.error('Permission denied. You can only edit your own details.');
      return;
    }
    setUpdatingMember(true);

    const extraData = {
      phone: editForm.phone.trim(),
      emergencyName: editForm.emergencyName.trim(),
      emergencyPhone: editForm.emergencyPhone.trim(),
      emergencyRelationship: editForm.emergencyRelationship.trim(),
      personal: {
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender,
        address: editForm.address.trim(),
        district: editForm.district.trim(),
        statePostcode: editForm.statePostcode.trim(),
      },
      bankDetails: {
        bankName: editForm.bankName.trim(),
        branchName: editForm.branchName.trim(),
        accountHolder: editForm.accountHolder.trim(),
        accountNumber: editForm.accountNumber.trim(),
        ifscCode: editForm.ifscCode.trim().toUpperCase(),
      },
      identityDocs: {
        aadhaarNumber: editForm.aadhaarNumber.trim(),
        panNumber: editForm.panNumber.trim().toUpperCase(),
        docApprovedId: editForm.docApprovedId,
        docPanCard: editForm.docPanCard,
        docPassportPhoto: editForm.docPassportPhoto,
      },
    };

    // 1. Immediately cache locally for offline/instant persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`orvexa_member_extra_${editingMember.id}`, JSON.stringify(extraData));
      } catch {}
    }

    try {
      // 2. Save org & role details via API (only authorized for Owner and HR/Admin)
      if (isCurrentUserOwnerOrAdmin) {
        await fetch(`${BRANDING.apiUrl}/people/${editingMember.id}/org-details`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            firstName: editForm.firstName.trim(),
            lastName: editForm.lastName.trim(),
            email: editForm.email.trim(),
            accessRole: editForm.accessRole,
            roleId: editForm.roleId || undefined,
            departmentId: editForm.departmentId || null,
            teamId: editForm.teamId || null,
            designationId: editForm.designationId || null,
            designationTitle: editForm.designationTitle || undefined,
            dataScope: editForm.dataScope,
          }),
        }).catch(() => null);
      }

      // 3. Save profile & personal details via API
      await fetch(`${BRANDING.apiUrl}/people/${editingMember.id}/profile`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          emergencyContact: extraData,
        }),
      }).catch(() => null);

      toast.success(`Updated details for ${editForm.firstName || editingMember.user?.firstName || 'member'}`);
      setShowEditModal(false);

      // 4. Update in local component state immediately
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id !== editingMember.id) return m;
          return {
            ...m,
            emergencyContact: extraData,
            user: {
              ...m.user,
              firstName: editForm.firstName.trim() || m.user?.firstName,
              lastName: editForm.lastName.trim() || m.user?.lastName,
              email: editForm.email.trim() || m.user?.email,
              phone: editForm.phone.trim() || m.user?.phone,
            },
            accessRole: editForm.accessRole,
            designation: designations.find((d: any) => d.id === editForm.designationId) || { title: editForm.designationTitle || m.designation?.title || 'Unassigned' },
            department: departments.find((d: any) => d.id === editForm.departmentId) || m.department,
            team: teams.find((t: any) => t.id === editForm.teamId) || m.team,
          };
        }),
      );

      if (selectedMember && selectedMember.id === editingMember.id) {
        setSelectedMember((prev: any) => ({
          ...prev,
          emergencyContact: extraData,
          user: {
            ...prev?.user,
            firstName: editForm.firstName.trim() || prev?.user?.firstName,
            lastName: editForm.lastName.trim() || prev?.user?.lastName,
            email: editForm.email.trim() || prev?.user?.email,
            phone: editForm.phone.trim() || prev?.user?.phone,
          },
          accessRole: editForm.accessRole,
          designation: designations.find((d: any) => d.id === editForm.designationId) || { title: editForm.designationTitle || prev?.designation?.title || 'Unassigned' },
          department: departments.find((d: any) => d.id === editForm.departmentId) || prev?.department,
          team: teams.find((t: any) => t.id === editForm.teamId) || prev?.team,
        }));
      }
      if (viewingEmployee && viewingEmployee.id === editingMember.id) {
        setViewingEmployee((prev: any) => ({
          ...prev,
          emergencyContact: extraData,
          user: {
            ...prev?.user,
            firstName: editForm.firstName.trim() || prev?.user?.firstName,
            lastName: editForm.lastName.trim() || prev?.user?.lastName,
            email: editForm.email.trim() || prev?.user?.email,
            phone: editForm.phone.trim() || prev?.user?.phone,
          },
          accessRole: editForm.accessRole,
          designation: designations.find((d: any) => d.id === editForm.designationId) || { title: editForm.designationTitle || prev?.designation?.title || 'Unassigned' },
          department: departments.find((d: any) => d.id === editForm.departmentId) || prev?.department,
          team: teams.find((t: any) => t.id === editForm.teamId) || prev?.team,
        }));
      }

      setEditingMember(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member details');
    } finally {
      setUpdatingMember(false);
    }
  };

  const ownerMember = members.find((m) => m.accessRole === 'OWNER');

  const filteredMembers = members.filter((m) => {
    // Dedicated Workspace Ownership header card handles the Owner
    if (m.accessRole === 'OWNER') return false;
    const fullName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    const email = (m.user?.email || m.email || '').toLowerCase();
    const designation = (m.designation?.title || '').toLowerCase();
    const deptName = (m.department?.name || '').toLowerCase();
    const teamName = (m.team?.name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !searchLower ||
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      designation.includes(searchLower) ||
      deptName.includes(searchLower) ||
      teamName.includes(searchLower);

    const matchesDept = filterDept ? (m.departmentId === filterDept || m.department?.name === filterDept) : true;
    const matchesDesignation = filterDesignation ? (m.designationId === filterDesignation || m.designation?.title === filterDesignation) : true;
    const matchesTeam = filterTeam ? (m.teamId === filterTeam || m.team?.name === filterTeam) : true;
    const matchesRole = filterRole ? m.accessRole === filterRole : true;

    return matchesSearch && matchesDept && matchesDesignation && matchesTeam && matchesRole;
  }).sort((a, b) => {
    if (a.accessRole === 'OWNER' && b.accessRole !== 'OWNER') return -1;
    if (a.accessRole !== 'OWNER' && b.accessRole === 'OWNER') return 1;
    return 0;
  });

  const renderMemberFullRecord = (member: any) => {
    return (
      <div className="pt-6 border-t border-border/60 space-y-4">
        <div className="flex items-center gap-2 pb-1">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Employee Record & Details</h3>
        </div>
              {/* Profile Completeness Bar & Actionable Incomplete Reminder (Phase 10 Requirement 2) */}
              {(() => {
                const extra = getMemberExtraData(member);
                const hasPhone = Boolean(member.user?.phone || extra.phone);
                const hasEmpId = Boolean(member.employeeId);
                const hasBank = Boolean(extra.bankDetails?.accountNumber);
                const hasAadhaar = Boolean(extra.identityDocs?.aadhaarNumber || extra.identityDocs?.panNumber);
                const isComplete = hasPhone && hasEmpId && hasBank && hasAadhaar;
                const score = [hasPhone, hasEmpId, hasBank, hasAadhaar].filter(Boolean).length * 25;

                return (
                  <div className="mt-3 p-2.5 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">Profile Completion</span>
                        <Badge variant={isComplete ? 'default' : 'secondary'} className="text-[10px]">
                          {isComplete ? '100% Complete' : `${score}% Completed`}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        {!isComplete
                          ? `Missing: ${[!hasPhone && 'Phone', !hasBank && 'Bank Details', !hasAadhaar && 'Aadhaar / PAN ID'].filter(Boolean).join(', ')}`
                          : 'All standard profile fields completed.'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      onClick={async () => {
                        try {
                          const res = await fetch(`${BRANDING.apiUrl}/people/${member.id}/reminder`, {
                            method: 'POST',
                            headers: getHeaders(),
                          });
                          const data = await res.json();
                          toast.success(data.message || 'Profile reminder sent to employee');
                        } catch (e: any) {
                          toast.error('Failed to send reminder');
                        }
                      }}
                    >
                      Send Incomplete Reminder
                    </Button>
                  </div>
                );
              })()}

              {/* Profile Sub-tabs */}
              <div className="flex border-b border-border space-x-3 pt-3 text-xs">
                {((['personal', 'employment', ...(isCurrentUserOwnerOrAdmin || isSelfMember(member) ? ['access'] : []), 'assets', 'history', 'offboarding']) as ('personal' | 'employment' | 'access' | 'assets' | 'history' | 'offboarding')[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveProfileTab(tab)}
                    className={`capitalize pb-2 border-b-2 font-semibold transition-colors ${
                      activeProfileTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            <div className="py-3 text-xs space-y-4">
              {/* Protected Workspace Owner Profile Notice */}
              {member.accessRole === 'OWNER' && !isSelfMember(member) && (
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold block text-foreground">Protected Workspace Owner Profile</span>
                    <span>This account holds root workspace ownership. Details are visible for organizational attribution, but administrative edits, sensitive documents, and credentials are locked against external alteration.</span>
                  </div>
                </div>
              )}

              {/* SECTION A: Personal, Banking & Identity */}
              {activeProfileTab === 'personal' && (() => {
                const extra = getMemberExtraData(member);
                const bank = extra.bankDetails || {};
                const idDocs = extra.identityDocs || {};
                const personal = extra.personal || {};
                const showAcc = showMemberSecrets[`${member.id}_acc`];
                const showIfsc = showMemberSecrets[`${member.id}_ifsc`];
                const showAadhaar = showMemberSecrets[`${member.id}_aadhaar`];

                return (
                  <div className="space-y-4">
                    {/* 1. Personal Identity & Contact */}
                    <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-primary" /> Personal Identity & Contact
                        </span>
                        {canEditMember(member) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => {
                              setEditModalTab('personal');
                              handleOpenEditModal(member);
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit Personal Details
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Full Name:</span>
                          <span className="font-semibold text-foreground">{member.user?.firstName} {member.user?.lastName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Work Email:</span>
                          <span className="font-semibold text-foreground">{member.user?.email}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Contact Phone:</span>
                          <span className="font-semibold text-foreground">{member.user?.phone || extra.phone || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Date of Birth:</span>
                          <span className="font-semibold text-foreground">{personal.dateOfBirth || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Gender:</span>
                          <span className="font-semibold text-foreground capitalize">{personal.gender || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">District / Suburb:</span>
                          <span className="font-semibold text-foreground">{personal.district || 'Not provided'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">Residential Address:</span>
                          <span className="font-semibold text-foreground">{personal.address || 'Not provided'}</span>
                          {personal.statePostcode && (
                            <span className="text-muted-foreground block text-[10px] mt-0.5">State & PIN: {personal.statePostcode}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Bank Account Details (Disbursement) */}
                    <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <Landmark className="h-3.5 w-3.5 text-emerald-500" /> Bank Account Details (Salary Disbursement)
                        </span>
                        {canEditMember(member) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => {
                              setEditModalTab('banking');
                              handleOpenEditModal(member);
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit Bank Details
                          </Button>
                        )}
                      </div>
                      {member.accessRole === 'OWNER' && !isSelfMember(member) ? (
                        <div className="p-3 rounded-md bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Owner banking and disbursement details are private and encrypted.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Bank Name:</span>
                          <span className="font-semibold text-foreground">{bank.bankName || 'Not configured'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Branch:</span>
                          <span className="font-semibold text-foreground">{bank.branchName || 'Main Branch'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">Account Holder Name:</span>
                          <span className="font-semibold text-foreground">{bank.accountHolder || `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Account Number:</span>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                            <span>
                              {bank.accountNumber
                                ? (showAcc ? bank.accountNumber : `••••••••${bank.accountNumber.slice(-4)}`)
                                : 'Not provided'}
                            </span>
                            {bank.accountNumber && (
                              <button
                                type="button"
                                onClick={() => toggleMemberSecret(`${member.id}_acc`)}
                                className="text-muted-foreground hover:text-foreground p-0.5"
                                title={showAcc ? "Hide Account Number" : "Show Account Number"}
                              >
                                {showAcc ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">IFSC Code:</span>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground uppercase">
                            <span>
                              {bank.ifscCode
                                ? (showIfsc ? bank.ifscCode : `••••••${bank.ifscCode.slice(-4)}`)
                                : 'Not provided'}
                            </span>
                            {bank.ifscCode && (
                              <button
                                type="button"
                                onClick={() => toggleMemberSecret(`${member.id}_ifsc`)}
                                className="text-muted-foreground hover:text-foreground p-0.5"
                                title={showIfsc ? "Hide IFSC Code" : "Show IFSC Code"}
                              >
                                {showIfsc ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                    {/* 3. Government IDs & Statutory Verification */}
                    <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Identity Proofs (Aadhaar & PAN)
                        </span>
                        {canEditMember(member) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => {
                              setEditModalTab('identity');
                              handleOpenEditModal(member);
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit ID Details
                          </Button>
                        )}
                      </div>
                      {member.accessRole === 'OWNER' && !isSelfMember(member) ? (
                        <div className="p-3 rounded-md bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Personal statutory identity documents are restricted to root authority.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Aadhaar Number:</span>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                            <span>
                              {idDocs.aadhaarNumber
                                ? (showAadhaar ? idDocs.aadhaarNumber : `•••• •••• ${idDocs.aadhaarNumber.slice(-4)}`)
                                : 'Not submitted'}
                            </span>
                            {idDocs.aadhaarNumber && (
                              <button
                                type="button"
                                onClick={() => toggleMemberSecret(`${member.id}_aadhaar`)}
                                className="text-muted-foreground hover:text-foreground p-0.5"
                                title={showAadhaar ? "Hide Aadhaar" : "Show Aadhaar"}
                              >
                                {showAadhaar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">PAN Card Number:</span>
                          <span className="font-mono text-xs font-semibold text-foreground uppercase">
                            {idDocs.panNumber || 'Not submitted'}
                          </span>
                        </div>
                        <div className="col-span-2 pt-1 flex flex-wrap gap-2">
                          <Badge variant={idDocs.docApprovedId || idDocs.aadhaarNumber ? 'success' : 'outline'} className="text-[10px]">
                            {idDocs.docApprovedId || idDocs.aadhaarNumber ? '✓ Aadhaar / ID Verified' : 'Aadhaar Pending'}
                          </Badge>
                          <Badge variant={idDocs.docPanCard || idDocs.panNumber ? 'success' : 'outline'} className="text-[10px]">
                            {idDocs.docPanCard || idDocs.panNumber ? '✓ PAN Card Verified' : 'PAN Card Pending'}
                          </Badge>
                          <Badge variant={idDocs.docPassportPhoto ? 'success' : 'outline'} className="text-[10px]">
                            {idDocs.docPassportPhoto ? '✓ Passport Photo Uploaded' : 'Photo Pending'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                    {/* 4. Emergency Contact */}
                    <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                      <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 pb-2 border-b border-border">
                        <Phone className="h-3.5 w-3.5 text-primary" /> Emergency Contact
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Emergency Contact Person:</span>
                          <span className="font-semibold text-foreground">{extra.emergencyName || 'Not configured'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Relationship:</span>
                          <span className="font-semibold text-foreground">{extra.emergencyRelationship || 'Family / Relative'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Emergency Phone:</span>
                          <span className="font-semibold text-foreground">{extra.emergencyPhone || 'Not configured'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SECTION B: Employment */}
              {activeProfileTab === 'employment' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-semibold text-foreground text-xs">Employment & Organizational Assignment</span>
                    {canEditMember(member) && isCurrentUserOwnerOrAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => {
                          setEditModalTab('org');
                          handleOpenEditModal(member);
                        }}
                      >
                        <Pencil className="h-3 w-3" /> Edit Designation & Org Details
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground block">Employee ID:</span>
                      <span className="font-semibold text-foreground">{member.employeeId || 'EMP-' + member.id.slice(0, 6)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Designation:</span>
                      <span className="font-semibold text-foreground">{member.designation?.title || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Department:</span>
                      <span className="font-semibold text-foreground">{member.department?.name || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Team:</span>
                      <span className="font-semibold text-foreground">{member.team?.name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Employment Type:</span>
                      <span className="font-semibold text-foreground">{member.employmentType || 'FULL_TIME'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Work Location:</span>
                      <span className="font-semibold text-foreground">{member.workLocation || 'Headquarters / Remote'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: Access */}
              {activeProfileTab === 'access' && (isCurrentUserOwnerOrAdmin || isSelfMember(member)) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-semibold text-foreground text-xs">System Role & Security Privileges</span>
                    {canEditMember(member) && isCurrentUserOwnerOrAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => {
                          setEditModalTab('org');
                          handleOpenEditModal(member);
                        }}
                      >
                        <Pencil className="h-3 w-3" /> Edit Access Role
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground block">System Access Role:</span>
                      <Badge variant={member.accessRole === 'OWNER' ? 'default' : member.accessRole === 'ADMIN' ? 'warning' : 'secondary'}>
                        {member.accessRole}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Account Status:</span>
                      <Badge variant="success">{member.status}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Data Access Scope:</span>
                      <span className="font-semibold text-foreground">{member.dataScope || 'ASSIGNED'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Last Login:</span>
                      <span className="font-semibold text-foreground">
                        {member.user?.lastLoginAt ? new Date(member.user.lastLoginAt).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>


                </div>
              )}

              {/* SECTION D: Assets */}
              {activeProfileTab === 'assets' && (
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground">Assigned Company Assets</h4>
                  {member.assignedAssets?.length === 0 ? (
                    <p className="text-muted-foreground">No assets currently assigned to this member.</p>
                  ) : (
                    (member.assignedAssets || []).map((asset: any) => (
                      <div key={asset.id} className="p-2 border rounded-md flex justify-between">
                        <span>{asset.name} ({asset.assetTag})</span>
                        <Badge variant="outline">{asset.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION E: History */}
              {activeProfileTab === 'history' && (
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground">Assigned Tasks & Work Items</h4>
                  <div className="space-y-1">
                    {(member.assignedTasks || []).map((t: any) => (
                      <div key={t.id} className="p-2 border rounded-md flex justify-between">
                        <span>{t.title}</span>
                        <Badge variant="secondary">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION F: Offboarding */}
              {activeProfileTab === 'offboarding' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground block">Offboarding Status:</span>
                      <span className="font-semibold text-foreground">{member.offboardingStatus || 'ACTIVE_EMPLOYEE'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Last Working Date:</span>
                      <span className="font-semibold text-foreground">
                        {member.lastWorkingDate ? new Date(member.lastWorkingDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
      </div>
    );
  };
  return (
    <div className="space-y-6">
      {viewingEmployee ? (
        /* Image 2: Profile Details View */
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingEmployee(null)}
              className="gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground pl-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to People Directory
            </Button>
          </div>

          {/* Employee Profile Header Card with Compact Metrics Covering Top Space */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
              <div className="flex items-center gap-4">
                <UserAvatar
                  avatarUrl={viewingEmployee.user?.avatarUrl}
                  firstName={viewingEmployee.user?.firstName}
                  lastName={viewingEmployee.user?.lastName}
                  seed={viewingEmployee.user?.id || viewingEmployee.user?.email}
                  size="lg"
                  className="h-16 w-16 rounded-xl border border-border shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">
                      {viewingEmployee.user?.firstName} {viewingEmployee.user?.lastName}
                    </h2>
                    {viewingEmployee.accessRole === 'OWNER' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified Workspace Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {viewingEmployee.designation?.title || (viewingEmployee.accessRole === 'OWNER' ? 'Founder & CEO' : 'Team Member')} • {viewingEmployee.department?.name || 'Executive Leadership'}
                  </p>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {viewingEmployee.status === 'SUSPENDED' ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact Task Metric Cards covering empty space in top of page */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <div className="px-3.5 py-2.5 rounded-xl border border-border/80 bg-surface-secondary/50 min-w-[95px] shadow-2xs">
                  <div className="text-lg font-bold text-foreground leading-tight">
                    {loadingEmployeeTasks ? '...' : employeeTasks.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Total tasks</div>
                </div>

                <div className="px-3.5 py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 min-w-[95px] shadow-2xs">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                    {loadingEmployeeTasks ? '...' : employeeTasks.filter((t: any) => t.status === 'COMPLETED' || t.status === 'DONE').length}
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">Completed</div>
                </div>

                <div className="px-3.5 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 min-w-[95px] shadow-2xs">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight">
                    {loadingEmployeeTasks ? '...' : employeeTasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'DONE').length}
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">Pending</div>
                </div>
              </div>
            </div>

            {/* Owner Visibility & Protection Notice */}
            {viewingEmployee.accessRole === 'OWNER' && !isSelfMember(viewingEmployee) && (
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block text-foreground">Public Attribution Record (Protected)</span>
                  <span>This profile represents root workspace ownership. Details are visible across the team for organizational hierarchy, but administrative alteration and role modifications are locked.</span>
                </div>
              </div>
            )}

            {/* Collapsible Recent Assigned Tasks Section with Down Arrow */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowAssignedTasks((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border/70 bg-surface-secondary/30 hover:bg-surface-secondary/60 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground">Recent Assigned Tasks</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {employeeTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                  <span>{showAssignedTasks ? 'Hide tasks' : 'Show tasks'}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showAssignedTasks ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {showAssignedTasks && (
                <div className="pt-1">
                  {loadingEmployeeTasks ? (
                    <div className="flex items-center gap-2 py-4 px-3 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading tasks assigned to {viewingEmployee.user?.firstName}...
                    </div>
                  ) : employeeTasks.length === 0 ? (
                    <div className="py-4 px-3 text-xs text-muted-foreground italic rounded-xl border border-border/50 bg-surface-secondary/20">
                      No tasks currently assigned to this team member.
                    </div>
                  ) : (
                    <ul className="space-y-2 p-3 rounded-xl border border-border/60 bg-surface-secondary/20">
                      {employeeTasks.slice(0, 10).map((task: any) => {
                        const isCompleted = task.status === 'COMPLETED' || task.status === 'DONE';
                        const isInProgress =
                          task.status === 'IN_PROGRESS' || task.status === 'PROCESSING' || task.status === 'IN_REVIEW';
                        const label = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending';

                        const badgeClass = isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : isInProgress
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

                        return (
                          <li
                            key={task.id}
                            className="flex items-center justify-between gap-3 text-xs p-2 rounded-lg hover:bg-card/60 transition-colors border-b border-border/30 last:border-b-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground text-sm leading-none">•</span>
                              <span className="font-medium text-foreground truncate">{task.title || task.name}</span>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${badgeClass}`}
                            >
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Full Record Details - Automatically Visible Under Assigned Tasks */}
            {renderMemberFullRecord(viewingEmployee)}
          </div>
        </div>
      ) : (
        /* Image 1: People Directory & Lifecycle Management Table View */
        <>
          {/* Header */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">People Directory & Lifecycle Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage organization members, invitation flows, employee profiles, access revocation, and offboarding.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOrgChartModal(true)}
                className="gap-2 text-xs font-semibold rounded-xl"
              >
                <Network className="h-4 w-4 text-primary" /> View Org Chart <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
              {currentUserRole === 'OWNER' && (
                <Button variant="outline" size="sm" onClick={() => setShowTransferModal(true)} className="text-xs font-semibold rounded-xl">
                  Transfer Ownership
                </Button>
              )}
              {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                <Button onClick={() => setShowInviteModal(true)} size="sm" className="gap-2 text-xs font-semibold rounded-xl">
                  <UserPlus className="h-4 w-4" /> Invite Member
                </Button>
              )}
            </div>
          </div>

          {/* Tabs & Search (Matching Image 1) */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex border-b border-border space-x-4">
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold transition-colors ${
                  activeTab === 'members'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" /> Active Members ({members.length})
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold transition-colors ${
                  activeTab === 'invitations'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="h-4 w-4" /> Pending Invitations ({invitations.filter((i) => i.status === 'PENDING').length})
              </button>
            </div>

            {activeTab === 'members' && (
              <div className="flex items-center gap-2">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="py-1.5 px-2 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="MEMBER">Member</option>
                </select>
              </div>
            )}
          </div>

          {/* TAB 1: Members Directory (Matching Image 1) */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Dedicated Workspace Ownership Header Card (Option 3) */}
              {ownerMember && (
                <div id="workspace-owner-card" className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center justify-between gap-4 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <UserAvatar
                        avatarUrl={ownerMember.user?.avatarUrl}
                        firstName={ownerMember.user?.firstName}
                        lastName={ownerMember.user?.lastName}
                        seed={ownerMember.user?.id || ownerMember.user?.email}
                        size="md"
                        className="h-12 w-12 rounded-full border border-border/80"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-xs border-2 border-background">
                        <ShieldCheck className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="h-10 border-l border-border/70 mx-1 hidden sm:block" />
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        Workspace Managed By:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {ownerMember.user?.firstName} {ownerMember.user?.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          (Primary Owner)
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Root Authority · All Workspaces &amp; Teams
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentUserRole === 'OWNER' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTransferModal(true)}
                        className="text-xs font-semibold rounded-xl border-border hover:bg-muted/60"
                      >
                        Owner Settings
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Access Role</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Department / Team</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const isOwner = m.accessRole === 'OWNER';
                      return (
                      <tr
                        key={m.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOwner) return;
                          handleOpenEmployeeProfile(m);
                        }}
                        className={`transition-colors ${
                          isOwner
                            ? 'bg-primary/[0.02] cursor-default'
                            : 'hover:bg-surface-secondary/40 cursor-pointer group'
                        }`}
                        title={
                          isOwner
                            ? 'Workspace Owner (Root Authority - Protected)'
                            : `Click to view profile & task metrics for ${m.user?.firstName || 'member'}`
                        }
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              avatarUrl={m.user?.avatarUrl}
                              firstName={m.user?.firstName}
                              lastName={m.user?.lastName}
                              seed={m.user?.id || m.user?.email}
                              size="sm"
                            />
                            <div>
                              <div
                                onClick={(e) => {
                                  if (isOwner) {
                                    e.stopPropagation();
                                    return;
                                  }
                                  handleOpenEmployeeProfile(m);
                                }}
                                className={`font-semibold text-foreground ${
                                  isOwner ? 'cursor-default select-none' : 'hover:underline cursor-pointer'
                                }`}
                              >
                                {m.user?.firstName} {m.user?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{m.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {m.accessRole === 'OWNER' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Workspace Owner
                            </span>
                          ) : (
                            <Badge variant={m.accessRole === 'ADMIN' ? 'warning' : 'secondary'}>
                              {m.accessRole}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-foreground">
                          {m.designation?.title || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {m.department?.name || 'General'} {m.team?.name ? `/ ${m.team.name}` : ''}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              m.status === 'ACTIVE'
                                ? 'success'
                                : m.status === 'SUSPENDED'
                                ? 'destructive'
                                : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {m.status}
                          </Badge>
                        </td>

                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
            </div>
      )}

      {/* TAB 2: Invitations */}
      {activeTab === 'invitations' && (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                    <th className="py-3 px-4">Invited Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Invited By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No invitations sent yet.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{inv.firstName} {inv.lastName}</div>
                          <div className="text-xs text-muted-foreground">{inv.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-[10px]">{inv.accessRole}</Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {inv.invitedBy ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              inv.status === 'ACCEPTED'
                                ? 'success'
                                : inv.status === 'PENDING'
                                ? 'warning'
                                : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {inv.status === 'PENDING' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 text-primary border-primary/30 hover:bg-primary/10 gap-1"
                                onClick={() => copyInviteLink(inv.inviteLink || inv.token)}
                              >
                                <Copy className="h-3 w-3" /> Copy Link
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 text-primary"
                                onClick={() => handleResendInvite(inv.id)}
                              >
                                Resend
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 text-destructive"
                                onClick={() => handleRevokeInvite(inv.id)}
                              >
                                Revoke
                              </Button>
                            </>
                          )}
                          {inv.status === 'EXPIRED' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 text-primary border-primary/30 hover:bg-primary/10 gap-1 font-medium"
                                onClick={() => handleResendInvite(inv.id)}
                              >
                                <RotateCcw className="h-3 w-3" /> Regenerate Link
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 text-destructive"
                                onClick={() => handleRevokeInvite(inv.id)}
                              >
                                Revoke
                              </Button>
                            </>
                          )}
                          {inv.status === 'REVOKED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground gap-1"
                              onClick={() => handleResendInvite(inv.id)}
                            >
                              <RotateCcw className="h-3 w-3" /> Re-invite
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Org Chart Modal */}
      {showOrgChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-3xl bg-card border-border shadow-2xl max-h-[85vh] overflow-y-auto">
            <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" /> Organization Hierarchy
                </CardTitle>
                <CardDescription className="text-xs">
                  Reporting structure, leadership, and departmental breakdown.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowOrgChartModal(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Executive Leadership */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Executive Leadership
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members
                    .filter((m) => m.accessRole === 'OWNER' || (m.designation?.title || '').toLowerCase().includes('ceo') || (m.designation?.title || '').toLowerCase().includes('founder') || (m.designation?.title || '').toLowerCase().includes('director'))
                    .sort((a, b) => {
                      if (a.accessRole === 'OWNER' && b.accessRole !== 'OWNER') return -1;
                      if (a.accessRole !== 'OWNER' && b.accessRole === 'OWNER') return 1;
                      return 0;
                    })
                    .map((m) => {
                      const isOwner = m.accessRole === 'OWNER';
                      return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (isOwner) return;
                          setShowOrgChartModal(false);
                          handleOpenEmployeeProfile(m);
                        }}
                        className={`p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3 transition-colors ${
                          isOwner ? 'cursor-default' : 'cursor-pointer hover:border-primary/50'
                        }`}
                      >
                        <UserAvatar
                          avatarUrl={m.user?.avatarUrl}
                          firstName={m.user?.firstName}
                          lastName={m.user?.lastName}
                          seed={m.user?.id || m.user?.email}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate">
                            {m.user?.firstName} {m.user?.lastName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate font-medium">
                            {m.designation?.title || m.accessRole}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Department */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Departments & Teams
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {departments.map((dept) => {
                    const deptMembers = members.filter((m) => m.departmentId === dept.id || m.department?.name === dept.name);
                    return (
                      <div key={dept.id} className="p-3 rounded-xl border border-border bg-surface-secondary/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{dept.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{deptMembers.length}</Badge>
                        </div>
                        <div className="space-y-1">
                          {deptMembers.slice(0, 4).map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setShowOrgChartModal(false);
                                handleOpenEmployeeProfile(m);
                              }}
                              className="text-[11px] text-muted-foreground hover:text-primary cursor-pointer truncate flex items-center gap-1.5"
                            >
                              <span>•</span>
                              <span className="font-medium text-foreground">{m.user?.firstName} {m.user?.lastName}</span>
                              <span className="text-[10px] text-muted-foreground">({m.designation?.title || 'Member'})</span>
                            </div>
                          ))}
                          {deptMembers.length > 4 && (
                            <div className="text-[10px] text-primary font-medium pt-0.5">
                              +{deptMembers.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg bg-card border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-lg">Invite New Workspace Member</CardTitle>
              <CardDescription>
                Assign organization role, department, designation, and initial permission scope.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleInvite}>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground">First Name *</label>
                    <input
                      type="text"
                      required
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      placeholder="Alex"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      placeholder="Morgan"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="alex@company.com"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                  />
                </div>

                {/* 3. Designation with Smart Auto-Mapping */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>Designation (Job Title)</span>
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-medium">
                        Smart Auto-Mapping
                      </span>
                    </label>
                  </div>
                  <input
                    type="text"
                    list="designations-datalist"
                    value={inviteForm.designationTitle}
                    onChange={(e) => handleDesignationChange(e.target.value)}
                    placeholder="e.g. Software Engineer, QA Auditor, Operations Manager..."
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                  />
                  <datalist id="designations-datalist">
                    {designations.map((rawD) => {
                      const d = rawD.data !== undefined ? rawD.data : rawD;
                      return <option key={d.id} value={d.title} />;
                    })}
                  </datalist>

                  {/* Quick Preset Template Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> Suggestions:
                    </span>
                    {QUICK_DESIGNATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleDesignationChange(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          inviteForm.designationTitle.toLowerCase() === preset.toLowerCase()
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smart Template Matched Summary Banner */}
                {matchedTemplate && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Auto-Configured from Template
                      </span>
                      <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary">
                        {matchedTemplate.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {matchedTemplate.description}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-foreground font-medium">
                      <span>Preset Role: <strong className="text-primary">{matchedTemplate.role}</strong></span>
                      <span>•</span>
                      <span>Preset Scope: <strong className="text-primary">{matchedTemplate.scope}</strong></span>
                    </div>
                  </div>
                )}

                {/* 4. Core Access Role & Department */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground">Core Access Role *</label>
                    <select
                      value={inviteForm.accessRole}
                      onChange={(e) => setInviteForm({ ...inviteForm, accessRole: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                    >
                      <option value="MEMBER">Member (Individual contributor)</option>
                      <option value="MANAGER">Manager (Team & operations management)</option>
                      <option value="ADMIN">Admin (Organization administration)</option>
                      <option value="OWNER">Owner (Organization ownership)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Department</label>
                    <select
                      value={inviteForm.departmentId}
                      onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                    >
                      <option value="" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">Select Department</option>
                      {departments.map((rawD) => {
                        const d = rawD.data !== undefined ? rawD.data : rawD;
                        return (
                          <option key={d.id} value={d.id} className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">
                            {d.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* 5. Team & Data Access Scope */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground">Team</label>
                    <select
                      value={inviteForm.teamId}
                      onChange={(e) => setInviteForm({ ...inviteForm, teamId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                    >
                      <option value="" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">Select Team</option>
                      {teams.map((rawT) => {
                        const t = rawT.data !== undefined ? rawT.data : rawT;
                        return (
                          <option key={t.id} value={t.id} className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-900">
                            {t.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Data Access Scope *</label>
                    <select
                      value={inviteForm.dataScope}
                      onChange={(e) => setInviteForm({ ...inviteForm, dataScope: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                    >
                      <option value="ASSIGNED">Assigned Records Only</option>
                      <option value="OWN">Own Records Only</option>
                      <option value="TEAM">Assigned Team Records</option>
                      <option value="DEPARTMENT">Assigned Department Records</option>
                      <option value="WORKSPACE">Entire Workspace Records</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Data Scope Explainer Card */}
                <div className="p-2.5 rounded-lg border border-border bg-surface-secondary/40 text-xs">
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-[11px]">
                      <div className="font-semibold text-foreground">
                        {inviteForm.dataScope === 'ASSIGNED' && 'Assigned Records Scope'}
                        {inviteForm.dataScope === 'OWN' && 'Own Records Scope'}
                        {inviteForm.dataScope === 'TEAM' && 'Team Records Scope'}
                        {inviteForm.dataScope === 'DEPARTMENT' && 'Department Records Scope'}
                        {inviteForm.dataScope === 'WORKSPACE' && 'Entire Workspace Scope'}
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {inviteForm.dataScope === 'ASSIGNED' &&
                          'Can only view, update, and log work on tasks and items specifically assigned to them. All other workspace and colleague records are hidden.'}
                        {inviteForm.dataScope === 'OWN' &&
                          'Can manage records they personally created (e.g. their own shift logs, leave applications, expense claims, and created tasks).'}
                        {inviteForm.dataScope === 'TEAM' &&
                          'Full collaboration across their squad. Can see, edit, and track all work items, sprint tickets, and team availability.'}
                        {inviteForm.dataScope === 'DEPARTMENT' &&
                          'Departmental leadership oversight. Can view all squads in this department, reassign tasks, approve leaves, and review metrics.'}
                        {inviteForm.dataScope === 'WORKSPACE' &&
                          'Global organization-wide visibility across all projects, departments, teams, and member activities.'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowInviteModal(false);
                    setMatchedTemplate(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">Send Invitation</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 2: Member Profile (6 Sections) */}
      {/* MODAL 3: Offboarding Workflow Modal */}
      {showOffboardModal && offboardMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-card border-border shadow-xl">
            <CardHeader>
              <CardTitle className="text-base text-destructive font-bold">
                Initiate Employee Offboarding
              </CardTitle>
              <CardDescription className="text-xs">
                Offboarding {offboardMember.user?.firstName} {offboardMember.user?.lastName}. Work items will be reassigned, assets recovered, and sessions revoked.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleInitiateOffboarding}>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground">Last Working Date *</label>
                  <input
                    type="date"
                    required
                    value={lastWorkingDate}
                    onChange={(e) => setLastWorkingDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Exit Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Resignation / Contract End"
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Reassign Open Work & Tasks To</label>
                  <select
                    value={reassignToId}
                    onChange={(e) => setReassignToId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                  >
                    <option value="">Select Member for Work Handover</option>
                    {members.filter((m) => m.id !== offboardMember.id).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.firstName} {m.user?.lastName} ({m.accessRole})
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowOffboardModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="destructive">
                  Execute Offboarding Workflow
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 4: Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-card border-border shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Transfer Workspace Ownership</CardTitle>
              <CardDescription className="text-xs">
                Select a member to become the new primary Workspace Owner.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleTransferOwnership}>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground">Select New Workspace Owner *</label>
                  <select
                    required
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                  >
                    <option value="">Select Member</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.firstName} {m.user?.lastName} ({m.accessRole})
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Transfer Ownership
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: Edit Member Role & Designation */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <Card className="w-full max-w-4xl bg-card border-border shadow-2xl max-h-[92vh] flex flex-col rounded-xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="pb-3 pt-5 px-6 border-b border-border bg-card shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {editingMember.user?.firstName?.[0] || 'U'}{editingMember.user?.lastName?.[0] || ''}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-primary" /> Edit Member Details & Access
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      {isSelfMember(editingMember)
                        ? 'Update your personal profile, banking details, and statutory identity records.'
                        : `Update personal profile, credentials, and organizational settings for ${editingMember.user?.firstName} ${editingMember.user?.lastName}.`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      editingMember.status === 'ACTIVE'
                        ? 'success'
                        : editingMember.status === 'SUSPENDED'
                        ? 'destructive'
                        : 'outline'
                    }
                    className="text-[11px] font-semibold"
                  >
                    {editingMember.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingMember(null);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleSaveMemberOrgDetails} className="flex flex-col flex-1 overflow-hidden">
              {/* Modal Tabs Header */}
              <div className="flex items-center gap-1 sm:gap-2 px-6 pt-2.5 border-b border-border bg-muted/20 text-xs sm:text-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setEditModalTab('personal')}
                  className={`px-4 py-2.5 font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm ${
                    editModalTab === 'personal'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <User className="h-4 w-4" /> Personal & Contact
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('banking')}
                  className={`px-4 py-2.5 font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm ${
                    editModalTab === 'banking'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Landmark className="h-4 w-4" /> Bank Account
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('identity')}
                  className={`px-4 py-2.5 font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm ${
                    editModalTab === 'identity'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" /> Aadhaar & PAN
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('org')}
                  className={`px-4 py-2.5 font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm ${
                    editModalTab === 'org'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Briefcase className="h-4 w-4" /> Org & Role
                  {!isCurrentUserOwnerOrAdmin && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-muted-foreground/30 text-muted-foreground">View-Only</Badge>
                  )}
                </button>
              </div>

              <CardContent className="space-y-5 p-6 overflow-y-auto flex-1 text-xs sm:text-sm">
                {/* TAB 1: Personal & Contact */}
                {editModalTab === 'personal' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">First Name *</label>
                        <input
                          type="text"
                          required
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          placeholder="First name"
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Last Name</label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          placeholder="Last name"
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Work Email Address *</label>
                        <input
                          type="email"
                          required
                          disabled={!isCurrentUserOwnerOrAdmin}
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="email@company.com"
                          className={`w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all ${
                            !isCurrentUserOwnerOrAdmin ? 'opacity-70 bg-muted/30 cursor-not-allowed' : ''
                          }`}
                        />
                        {!isCurrentUserOwnerOrAdmin && (
                          <span className="text-[11px] text-muted-foreground block">Work email can only be changed by HR / Admin.</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Contact Phone Number</label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Date of Birth</label>
                        <input
                          type="date"
                          value={editForm.dateOfBirth}
                          onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Gender</label>
                        <select
                          value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        >
                          <option value="male">Male (M)</option>
                          <option value="female">Female (F)</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground text-xs">Residential Address</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Flat / House No, Street, Locality"
                        className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">District / Suburb</label>
                        <input
                          type="text"
                          value={editForm.district}
                          onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                          placeholder="e.g. Chennai / Bangalore / Hyderabad"
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">State & Postal PIN</label>
                        <input
                          type="text"
                          value={editForm.statePostcode}
                          onChange={(e) => setEditForm({ ...editForm, statePostcode: e.target.value })}
                          placeholder="e.g. Tamil Nadu, 600001"
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <div className="font-semibold text-foreground text-xs sm:text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" /> Emergency Contact Person
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Contact Person Name</label>
                          <input
                            type="text"
                            value={editForm.emergencyName}
                            onChange={(e) => setEditForm({ ...editForm, emergencyName: e.target.value })}
                            placeholder="Full name"
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Relationship</label>
                          <input
                            type="text"
                            value={editForm.emergencyRelationship}
                            onChange={(e) => setEditForm({ ...editForm, emergencyRelationship: e.target.value })}
                            placeholder="e.g. Spouse / Parent / Sibling"
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Phone Number</label>
                          <input
                            type="text"
                            value={editForm.emergencyPhone}
                            onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                            placeholder="+91..."
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Bank Account Details */}
                {editModalTab === 'banking' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-2.5">
                      <Landmark className="h-5 w-5 shrink-0" />
                      <span>Direct salary disbursement bank account. Information is encrypted and confidential.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Bank Name</label>
                        <input
                          type="text"
                          value={editForm.bankName}
                          onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                          placeholder="e.g. HDFC Bank / State Bank of India / ICICI Bank"
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Branch Name</label>
                        <input
                          type="text"
                          value={editForm.branchName}
                          onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                          placeholder="e.g. Anna Nagar Branch / Indiranagar Branch"
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground text-xs">Account Holder Name</label>
                      <input
                        type="text"
                        value={editForm.accountHolder}
                        onChange={(e) => setEditForm({ ...editForm, accountHolder: e.target.value })}
                        placeholder="Account holder name exactly as printed in bank passbook"
                        className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Bank Account Number</label>
                        <div className="relative">
                          <input
                            type={showMemberSecrets['edit_acc'] ? 'text' : 'password'}
                            value={editForm.accountNumber}
                            onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                            placeholder="Enter complete account number"
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2 pr-10 text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => toggleMemberSecret('edit_acc')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            title={showMemberSecrets['edit_acc'] ? "Hide Account" : "Show Account"}
                          >
                            {showMemberSecrets['edit_acc'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">IFSC Code (11 alphanumeric characters)</label>
                        <div className="relative">
                          <input
                            type={showMemberSecrets['edit_ifsc'] ? 'text' : 'password'}
                            value={editForm.ifscCode}
                            onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value.toUpperCase() })}
                            placeholder="e.g. HDFC0001234"
                            maxLength={11}
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2 pr-10 text-sm font-mono uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => toggleMemberSecret('edit_ifsc')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            title={showMemberSecrets['edit_ifsc'] ? "Hide IFSC" : "Show IFSC"}
                          >
                            {showMemberSecrets['edit_ifsc'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Identity Details (Aadhaar & PAN) */}
                {editModalTab === 'identity' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs sm:text-sm flex items-center gap-2.5">
                      <ShieldCheck className="h-5 w-5 shrink-0" />
                      <span>Statutory compliance identity documents for payroll, tax deduction, and regulatory verification.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Aadhaar Card Number (12 Digits)</label>
                        <div className="relative">
                          <input
                            type={showMemberSecrets['edit_aadhaar'] ? 'text' : 'password'}
                            value={editForm.aadhaarNumber}
                            onChange={(e) => setEditForm({ ...editForm, aadhaarNumber: e.target.value })}
                            placeholder="12-digit Aadhaar number"
                            maxLength={14}
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2 pr-10 text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => toggleMemberSecret('edit_aadhaar')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            title={showMemberSecrets['edit_aadhaar'] ? "Hide Aadhaar" : "Show Aadhaar"}
                          >
                            {showMemberSecrets['edit_aadhaar'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground text-xs">Permanent Account Number (PAN Card)</label>
                        <input
                          type="text"
                          value={editForm.panNumber}
                          onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value.toUpperCase() })}
                          placeholder="e.g. ABCDE1234F"
                          maxLength={10}
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <label className="font-semibold text-foreground text-xs sm:text-sm block">Statutory Document Verification Status</label>
                      <div className="space-y-2.5">
                        <label className={`flex items-center gap-3 ${!isCurrentUserOwnerOrAdmin ? 'cursor-default' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={!isCurrentUserOwnerOrAdmin}
                            checked={editForm.docApprovedId}
                            onChange={(e) => setEditForm({ ...editForm, docApprovedId: e.target.checked })}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-foreground text-xs sm:text-sm">Government Approved ID Proof (Aadhaar / Passport) Submitted & Verified</span>
                        </label>
                        <label className={`flex items-center gap-3 ${!isCurrentUserOwnerOrAdmin ? 'cursor-default' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={!isCurrentUserOwnerOrAdmin}
                            checked={editForm.docPanCard}
                            onChange={(e) => setEditForm({ ...editForm, docPanCard: e.target.checked })}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-foreground text-xs sm:text-sm">PAN Card Verified with Income Tax Department</span>
                        </label>
                        <label className={`flex items-center gap-3 ${!isCurrentUserOwnerOrAdmin ? 'cursor-default' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={!isCurrentUserOwnerOrAdmin}
                            checked={editForm.docPassportPhoto}
                            onChange={(e) => setEditForm({ ...editForm, docPassportPhoto: e.target.checked })}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-foreground text-xs sm:text-sm">Official Passport-size Color Photograph Attached</span>
                        </label>
                      </div>
                      {!isCurrentUserOwnerOrAdmin && (
                        <span className="text-[11px] text-muted-foreground block pt-1">
                          Document verification status is managed and validated by HR (Admin).
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: Organization & Role Placement */}
                {editModalTab === 'org' && (
                  <div className="space-y-4">
                    {!isCurrentUserOwnerOrAdmin ? (
                      <div className="space-y-4">
                        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs sm:text-sm flex items-center gap-2.5">
                          <Shield className="h-5 w-5 shrink-0" />
                          <span>View-Only Mode: System access roles and organizational placements can only be modified by HR (Admin) or the Workspace Owner.</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
                            <span className="text-xs text-muted-foreground block">System Access Role:</span>
                            <Badge variant={editingMember.accessRole === 'OWNER' ? 'default' : editingMember.accessRole === 'ADMIN' ? 'warning' : 'secondary'} className="mt-1">
                              {editingMember.accessRole}
                            </Badge>
                          </div>
                          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
                            <span className="text-xs text-muted-foreground block">Designation:</span>
                            <span className="font-semibold text-foreground text-sm mt-1 block">{editingMember.designation?.title || editForm.designationTitle || 'Unassigned'}</span>
                          </div>
                          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
                            <span className="text-xs text-muted-foreground block">Department:</span>
                            <span className="font-semibold text-foreground text-sm mt-1 block">{editingMember.department?.name || 'General'}</span>
                          </div>
                          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
                            <span className="text-xs text-muted-foreground block">Team:</span>
                            <span className="font-semibold text-foreground text-sm mt-1 block">{editingMember.team?.name || 'None'}</span>
                          </div>
                          <div className="p-3.5 rounded-lg border border-border bg-card sm:col-span-2 space-y-1">
                            <span className="text-xs text-muted-foreground block">Data Access Scope:</span>
                            <span className="font-semibold text-foreground text-sm mt-1 block">{editingMember.dataScope || editForm.dataScope || 'ASSIGNED'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-foreground text-xs sm:text-sm">System Access Role *</label>
                            <Link
                              href="/app/settings?tab=roles"
                              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                              <Shield className="h-3.5 w-3.5" /> View Roles in Settings
                            </Link>
                          </div>
                          <select
                            value={editForm.accessRole}
                            onChange={(e) => setEditForm({ ...editForm, accessRole: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          >
                            <option value="MEMBER">Member (Individual Contributor / Software Engineer / Intern)</option>
                            <option value="MANAGER">Manager (Team Lead / Operations Manager / Approver)</option>
                            <option value="ADMIN">Admin (People, Leaves, Attendance, Org Settings)</option>
                            <option value="OWNER">Owner (Full Organization Root Authority)</option>
                          </select>
                        </div>

                        {roles && roles.length > 0 && (
                          <div className="space-y-1.5">
                            <label className="font-semibold text-foreground text-xs sm:text-sm">Custom Role Policy</label>
                            <select
                              value={editForm.roleId}
                              onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                              className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                            >
                              <option value="">Default (Derived from System Access Role)</option>
                              {roles.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} {r.isSystemRole ? '(System Role)' : '(Custom)'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="font-semibold text-foreground text-xs sm:text-sm">Designation Title</label>
                          <input
                            type="text"
                            list="edit-designations-list"
                            value={editForm.designationTitle}
                            onChange={(e) => setEditForm({ ...editForm, designationTitle: e.target.value })}
                            placeholder="e.g. Tech Lead, Software Engineer, HR Specialist, QA Lead..."
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          />
                          <datalist id="edit-designations-list">
                            {designations.map((rawD) => {
                              const d = rawD.data !== undefined ? rawD.data : rawD;
                              return <option key={d.id} value={d.title} />;
                            })}
                          </datalist>
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-primary" /> Suggestions:
                            </span>
                            {['Tech Lead', 'Software Engineer', 'Senior Engineer', 'Product Manager', 'HR Specialist', 'Operations Manager', 'Intern'].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setEditForm({ ...editForm, designationTitle: preset })}
                                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${
                                  editForm.designationTitle.toLowerCase() === preset.toLowerCase()
                                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-semibold text-foreground text-xs sm:text-sm">Department</label>
                            <select
                              value={editForm.departmentId}
                              onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                              className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                            >
                              <option value="">General / None</option>
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
                          <div className="space-y-1.5">
                            <label className="font-semibold text-foreground text-xs sm:text-sm">Team</label>
                            <select
                              value={editForm.teamId}
                              onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value })}
                              className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                            >
                              <option value="">None / Unassigned</option>
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
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-semibold text-foreground text-xs sm:text-sm">Data Access Scope</label>
                          <select
                            value={editForm.dataScope}
                            onChange={(e) => setEditForm({ ...editForm, dataScope: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          >
                            <option value="ASSIGNED">Assigned Records Only</option>
                            <option value="OWN">Own Records Only</option>
                            <option value="TEAM">Assigned Team Records</option>
                            <option value="DEPARTMENT">Assigned Department Records</option>
                            <option value="WORKSPACE">Entire Workspace Records</option>
                          </select>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Need custom granular permissions?
                            </p>
                          </div>
                          <Link
                            href="/app/settings?tab=roles"
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            Go to Settings Roles <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>

              <div className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={updatingMember} className="gap-1.5 px-4 font-semibold">
                  {updatingMember ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 5: Invitation Created & Link Modal */}
      {createdInviteInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg bg-card border-border shadow-2xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <span>🎉</span> Invitation Generated Successfully
              </CardTitle>
              <CardDescription className="text-xs">
                Invitation created for <span className="font-semibold text-foreground">{createdInviteInfo.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* SENDER & RECEIVER ACCOUNT REGISTRATION */}
              <div className="rounded-md border border-border bg-surface-secondary/70 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sender Account (From):</span>
                  <span className="font-semibold text-foreground">
                    {createdInviteInfo.senderName ? `${createdInviteInfo.senderName} (${createdInviteInfo.senderEmail || 'current user'})` : 'Current User Account'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receiver Account (To):</span>
                  <span className="font-semibold text-foreground">{createdInviteInfo.email}</span>
                </div>
              </div>

              {createdInviteInfo.emailDelivered ? (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-700 dark:text-emerald-400">
                  ✓ An invitation email was delivered via SMTP to <strong>{createdInviteInfo.email}</strong>.
                </div>
              ) : (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-amber-700 dark:text-amber-400">
                  <p className="font-semibold mb-1">Direct Invitation Link Ready</p>
                  <p>
                    SMTP mail server is not configured in the cloud environment yet, so no email is sent to your inbox. You can open or copy the direct link below to accept and activate this account immediately!
                  </p>
                </div>
              )}

              <div>
                <label className="font-semibold text-foreground block mb-1">Accept Invitation URL</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    readOnly
                    type="text"
                    value={normalizeInviteLink(createdInviteInfo.link)}
                    className="w-full rounded-md border border-input bg-surface-secondary px-3 py-1.5 text-xs text-foreground select-all font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => copyInviteLink(createdInviteInfo.link)}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                    <a
                      href={normalizeInviteLink(createdInviteInfo.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md text-xs font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 h-8 px-3 gap-1 shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open Link
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="flex items-center justify-end p-4 border-t border-border">
              <Button size="sm" onClick={() => setCreatedInviteInfo(null)}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
