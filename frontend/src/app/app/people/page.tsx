'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

export default function PeoplePage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
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

      setMembers(Array.isArray(memData) ? memData : []);
      setInvitations(Array.isArray(invData) ? invData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setDesignations(Array.isArray(desigData) ? desigData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);

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
              <option value="ADMIN">HR Executive</option>
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
                          <Badge variant={m.accessRole === 'OWNER' ? 'default' : m.accessRole === 'ADMIN' ? 'warning' : 'secondary'}>
                            {m.accessRole === 'ADMIN' ? 'HR EXECUTIVE' : m.accessRole}
                          </Badge>
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
                        <td className="py-3 px-4 text-right space-x-1">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground">Designation (Job Title)</label>
                    <input
                      type="text"
                      list="designations-datalist"
                      value={inviteForm.designationTitle}
                      onChange={(e) => setInviteForm({ ...inviteForm, designationTitle: e.target.value })}
                      placeholder="e.g. Operations Manager, QA Auditor, Team Lead"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none mt-1"
                    />
                    <datalist id="designations-datalist">
                      {designations.map((rawD) => {
                        const d = rawD.data !== undefined ? rawD.data : rawD;
                        return (
                          <option key={d.id} value={d.title} />
                        );
                      })}
                    </datalist>
                  </div>
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
                </div>

                <div>
                  <label className="font-semibold text-foreground">Data Access Scope</label>
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
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteModal(false)}>
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
              )}

              {/* SECTION C: Access */}
              {activeProfileTab === 'access' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground block">System Access Role:</span>
                    <Badge variant="default">{selectedMember.accessRole === 'ADMIN' ? 'HR EXECUTIVE' : selectedMember.accessRole}</Badge>
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
