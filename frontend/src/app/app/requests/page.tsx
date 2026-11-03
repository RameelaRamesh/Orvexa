'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Inbox,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Layers,
  User,
  Users,
  Search,
  Check,
  X,
  MessageSquare,
  Tag,
  RefreshCw,
  Send,
  Sparkles,
  Crown,
  Shield,
  Briefcase,
  Paperclip,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  defaultResponsibleTeamId?: string;
  slaHours?: number;
}

interface InventoryItem {
  id: string;
  code?: string;
  name: string;
  category: string;
  quantityOnHand?: number;
  currentStock?: number;
  unit: string;
  reorderPoint?: number;
  reorderThreshold?: number;
}

interface ServiceRequest {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  categoryId: string;
  requesterMembershipId: string;
  requesterName?: string;
  requesterRole?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  ownerMembershipId?: string;
  responsibleTeamId?: string;

  // Role Routing Fields (Requirement 2)
  targetRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  targetUserId?: string | null;
  targetUserName?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  acceptedAt?: string | null;

  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  dueDate?: string;
  attachments?: Array<{ id?: string; name: string; url?: string }>;
  comments?: Array<{
    id: string;
    membershipId?: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
  activityTimeline?: Array<{
    action: string;
    actorMembershipId?: string;
    actorName: string;
    timestamp: string;
    notes?: string;
    details?: string;
  }>;
  replenishmentItems?: Array<{
    inventoryItemId: string;
    name?: string;
    requestedQuantity: number;
    fulfilledQuantity?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'inventory' | 'categories'>('requests');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [categories, setCategories] = useState<RequestCategory[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [currentMembershipId, setCurrentMembershipId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'SENT_TO_ME' | 'SENT_BY_ME'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReplenishPresetModal, setShowReplenishPresetModal] = useState(false);

  // Redesigned Modal Form State (Requirement 1)
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | ''>('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [requestTitle, setRequestTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ role?: string; title?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Refs for Auto-Focus (Requirement 1)
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Action states
  const [commentText, setCommentText] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalatePrompt, setShowEscalatePrompt] = useState(false);

  // Category Form State
  const [catForm, setCatForm] = useState({
    name: '',
    code: '',
    description: '',
    defaultResponsibleTeamId: '',
    slaHours: 24,
  });

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' && wsId !== 'null' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  const loadData = async () => {
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!wsId) return;

    setLoading(true);
    try {
      const headers = getHeaders();
      const [reqRes, catRes, invRes, teamRes, peopleRes, meRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/requests`, { headers }),
        fetch(`${BRANDING.apiUrl}/requests/categories`, { headers }),
        fetch(`${BRANDING.apiUrl}/requests/inventory`, { headers }),
        fetch(`${BRANDING.apiUrl}/teams`, { headers }),
        fetch(`${BRANDING.apiUrl}/people`, { headers }),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers }),
      ]);

      const reqData = await reqRes.json();
      const catData = await catRes.json();
      const invData = await invRes.json();
      const teamData = await teamRes.json();
      const peopleData = await peopleRes.json();
      const meData = await meRes.json();

      if (reqData.success) setRequests(reqData.data || []);
      if (catData.success) {
        setCategories(catData.data || []);
        if (catData.data?.length > 0 && !selectedCategory) {
          const gen = catData.data.find((c: any) => c.name.toLowerCase() === 'general request');
          setSelectedCategory(gen ? gen.id : catData.data[0].id);
        }
      }
      if (invData.success) setInventory(invData.data || []);
      if (teamData.success) setTeams(teamData.data || []);
      if (peopleData.success) setPeople(peopleData.data || []);

      if (meData.success && meData.data) {
        setCurrentUserId(meData.data.id || '');
        const mem = meData.data.memberships?.find((m: any) => m.workspaceId === wsId);
        if (mem) {
          setCurrentMembershipId(mem.id);
          if (mem.accessRole) {
            setCurrentRole(mem.accessRole.toUpperCase() as any);
          }
        }
      }

      // Sync active selected request if open
      if (selectedRequest && reqData.success) {
        const updated = reqData.data.find((r: any) => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    } catch (err: any) {
      console.error('Failed to load requests data:', err);
      toast.error('Failed to load tickets and requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to Escape key to close modal (Requirement 1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    if (showCreateModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  // Handle modal open & auto-focus
  const openCreateModal = () => {
    setFormErrors({});
    // Preselect default category: General request
    const gen = categories.find((c) => c.name.toLowerCase() === 'general request');
    setSelectedCategory(gen ? gen.id : categories[0]?.id || '');
    setShowCreateModal(true);
  };

  // Group members by role (Requirement 1 & 2)
  const roleMembers = {
    OWNER: people.filter((p) => (p.accessRole || '').toUpperCase() === 'OWNER'),
    ADMIN: people.filter((p) => (p.accessRole || '').toUpperCase() === 'ADMIN'),
    MANAGER: people.filter((p) => (p.accessRole || '').toUpperCase() === 'MANAGER'),
    MEMBER: people.filter((p) => (p.accessRole || '').toUpperCase() === 'MEMBER'),
  };

  // Hierarchy Level Checks (Requirement 7)
  const roleHierarchy: Record<string, number> = {
    MEMBER: 1,
    MANAGER: 2,
    ADMIN: 3,
    OWNER: 4,
  };
  const myLevel = roleHierarchy[currentRole] || 1;

  // Handle Create Request Submit (Requirement 1 & 2)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { role?: string; title?: string } = {};

    if (!selectedRole) {
      errors.role = 'Choose who should receive this request';
    }
    if (!requestTitle.trim()) {
      errors.title = 'Enter a title';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const headers = getHeaders();
      const payload: any = {
        title: requestTitle.trim(),
        description: description.trim() || 'No additional details provided.',
        categoryId: selectedCategory,
        priority,
        targetRole: selectedRole,
        targetUserId: targetUserId ? targetUserId : null,
      };

      if (attachmentName) {
        payload.attachments = [{ id: 'att_1', name: attachmentName, url: '#' }];
      }

      const res = await fetch(`${BRANDING.apiUrl}/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request');

      toast.success(`Request ${data.data?.ticketNumber || ''} submitted successfully!`);
      setShowCreateModal(false);

      // Reset form
      setSelectedRole('');
      setTargetUserId('');
      setRequestTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAttachmentName(null);
      setFormErrors({});

      await loadData();
      if (data.data) {
        setSelectedRequest(data.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Claim / Accept Ticket (Requirement 5)
  const handleAcceptTicket = async (requestId: string) => {
    setClaiming(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/${requestId}/accept`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (res.status === 409) {
        toast.error(data.message || 'This ticket has already been accepted by another member.');
        await loadData();
        return;
      }
      if (!res.ok) throw new Error(data.message || 'Failed to accept ticket');

      toast.success('Ticket accepted! You are now assigned.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error accepting ticket');
    } finally {
      setClaiming(false);
    }
  };

  // Escalate Request (Requirement 6)
  const handleEscalate = async (requestId: string) => {
    if (!escalateReason.trim()) {
      toast.error('Please specify escalation reason');
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/${requestId}/escalate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: escalateReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to escalate');

      toast.success('Request escalated up to the next role group!');
      setEscalateReason('');
      setShowEscalatePrompt(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error escalating request');
    }
  };

  const handleFulfill = async (requestId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/${requestId}/fulfill`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fulfillmentNotes: actionNotes || 'Replenished items delivered. Stock verified and deducted.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fulfill');

      toast.success('Request fulfilled! Inventory stock levels updated.');
      setActionNotes('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error fulfilling request');
    }
  };

  const handleClose = async (requestId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/${requestId}/close`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ feedback: actionNotes || 'Satisfactorily resolved and closed.' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to close');

      toast.success('Request closed successfully');
      setActionNotes('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error closing request');
    }
  };

  const handleAddComment = async (requestId: string) => {
    if (!commentText.trim()) return;

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/${requestId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: commentText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add comment');

      toast.success('Comment posted');
      setCommentText('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error posting comment');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify(catForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create category');

      toast.success('Category created successfully');
      setShowCategoryModal(false);
      setCatForm({
        name: '',
        code: '',
        description: '',
        defaultResponsibleTeamId: '',
        slaHours: 24,
      });
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    }
  };

  const getMemberName = (memId?: string) => {
    if (!memId) return 'Unassigned';
    const p = people.find((item) => item.id === memId || item.userId === memId);
    if (!p) return 'Team Member';
    const first = p.user?.firstName || p.firstName || '';
    const last = p.user?.lastName || p.lastName || '';
    return `${first} ${last}`.trim() || p.user?.email || 'Member';
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'General Queue';
    const t = teams.find((item) => item.id === teamId);
    return t ? t.name : 'Responsible Team';
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'General request';
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-[10px]">URGENT</Badge>;
      case 'HIGH':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px]">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary" className="text-[10px]">MEDIUM</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">LOW</Badge>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'SUBMITTED':
        return <Badge variant="outline" className="border-blue-400 text-blue-500 text-[10px]">SUBMITTED</Badge>;
      case 'ACKNOWLEDGED':
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600 text-white text-[10px]">{s}</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-emerald-600 text-white text-[10px]">RESOLVED</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary" className="text-muted-foreground text-[10px]">CLOSED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
    }
  };

  // Helper for Inventory stock lookup (Requirement 8)
  const getInventoryItemDetails = (inventoryItemId?: string, itemName?: string) => {
    const inv = inventory.find(
      (i) =>
        i.id === inventoryItemId ||
        i.code === inventoryItemId ||
        (itemName && i.name.toLowerCase() === itemName.toLowerCase()),
    );
    const displayName = inv
      ? inv.name
      : itemName || (inventoryItemId ? inventoryItemId.replace('inv_item_', '').replace(/_/g, ' ') : 'Inventory Item');
    const stockOnHand = inv ? `${inv.quantityOnHand ?? inv.currentStock ?? 0} ${inv.unit || 'units'}` : 'In Stock';
    return { inv, displayName, stockOnHand };
  };

  // Filter requests based on status, scope, category, and search (Requirement 3)
  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && r.categoryId !== categoryFilter) return false;

    // Scope Filter: All / Sent to me / Sent by me (Requirement 3)
    if (scopeFilter === 'SENT_TO_ME') {
      const isRequester = r.requesterMembershipId === currentMembershipId;
      const isTargetRole = r.targetRole && r.targetRole.toUpperCase() === currentRole.toUpperCase();
      const isTargetUser = r.targetUserId === currentUserId || r.targetUserId === currentMembershipId;
      const isAssigned = r.assignedTo === currentMembershipId || r.assignedTo === currentUserId;
      if (isRequester || (!isTargetRole && !isTargetUser && !isAssigned)) return false;
    } else if (scopeFilter === 'SENT_BY_ME') {
      if (r.requesterMembershipId !== currentMembershipId) return false;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchNumber = r.ticketNumber.toLowerCase().includes(q);
      return matchTitle || matchNumber;
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            Internal Requests & Tickets
          </h1>
          <p className="text-sm text-muted-foreground">
            Role-based ticket routing, queue claiming, stock fulfillment, and lifecycle tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="mr-1.5 h-4 w-4" />
            Submit Service Request
          </Button>
        </div>
      </div>

      {/* Top Nav Tabs */}
      <div className="flex items-center gap-4 border-b border-border pb-2 text-sm">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'requests'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="h-4 w-4" />
          Requests Queue ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'inventory'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          Inventory & Supplies Stock ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'categories'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="h-4 w-4" />
          Configured Categories ({categories.length})
        </button>
      </div>

      {/* Tab: Requests Queue */}
      {activeTab === 'requests' && (
        <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Requests List Column */}
          <div className="col-span-5 flex flex-col border-r border-border bg-muted/20">
            {/* Filters */}
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search ticket # or title..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                {/* Scope Filter: All / Sent to me / Sent by me (Requirement 3) */}
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value as any)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground font-medium"
                >
                  <option value="ALL">All</option>
                  <option value="SENT_TO_ME">Sent to me</option>
                  <option value="SENT_BY_ME">Sent by me</option>
                </select>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground truncate"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Requests */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading requests...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No requests found for this filter.
                </div>
              ) : (
                filteredRequests.map((r) => {
                  const isSelected = selectedRequest?.id === r.id;
                  const routingLabel = r.targetUserName
                    ? r.targetUserName
                    : r.targetRole
                    ? `${r.targetRole.charAt(0) + r.targetRole.slice(1).toLowerCase()} group`
                    : 'General Queue';

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRequest(r)}
                      className={`w-full text-left rounded-lg p-3 transition-all border ${
                        isSelected
                          ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20'
                          : 'bg-background hover:bg-muted/40 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {r.ticketNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(r.priority)}
                          {getStatusBadge(r.status)}
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-foreground truncate">{r.title}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {r.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">To: {routingLabel}</span>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Request Details Drawer */}
          <div className="col-span-7 flex flex-col h-full bg-background overflow-y-auto">
            {selectedRequest ? (
              <div className="flex flex-col h-full">
                {/* Details Header */}
                <div className="p-4 border-b border-border bg-card flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-primary">
                        {selectedRequest.ticketNumber}
                      </span>
                      {getStatusBadge(selectedRequest.status)}
                      {getPriorityBadge(selectedRequest.priority)}
                      <Badge variant="outline" className="text-[10px]">
                        {getCategoryName(selectedRequest.categoryId)}
                      </Badge>
                    </div>
                    <h2 className="text-base font-bold text-foreground">{selectedRequest.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                      <span>Requester: <strong>{getMemberName(selectedRequest.requesterMembershipId)}</strong></span>
                      <span>•</span>
                      <span>
                        Assigned:{' '}
                        <strong>
                          {selectedRequest.assignedToName
                            ? selectedRequest.assignedToName
                            : getMemberName(selectedRequest.assignedTo || selectedRequest.ownerMembershipId)}
                        </strong>
                      </span>
                      <span>•</span>
                      {/* Routing Display (Requirement 3) */}
                      <span>
                        Routing:{' '}
                        <strong className="text-primary">
                          {selectedRequest.targetUserName
                            ? selectedRequest.targetUserName
                            : selectedRequest.targetRole
                            ? `${selectedRequest.targetRole.charAt(0) + selectedRequest.targetRole.slice(1).toLowerCase()} group`
                            : getTeamName(selectedRequest.responsibleTeamId)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Escalate button (Requirement 6) */}
                  {selectedRequest.status !== 'CLOSED' && selectedRequest.priority !== 'URGENT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEscalatePrompt(!showEscalatePrompt)}
                      className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                    >
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      Escalate
                    </Button>
                  )}
                </div>

                {/* Escalation Prompt (Requirement 6) */}
                {showEscalatePrompt && (
                  <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Reason for escalation (e.g., SLA breach, blocking critical deployment)..."
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      className="flex-1 rounded border border-amber-300 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <Button size="sm" onClick={() => handleEscalate(selectedRequest.id)} className="text-xs">
                      Confirm Escalation
                    </Button>
                    <button
                      onClick={() => setShowEscalatePrompt(false)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                  {/* Description Card */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Description
                    </h3>
                    <div className="rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {selectedRequest.description}
                    </div>
                  </div>

                  {/* Replenishment Items Section (Requirement 8) */}
                  {selectedRequest.replenishmentItems && selectedRequest.replenishmentItems.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-primary" />
                        Requested Supplies / Inventory Replenishment
                      </h3>
                      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                        {selectedRequest.replenishmentItems.map((item, idx) => {
                          const { displayName, stockOnHand, inv } = getInventoryItemDetails(
                            item.inventoryItemId,
                            item.name,
                          );
                          return (
                            <div key={idx} className="p-3 bg-card flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-foreground">{displayName}</span>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  Available in Stock:{' '}
                                  <strong className={inv && (inv.quantityOnHand ?? 0) < 5 ? 'text-destructive' : 'text-foreground'}>
                                    {stockOnHand}
                                  </strong>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="font-semibold text-xs">
                                  Requested: {item.requestedQuantity}
                                </Badge>
                                {item.fulfilledQuantity !== undefined && (
                                  <div className="text-[10px] text-emerald-600 mt-1 font-medium">
                                    Fulfilled: {item.fulfilledQuantity}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Bar for Claiming & Lifecycle (Requirement 5) */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      Lifecycle Actions & Claiming
                    </h3>

                    <input
                      type="text"
                      placeholder="Add action notes or fulfillment remarks..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {/* Claiming: Accept Button (Requirement 5) */}
                      {selectedRequest.status === 'SUBMITTED' && (
                        <>
                          {!selectedRequest.assignedTo ? (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptTicket(selectedRequest.id)}
                              disabled={claiming}
                              className="text-xs bg-primary text-white hover:bg-primary/90"
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Accept Ticket
                            </Button>
                          ) : selectedRequest.assignedTo === currentMembershipId ? (
                            <Badge className="bg-blue-600 text-white text-xs py-1 px-2.5">
                              Accepted by You (In Progress)
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" disabled className="text-xs opacity-75">
                              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                              Taken by {selectedRequest.assignedToName || 'Team Member'}
                            </Button>
                          )}
                        </>
                      )}

                      {/* Fulfill Request */}
                      {(selectedRequest.status === 'ACKNOWLEDGED' || selectedRequest.status === 'IN_PROGRESS') && (
                        <Button
                          size="sm"
                          onClick={() => handleFulfill(selectedRequest.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                          <Package className="mr-1.5 h-3.5 w-3.5" />
                          Fulfill Request & Deduct Stock
                        </Button>
                      )}

                      {/* Verify & Close */}
                      {selectedRequest.status === 'RESOLVED' && (
                        <Button
                          size="sm"
                          onClick={() => handleClose(selectedRequest.id)}
                          className="text-xs"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Verify & Close Ticket
                        </Button>
                      )}

                      {selectedRequest.status === 'CLOSED' && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          This request has been fully resolved and verified.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline (Requirement 5) */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Activity Timeline & Audit History
                    </h3>
                    <div className="space-y-2 border-l-2 border-border pl-3 ml-2">
                      {selectedRequest.activityTimeline?.map((item, idx) => (
                        <div key={idx} className="relative text-xs">
                          <div className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{item.action}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {(item.notes || item.details) && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {item.notes || item.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Comments & Collaboration ({selectedRequest.comments?.length || 0})
                    </h3>

                    <div className="space-y-2 mb-3">
                      {selectedRequest.comments?.map((c) => (
                        <div key={c.id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                          <div className="flex items-center justify-between font-medium text-foreground mb-1">
                            <span>{c.authorName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment on this ticket..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(selectedRequest.id);
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddComment(selectedRequest.id)}
                        disabled={!commentText.trim()}
                        className="text-xs"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Inbox className="h-12 w-12 mb-3 opacity-30" />
                <h3 className="text-base font-semibold text-foreground">Select a service request</h3>
                <p className="text-xs max-w-sm mt-1">
                  Choose an internal request ticket from the queue on the left to view routing, claiming,
                  and audit history.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Inventory & Supplies */}
      {activeTab === 'inventory' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Current organization inventory levels connected to internal replenishment requests.
            </p>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh Inventory
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => {
              const stock = item.quantityOnHand ?? item.currentStock ?? 0;
              const reorder = item.reorderPoint ?? item.reorderThreshold ?? 5;
              const isLowStock = stock <= reorder;
              return (
                <Card key={item.id} className={isLowStock ? 'border-amber-500/50 bg-amber-500/5' : ''}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {item.code || item.id}
                      </Badge>
                      {isLowStock ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px]">In Stock</Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-2">{item.name}</CardTitle>
                    <CardDescription className="text-xs">{item.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex items-baseline justify-between mt-2">
                      <div className="text-2xl font-bold text-foreground">
                        {stock} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Reorder Point: {reorder}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Configured Categories (Requirement 8) */}
      {activeTab === 'categories' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Request types and categories configured for this organization.
            </p>
            <Button size="sm" onClick={() => setShowCategoryModal(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Request Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{cat.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {cat.code || 'CAT'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {cat.description || 'Configurable internal request type.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-1">
                  <div>
                    Default Team:{' '}
                    <span className="text-foreground font-medium">
                      {getTeamName(cat.defaultResponsibleTeamId)}
                    </span>
                  </div>
                  <div>
                    SLA Target: <span className="text-foreground font-medium">{cat.slaHours || 24} hours</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* REDESIGNED MODAL: Submit Service Request (Requirement 1) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                Submit Service Request
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {/* Field 1: Send to * (Required) (Requirement 1 & 7) */}
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Send to <span className="text-destructive">*</span></span>
                  {selectedRole && (
                    <span className="text-[11px] text-muted-foreground">
                      Selected: <strong>{selectedRole}</strong>
                    </span>
                  )}
                </label>

                {/* Four selectable role cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                  {[
                    {
                      role: 'Owner' as const,
                      roleKey: 'OWNER' as const,
                      icon: Crown,
                      count: roleMembers.OWNER.length,
                    },
                    {
                      role: 'Admin' as const,
                      roleKey: 'ADMIN' as const,
                      icon: Shield,
                      count: roleMembers.ADMIN.length,
                    },
                    {
                      role: 'Manager' as const,
                      roleKey: 'MANAGER' as const,
                      icon: Briefcase,
                      count: roleMembers.MANAGER.length,
                    },
                    {
                      role: 'Member' as const,
                      roleKey: 'MEMBER' as const,
                      icon: User,
                      count: roleMembers.MEMBER.length,
                    },
                  ].map((card) => {
                    const isSelected = selectedRole === card.roleKey;
                    const cardLevel = roleHierarchy[card.roleKey];
                    const hasPeople = card.count > 0;

                    // Permission Rule 7: User can send only to own role level or above.
                    // Members cannot send directly to Owner.
                    const isBelowUserLevel = cardLevel < myLevel;
                    const isMemberToOwner = currentRole === 'MEMBER' && card.roleKey === 'OWNER';
                    const isDisallowed = isBelowUserLevel || isMemberToOwner || !hasPeople;

                    let disabledReason = '';
                    if (!hasPeople) {
                      disabledReason = `No ${card.role.toLowerCase()}s yet`;
                    } else if (isMemberToOwner) {
                      disabledReason = 'Members cannot send to Owner';
                    } else if (isBelowUserLevel) {
                      disabledReason = 'Can only send to own level or above';
                    }

                    const CardIcon = card.icon;

                    return (
                      <button
                        key={card.roleKey}
                        type="button"
                        disabled={isDisallowed}
                        onClick={() => {
                          setSelectedRole(card.roleKey);
                          setTargetUserId(''); // reset specific user on role switch
                          setFormErrors((prev) => ({ ...prev, role: undefined }));
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          isDisallowed
                            ? 'opacity-40 cursor-not-allowed bg-muted/30 border-dashed border-border'
                            : isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary shadow-xs'
                            : 'border-border bg-background hover:bg-muted/50 hover:border-primary/50 text-foreground'
                        }`}
                      >
                        <CardIcon className={`h-5 w-5 mb-1.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-semibold">{card.role}</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {hasPeople ? `${card.count} ${card.count === 1 ? 'person' : 'people'}` : disabledReason}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Inline Red Validation Error */}
                {formErrors.role && (
                  <p className="text-[11px] text-destructive mt-1.5 font-medium flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {formErrors.role}
                  </p>
                )}
              </div>

              {/* Field 2: Recipient Preview Box (Requirement 1) */}
              {selectedRole && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      All {selectedRole.toLowerCase()}s will be notified
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {roleMembers[selectedRole].length} recipients
                    </Badge>
                  </div>

                  {/* Avatar Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {roleMembers[selectedRole].map((p) => {
                      const first = p.user?.firstName || p.firstName || '';
                      const last = p.user?.lastName || p.lastName || '';
                      const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
                      const fullName = `${first} ${last}`.trim() || p.user?.email || 'Member';

                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-1.5 bg-background border border-border/80 rounded-full py-0.5 px-2.5 text-[11px] font-medium text-foreground shadow-2xs"
                        >
                          <div className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                            {initials}
                          </div>
                          <span>{fullName}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Deliver to Dropdown */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Deliver to
                    </label>
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">
                        Anyone in {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()} group (first to accept)
                      </option>
                      {roleMembers[selectedRole].map((p) => {
                        const first = p.user?.firstName || p.firstName || '';
                        const last = p.user?.lastName || p.lastName || '';
                        const fullName = `${first} ${last}`.trim() || p.user?.email;
                        const desig = p.designation?.title ? ` - ${p.designation.title}` : '';
                        return (
                          <option key={p.id} value={p.userId || p.id}>
                            {fullName} {desig}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {/* Field 3: Request Title * (Required) (Requirement 1) */}
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Request title <span className="text-destructive">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  placeholder="e.g., Laptop screen replacement, Access to staging DB..."
                  value={requestTitle}
                  onChange={(e) => {
                    setRequestTitle(e.target.value);
                    if (e.target.value.trim()) {
                      setFormErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                  className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
                    formErrors.title
                      ? 'border-destructive focus:ring-destructive'
                      : 'border-input focus:ring-primary'
                  }`}
                />
                {/* Inline Red Validation Error */}
                {formErrors.title && (
                  <p className="text-[11px] text-destructive mt-1 font-medium flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {formErrors.title}
                  </p>
                )}
              </div>

              {/* Field 4: Category & Priority Side by Side (Requirement 1) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Field 5: Details Textarea with Optional Attachment (Requirement 1) */}
              <div>
                <label className="text-xs font-semibold text-foreground">Details</label>
                <textarea
                  rows={3}
                  placeholder="Provide context, requirements, equipment details, or justification..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />

                {/* Optional Attachment */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{attachmentName ? 'Change attachment' : 'Attach file (optional)'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setAttachmentName(file.name);
                      }}
                    />
                  </label>

                  {attachmentName && (
                    <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[11px]">
                      <span className="truncate max-w-[180px]">{attachmentName}</span>
                      <button
                        type="button"
                        onClick={() => setAttachmentName(null)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons: Cancel & Submit request (Requirement 1) */}
              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Configure Request Category
            </h2>
            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Security & Compliance, Legal Review"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Purpose of this category..."
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
