'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
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
} from 'lucide-react';
import { toast } from 'sonner';

export default function PeoplePage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'roles'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [deleteReassignRoleId, setDeleteReassignRoleId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');

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
  const [editForm, setEditForm] = useState({
    accessRole: 'MEMBER',
    roleId: '',
    departmentId: '',
    teamId: '',
    designationId: '',
    designationTitle: '',
    dataScope: 'ASSIGNED',
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
      deptKeywords: [] as string[],
      teamKeywords: [] as string[],
      label: 'Executive Leadership',
      description: 'Full organization-wide administrative ownership and global visibility across all records.',
    },
    {
      keywords: ['director', 'vp', 'vice president', 'head of', 'general manager', 'coo', 'cto', 'cfo', 'cpo'],
      role: 'MANAGER',
      scope: 'WORKSPACE',
      deptKeywords: ['management', 'executive', 'operations'],
      teamKeywords: [] as string[],
      label: 'Senior Leadership',
      description: 'Cross-functional leadership with enterprise-wide data access and operations management.',
    },
    {
      keywords: ['operations manager', 'department manager', 'branch manager', 'delivery manager', 'program manager'],
      role: 'MANAGER',
      scope: 'DEPARTMENT',
      deptKeywords: ['operations', 'general'],
      teamKeywords: [] as string[],
      label: 'Department Management',
      description: 'Departmental oversight, approvals, and cross-team workflow orchestration.',
    },
    {
      keywords: ['hr', 'human resources', 'recruiter', 'people ops', 'talent', 'talent acquisition'],
      role: 'ADMIN',
      scope: 'DEPARTMENT',
      deptKeywords: ['hr', 'human', 'people'],
      teamKeywords: [] as string[],
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
      teamKeywords: [] as string[],
      label: 'Finance & Compliance',
      description: 'Access to departmental financial records, billing, and accounting items.',
    },
    {
      keywords: ['contractor', 'freelancer', 'consultant', 'intern', 'temporary', 'vendor', 'trainee'],
      role: 'MEMBER',
      scope: 'ASSIGNED',
      deptKeywords: [] as string[],
      teamKeywords: [] as string[],
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
      const [memRes, invRes, deptRes, desigRes, teamRes, roleRes, permsRes, meRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/people`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/people/invitations`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/departments`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/designations`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/teams`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/roles`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/roles/permissions`, { headers: activeHeaders }),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers: activeHeaders }),
      ]);

      const rawMem = await memRes.json();
      const rawInv = await invRes.json();
      const rawDept = await deptRes.json();
      const rawDesig = await desigRes.json();
      const rawTeam = await teamRes.json();
      const rawRole = await roleRes.json();
      const rawPerms = permsRes.ok ? await permsRes.json() : [];
      const rawMe = await meRes.json();

      const memData = rawMem.data !== undefined ? rawMem.data : rawMem;
      const invData = rawInv.data !== undefined ? rawInv.data : rawInv;
      const deptData = rawDept.data !== undefined ? rawDept.data : rawDept;
      const desigData = rawDesig.data !== undefined ? rawDesig.data : rawDesig;
      const teamData = rawTeam.data !== undefined ? rawTeam.data : rawTeam;
      const roleData = rawRole.data !== undefined ? rawRole.data : rawRole;
      const permsData = rawPerms.data !== undefined ? rawPerms.data : rawPerms;

      setMembers(Array.isArray(memData) ? memData : []);
      setInvitations(Array.isArray(invData) ? invData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setDesignations(Array.isArray(desigData) ? desigData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
      
      const roleList = Array.isArray(roleData) ? roleData : [];
      const systemOrder = ['ADMIN', 'MANAGER', 'MEMBER', 'OWNER'];
      const sortedRoles = [...roleList].sort((a: any, b: any) => {
        const aIndex = systemOrder.indexOf(a.name);
        const bIndex = systemOrder.indexOf(b.name);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setRoles(sortedRoles);
      setAllPermissions(Array.isArray(permsData) ? permsData : []);

      if (sortedRoles.length > 0) {
        setSelectedRoleId((prev) => {
          if (prev && sortedRoles.some((r: any) => r.id === prev)) return prev;
          const adminRole = sortedRoles.find((r: any) => r.name === 'ADMIN') || sortedRoles[0];
          return adminRole.id;
        });
      }

      const meData = rawMe.data !== undefined ? rawMe.data : rawMe;
      if (meData?.memberships) {
        const currentMem = meData.memberships.find((m: any) => m.workspaceId === wsId);
        if (currentMem) setCurrentUserRole(currentMem.accessRole);
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
    setEditingMember(m);
    setEditForm({
      accessRole: m.accessRole || 'MEMBER',
      roleId: m.roleId || m.role?.id || '',
      departmentId: m.departmentId || m.department?.id || '',
      teamId: m.teamId || m.team?.id || '',
      designationId: m.designationId || m.designation?.id || '',
      designationTitle: m.designation?.title || '',
      dataScope: m.dataScope || 'ASSIGNED',
    });
    setShowEditModal(true);
  };

  const handleSaveMemberOrgDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setUpdatingMember(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/${editingMember.id}/org-details`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          accessRole: editForm.accessRole,
          roleId: editForm.roleId || undefined,
          departmentId: editForm.departmentId || null,
          teamId: editForm.teamId || null,
          designationId: editForm.designationId || null,
          designationTitle: editForm.designationTitle || undefined,
          dataScope: editForm.dataScope,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update member role & designation');

      toast.success(`Updated role & designation for ${editingMember.user?.firstName || 'member'}`);
      setShowEditModal(false);
      setEditingMember(null);
      await loadData();

      if (selectedMember && selectedMember.id === editingMember.id) {
        setSelectedMember((prev: any) => ({
          ...prev,
          ...data,
          accessRole: editForm.accessRole,
          designation: designations.find((d: any) => d.id === editForm.designationId) || { title: editForm.designationTitle || 'Unassigned' },
          department: departments.find((d: any) => d.id === editForm.departmentId) || null,
          team: teams.find((t: any) => t.id === editForm.teamId) || null,
        }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member details');
    } finally {
      setUpdatingMember(false);
    }
  };

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
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ permissionIds: updatedPermIds }),
      });
      if (!res.ok) throw new Error('Failed to update permissions');
      const updated = await res.json();
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, permissions: updated.permissions || updatedPermIds } : r
        )
      );
      toast.success('Role permissions updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update permissions');
    }
  };

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
      toast.success('Custom role created');
      setNewRoleName('');
      setNewRoleDesc('');
      await loadData();
      if (data?.id) setSelectedRoleId(data.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleRenameRole = async (roleId: string) => {
    if (!editRoleName.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ name: editRoleName.trim(), description: editRoleDesc.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      toast.success('Role updated');
      setEditingRoleId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/roles/${roleId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ reassignRoleId: deleteReassignRoleId || undefined }),
      });
      if (!res.ok) throw new Error('Failed to delete role');
      toast.success('Role deleted');
      setDeletingRoleId(null);
      setDeleteReassignRoleId('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  const selectedRoleObj = roles.find((r) => r.id === selectedRoleId) || roles.find((r) => r.name === 'ADMIN') || roles[0];

  const filteredMembers = members.filter((m) => {
    const name = `${m.user?.firstName} ${m.user?.lastName}`.toLowerCase();
    const email = m.user?.email?.toLowerCase() || '';
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const matchesDept = filterDept ? m.departmentId === filterDept : true;
    const matchesRole = filterRole ? m.accessRole === filterRole : true;
    return matchesSearch && matchesDept && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">People Directory & Lifecycle Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage organization members, invitation flows, employee profiles, access revocation, and offboarding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUserRole === 'OWNER' && (
            <Button variant="outline" size="sm" onClick={() => setShowTransferModal(true)}>
              Transfer Ownership
            </Button>
          )}
          <Button
            variant={activeTab === 'roles' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setActiveTab('roles')}
          >
            <Shield className="h-3.5 w-3.5 text-primary" /> Roles & Permissions
          </Button>
          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
            <Button onClick={() => setShowInviteModal(true)} size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" /> Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
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
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold transition-colors ${
              activeTab === 'roles'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-4 w-4" /> Roles & Permissions
          </button>
        </div>

        {activeTab === 'members' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search member name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-md border border-input bg-background text-xs w-60 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="py-1.5 px-2 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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

      {/* TAB 1: Members Directory */}
      {activeTab === 'members' && (
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
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {m.user?.firstName?.charAt(0)}
                              {m.user?.lastName?.charAt(0)}
                            </div>
                            <div>
                              <div
                                onClick={() => setSelectedMember(m)}
                                className="font-semibold text-foreground hover:underline cursor-pointer"
                              >
                                {m.user?.firstName} {m.user?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{m.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(m)}
                            className="group flex items-center gap-1.5 focus:outline-none"
                            title="Click to edit role & designation"
                          >
                            <Badge variant={m.accessRole === 'OWNER' ? 'default' : m.accessRole === 'ADMIN' ? 'warning' : 'secondary'} className="group-hover:ring-1 group-hover:ring-primary/40 transition-all">
                              {m.accessRole}
                            </Badge>
                            <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-foreground">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(m)}
                            className="group text-left hover:text-primary transition-colors flex items-center gap-1 focus:outline-none"
                            title="Click to edit role & designation"
                          >
                            <span>{m.designation?.title || 'Unassigned'}</span>
                            <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
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
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-primary font-semibold hover:text-primary hover:bg-primary/10"
                            onClick={() => handleOpenEditModal(m)}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setSelectedMember(m)}
                          >
                            Profile
                          </Button>
                          {m.status === 'ACTIVE' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-amber-600 hover:text-amber-700"
                              onClick={() => handleSuspendMember(m.id)}
                            >
                              Suspend
                            </Button>
                          ) : m.status === 'SUSPENDED' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleReactivateMember(m.id)}
                            >
                              Reactivate
                            </Button>
                          ) : null}
                          {m.accessRole !== 'OWNER' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-destructive"
                              onClick={() => {
                                setOffboardMember(m);
                                setShowOffboardModal(true);
                              }}
                            >
                              Offboard
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
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
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
                    const isSelected = selectedRoleObj?.id === r.id;
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
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 justify-start gap-1.5"
                          onClick={() => {
                            setEditingRoleId(selectedRoleObj.id);
                            setEditRoleName(selectedRoleObj.name);
                            setEditRoleDesc(selectedRoleObj.description || '');
                          }}
                        >
                          <Pencil className="h-3 w-3" /> Edit Name & Description
                        </Button>

                        {deletingRoleId === selectedRoleObj.id ? (
                          <div className="space-y-2 border border-destructive/30 p-2.5 rounded-md bg-destructive/5 mt-1">
                            <p className="text-[11px] text-destructive font-medium">Reassign active members before deletion:</p>
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

                {!selectedRoleObj?.isActive && (
                  <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>This role is currently deactivated. Permissions are suspended for all assigned members.</span>
                  </div>
                )}

                {/* Permissions by Module */}
                <div className="space-y-6 max-h-[620px] overflow-y-auto pr-2 mt-6">
                  {Array.from(new Set(allPermissions.map((p) => p.module || 'General')))
                    .sort((a, b) => a.localeCompare(b))
                    .map((modName) => {
                      const modPerms = allPermissions
                        .filter((p) => (p.module || 'General') === modName)
                        .sort((a, b) => a.code.localeCompare(b.code));

                      return (
                        <div key={modName} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-foreground tracking-wider uppercase">
                              {modName}
                            </h4>
                            <span className="text-[10px] text-muted-foreground bg-muted font-medium px-2 py-0.5 rounded-md">
                              {modPerms.length} actions
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {modPerms.map((perm) => {
                              const assignedPerms: any[] = selectedRoleObj?.permissions || [];
                              const isGranted = assignedPerms.some(
                                (p: any) =>
                                  p === perm.id ||
                                  p.permissionId === perm.id ||
                                  p.id === perm.id ||
                                  p.permission?.id === perm.id ||
                                  p.permission?.code === perm.code ||
                                  p.code === perm.code
                              );

                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => {
                                    if (selectedRoleObj?.name !== 'OWNER' && selectedRoleObj?.isActive) {
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
                      <option value="ADMIN">HR Executive (HR &amp; Organization administration)</option>
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
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl bg-card border-border shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {selectedMember.user?.firstName?.charAt(0)}
                    {selectedMember.user?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedMember.user?.firstName} {selectedMember.user?.lastName}
                    </CardTitle>
                    <CardDescription className="text-xs">{selectedMember.user?.email}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                  Close
                </Button>
              </div>

              {/* Profile Completeness Bar & Actionable Incomplete Reminder (Phase 10 Requirement 2) */}
              <div className="mt-3 p-2.5 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-xs">Profile Completion</span>
                    <Badge variant={selectedMember.phone && selectedMember.employeeId && selectedMember.emergencyContact ? 'default' : 'secondary'} className="text-[10px]">
                      {selectedMember.phone && selectedMember.employeeId && selectedMember.emergencyContact ? '100% Complete' : '75% Incomplete'}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {!selectedMember.emergencyContact ? 'Missing: Emergency contact, bank details' : 'All standard profile fields completed.'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${BRANDING.apiUrl}/people/${selectedMember.id}/reminder`, {
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

              {/* Profile Sub-tabs */}
              <div className="flex border-b border-border space-x-3 pt-3 text-xs">
                {(['personal', 'employment', 'access', 'assets', 'history', 'offboarding'] as const).map((tab) => (
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
            </CardHeader>

            <CardContent className="py-4 text-xs space-y-4">
              {/* SECTION A: Personal */}
              {activeProfileTab === 'personal' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground block">Full Name:</span>
                      <span className="font-semibold text-foreground">{selectedMember.user?.firstName} {selectedMember.user?.lastName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Work Email:</span>
                      <span className="font-semibold text-foreground">{selectedMember.user?.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Phone Number:</span>
                      <span className="font-semibold text-foreground">{selectedMember.user?.phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Emergency Contact:</span>
                      <span className="font-semibold text-foreground">
                        {selectedMember.emergencyContact ? JSON.stringify(selectedMember.emergencyContact) : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION B: Employment */}
              {activeProfileTab === 'employment' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-semibold text-foreground text-xs">Employment & Organizational Assignment</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => handleOpenEditModal(selectedMember)}
                    >
                      <Pencil className="h-3 w-3" /> Edit Designation & Org Details
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground block">Employee ID:</span>
                      <span className="font-semibold text-foreground">{selectedMember.employeeId || 'EMP-' + selectedMember.id.slice(0, 6)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Designation:</span>
                      <span className="font-semibold text-foreground">{selectedMember.designation?.title || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Department:</span>
                      <span className="font-semibold text-foreground">{selectedMember.department?.name || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Team:</span>
                      <span className="font-semibold text-foreground">{selectedMember.team?.name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Employment Type:</span>
                      <span className="font-semibold text-foreground">{selectedMember.employmentType || 'FULL_TIME'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Work Location:</span>
                      <span className="font-semibold text-foreground">{selectedMember.workLocation || 'Headquarters / Remote'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: Access */}
              {activeProfileTab === 'access' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-semibold text-foreground text-xs">System Role & Security Privileges</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => handleOpenEditModal(selectedMember)}
                    >
                      <Pencil className="h-3 w-3" /> Edit Access Role
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground block">System Access Role:</span>
                      <Badge variant={selectedMember.accessRole === 'OWNER' ? 'default' : selectedMember.accessRole === 'ADMIN' ? 'warning' : 'secondary'}>
                        {selectedMember.accessRole === 'ADMIN' ? 'HR EXECUTIVE' : selectedMember.accessRole}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Account Status:</span>
                      <Badge variant="success">{selectedMember.status}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Data Access Scope:</span>
                      <span className="font-semibold text-foreground">{selectedMember.dataScope || 'ASSIGNED'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Last Login:</span>
                      <span className="font-semibold text-foreground">
                        {selectedMember.user?.lastLoginAt ? new Date(selectedMember.user.lastLoginAt).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Direct access to Roles & Permissions tab */}
                  <div className="mt-3 p-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                        <Shield className="h-3.5 w-3.5 text-primary" /> Roles & Permissions Management
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Configure granular module policies, permissions matrix, and custom workspace roles.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setSelectedMember(null);
                        setActiveTab('roles');
                      }}
                    >
                      Open Roles & Permissions <Shield className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* SECTION D: Assets */}
              {activeProfileTab === 'assets' && (
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground">Assigned Company Assets</h4>
                  {selectedMember.assignedAssets?.length === 0 ? (
                    <p className="text-muted-foreground">No assets currently assigned to this member.</p>
                  ) : (
                    (selectedMember.assignedAssets || []).map((asset: any) => (
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
                    {(selectedMember.assignedTasks || []).map((t: any) => (
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
                      <span className="font-semibold text-foreground">{selectedMember.offboardingStatus || 'ACTIVE_EMPLOYEE'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Last Working Date:</span>
                      <span className="font-semibold text-foreground">
                        {selectedMember.lastWorkingDate ? new Date(selectedMember.lastWorkingDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg bg-card border-border shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary" /> Edit Member Role & Designation
                </CardTitle>
                <Badge
                  variant={
                    editingMember.status === 'ACTIVE'
                      ? 'success'
                      : editingMember.status === 'SUSPENDED'
                      ? 'destructive'
                      : 'outline'
                  }
                  className="text-[10px]"
                >
                  {editingMember.status}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Modify access permissions, designation title, department, and operational scope for{' '}
                <strong className="text-foreground">
                  {editingMember.user?.firstName} {editingMember.user?.lastName}
                </strong>.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveMemberOrgDetails}>
              <CardContent className="space-y-4 pt-4 text-xs">
                {/* User Identity Card */}
                <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                    {editingMember.user?.firstName?.[0] || 'U'}
                    {editingMember.user?.lastName?.[0] || ''}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-foreground text-xs truncate">
                      {editingMember.user?.firstName} {editingMember.user?.lastName}
                    </p>
                    <p className="text-muted-foreground text-[11px] truncate">{editingMember.user?.email}</p>
                  </div>
                </div>

                {/* 1. Core System Access Role */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">System Access Role *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setActiveTab('roles');
                      }}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <Shield className="h-3 w-3" /> View Roles & Permissions
                    </button>
                  </div>
                  <select
                    value={editForm.accessRole}
                    onChange={(e) => setEditForm({ ...editForm, accessRole: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="MEMBER">Member (Individual Contributor / Software Engineer / Intern)</option>
                    <option value="MANAGER">Manager (Team Lead / Operations Manager / Approver)</option>
                    <option value="ADMIN">HR Executive / Admin (People, Leaves, Attendance, Org Settings)</option>
                    <option value="OWNER">Owner (Full Organization Root Authority)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Controls organizational rank, access scope, and administrative capabilities.
                  </p>
                </div>

                {/* 2. Custom Role (Optional) */}
                {roles && roles.length > 0 && (
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Custom Role Policy</label>
                    <select
                      value={editForm.roleId}
                      onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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

                {/* 3. Designation Title */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Designation Title</label>
                  <input
                    type="text"
                    list="edit-designations-list"
                    value={editForm.designationTitle}
                    onChange={(e) => setEditForm({ ...editForm, designationTitle: e.target.value })}
                    placeholder="e.g. Tech Lead, Software Engineer, HR Specialist, QA Lead..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <datalist id="edit-designations-list">
                    {designations.map((rawD) => {
                      const d = rawD.data !== undefined ? rawD.data : rawD;
                      return <option key={d.id} value={d.title} />;
                    })}
                  </datalist>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> Suggestions:
                    </span>
                    {['Tech Lead', 'Software Engineer', 'Senior Engineer', 'Product Manager', 'HR Specialist', 'Operations Manager', 'Intern'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, designationTitle: preset })}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
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

                {/* 4. Department & Team */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Department</label>
                    <select
                      value={editForm.departmentId}
                      onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Team</label>
                    <select
                      value={editForm.teamId}
                      onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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

                {/* 5. Data Access Scope */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Data Access Scope</label>
                  <select
                    value={editForm.dataScope}
                    onChange={(e) => setEditForm({ ...editForm, dataScope: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="ASSIGNED">Assigned Records Only</option>
                    <option value="OWN">Own Records Only</option>
                    <option value="TEAM">Assigned Team Records</option>
                    <option value="DEPARTMENT">Assigned Department Records</option>
                    <option value="WORKSPACE">Entire Workspace Records</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Determines what data (tasks, time, tickets) this member is permitted to see across the organization.
                  </p>
                </div>

                {/* Direct Link to Roles & Permissions */}
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Need custom granular permissions?
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setActiveTab('roles');
                    }}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Go to Roles & Permissions <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>

              <div className="p-4 border-t border-border flex items-center justify-end gap-2">
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
                <Button type="submit" size="sm" disabled={updatingMember} className="gap-1.5">
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
