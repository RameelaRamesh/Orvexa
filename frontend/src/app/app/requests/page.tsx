'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Inbox,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Package,
  Layers,
  ArrowRight,
  User,
  Users,
  Search,
  Check,
  X,
  FileText,
  MessageSquare,
  AlertCircle,
  Tag,
  Settings,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  defaultResponsibleTeamId?: string;
  slaHours?: number;
}

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  quantityOnHand: number;
  unit: string;
  reorderPoint: number;
}

interface ServiceRequest {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  categoryId: string;
  requesterMembershipId: string;
  ownerMembershipId?: string;
  responsibleTeamId?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  dueDate?: string;
  attachments?: Array<{ name: string; url: string }>;
  comments?: Array<{
    id: string;
    membershipId: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
  activityTimeline?: Array<{
    action: string;
    actorMembershipId: string;
    timestamp: string;
    notes?: string;
  }>;
  replenishmentItems?: Array<{
    inventoryItemId: string;
    requestedQuantity: number;
    fulfilledQuantity?: number;
  }>;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
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
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReplenishPresetModal, setShowReplenishPresetModal] = useState(false);

  // Action states
  const [commentText, setCommentText] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalatePrompt, setShowEscalatePrompt] = useState(false);

  // Create Request Form State
  const [reqForm, setReqForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    responsibleTeamId: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    dueDate: '',
    replenishmentItems: [] as Array<{ inventoryItemId: string; requestedQuantity: number }>,
  });

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
      if (catData.success) setCategories(catData.data || []);
      if (invData.success) setInventory(invData.data || []);
      if (teamData.success) setTeams(teamData.data || []);
      if (peopleData.success) setPeople(peopleData.data || []);

      if (meData.success && meData.data) {
        const mem = meData.data.memberships?.find((m: any) => m.workspaceId === wsId);
        if (mem) setCurrentMembershipId(mem.id);
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

  const handleCreateRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reqForm.title.trim() || !reqForm.categoryId) {
      toast.error('Title and category are required');
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request');

      toast.success(`Request ${data.data.ticketNumber} submitted successfully`);
      setShowCreateModal(false);
      setReqForm({
        title: '',
        description: '',
        categoryId: '',
        responsibleTeamId: '',
        priority: 'MEDIUM',
        dueDate: '',
        replenishmentItems: [],
      });

      loadData();
      setSelectedRequest(data.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    }
  };

  // Preset quick submission for the Phase 8 tissue & snack replenishment test scenario
  const handleLaunchReplenishScenario = async () => {
    const facilitiesCat = categories.find(
      (c) => c.code === 'FACILITIES_SUPPLIES' || c.name.toLowerCase().includes('supplies') || c.name.toLowerCase().includes('facilities'),
    );
    const catId = facilitiesCat ? facilitiesCat.id : categories[0]?.id || '';

    // Pick tissue and snack inventory items
    const tissue = inventory.find((i) => i.code === 'TISSUE_BOXES' || i.name.toLowerCase().includes('tissue'));
    const snack = inventory.find((i) => i.code === 'SNACK_PACKS' || i.name.toLowerCase().includes('snack'));

    const items: any[] = [];
    if (tissue) items.push({ inventoryItemId: tissue.id, requestedQuantity: 5 });
    if (snack) items.push({ inventoryItemId: snack.id, requestedQuantity: 10 });

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Urgent Office Supplies & Breakroom Snacks Replenishment',
          description: 'Requesting replenishment of 5 tissue boxes for conference rooms and 10 snack packs for main pantry.',
          categoryId: catId,
          priority: 'HIGH',
          replenishmentItems: items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create replenishment request');

      toast.success(`Test Scenario Request ${data.data.ticketNumber} created!`);
      setShowReplenishPresetModal(false);
      loadData();
      setSelectedRequest(data.data);
    } catch (err: any) {
      toast.error(err.message || 'Error launching test scenario');
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
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    }
  };

  const handleAcknowledge = async (requestId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/${requestId}/acknowledge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notes: actionNotes || 'Acknowledged and assigned.' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to acknowledge');

      toast.success('Request acknowledged and assigned to you');
      setActionNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error acknowledging request');
    }
  };

  const handleFulfill = async (requestId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/requests/${requestId}/fulfill`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fulfillmentNotes: actionNotes || 'Replenished items delivered to breakroom and desks. Stock deducted.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fulfill');

      toast.success('Request fulfilled! Inventory stock levels updated.');
      setActionNotes('');
      loadData();
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
        body: JSON.stringify({ feedback: actionNotes || 'Satisfactorily resolved. Verified by requester.' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to close');

      toast.success('Request closed successfully');
      setActionNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error closing request');
    }
  };

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

      toast.success('Request escalated to URGENT priority');
      setEscalateReason('');
      setShowEscalatePrompt(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error escalating request');
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
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error posting comment');
    }
  };

  const getMemberName = (memId?: string) => {
    if (!memId) return 'Unassigned';
    const p = people.find((item) => item.id === memId);
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
    return cat ? cat.name : 'General Request';
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

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && r.categoryId !== categoryFilter) return false;
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
            Internal Requests, Tickets & Fulfillment
          </h1>
          <p className="text-sm text-muted-foreground">
            Universal ticket engine, team queues, replenishment fulfillment, and notification auditing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReplenishPresetModal(true)}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Replenishment Test Scenario
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Submit Request
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

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
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

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading requests...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No requests found.</div>
              ) : (
                filteredRequests.map((r) => {
                  const isSelected = selectedRequest?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRequest(r)}
                      className={`w-full text-left rounded-lg p-3 transition-all border ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 shadow-xs'
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
                        <span>{getCategoryName(r.categoryId)}</span>
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
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Requester: {getMemberName(selectedRequest.requesterMembershipId)}</span>
                      <span>•</span>
                      <span>Assigned: {getMemberName(selectedRequest.ownerMembershipId)}</span>
                      <span>•</span>
                      <span>Routing: {getTeamName(selectedRequest.responsibleTeamId)}</span>
                    </div>
                  </div>

                  {/* Escalate button */}
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

                {/* Escalation Prompt if active */}
                {showEscalatePrompt && (
                  <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Reason for escalation (e.g. VIP client impacted, blocking production)"
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      className="flex-1 rounded border border-amber-300 bg-background px-3 py-1.5 text-xs"
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

                  {/* Replenishment Items Section if present */}
                  {selectedRequest.replenishmentItems && selectedRequest.replenishmentItems.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-primary" />
                        Requested Supplies / Inventory Replenishment
                      </h3>
                      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                        {selectedRequest.replenishmentItems.map((item, idx) => {
                          const invItem = inventory.find((i) => i.id === item.inventoryItemId);
                          return (
                            <div key={idx} className="p-3 bg-card flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-foreground">
                                  {invItem ? invItem.name : 'Inventory Item'}
                                </span>
                                <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                                  ({invItem?.code || item.inventoryItemId})
                                </span>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  Available in Stock:{' '}
                                  <strong className={invItem && invItem.quantityOnHand < 5 ? 'text-destructive' : 'text-foreground'}>
                                    {invItem ? `${invItem.quantityOnHand} ${invItem.unit}` : 'N/A'}
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

                  {/* Action Bar for Transitioning States */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      Lifecycle Action & Fulfillments
                    </h3>

                    <input
                      type="text"
                      placeholder="Add action notes or fulfillment remarks..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {selectedRequest.status === 'SUBMITTED' && (
                        <Button
                          size="sm"
                          onClick={() => handleAcknowledge(selectedRequest.id)}
                          className="text-xs"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Acknowledge & Take Ownership
                        </Button>
                      )}

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
                          This request has been fully resolved, verified, and closed.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline */}
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
                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.notes}</p>
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
                <h3 className="text-base font-semibold text-foreground">Select a request ticket</h3>
                <p className="text-xs max-w-sm mt-1">
                  Choose an internal request from the queue on the left to view details, stock fulfillment,
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
              const isLowStock = item.quantityOnHand <= item.reorderPoint;
              return (
                <Card key={item.id} className={isLowStock ? 'border-amber-500/50 bg-amber-500/5' : ''}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {item.code}
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
                        {item.quantityOnHand} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reorder Point: {item.reorderPoint}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Configured Categories */}
      {activeTab === 'categories' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Request types and categories configured for this organization. No hardcoded templates or mandatory presets.
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
                      {cat.code}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {cat.description || 'Configurable internal request type.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-1">
                  <div>
                    Default Team: <span className="text-foreground font-medium">{getTeamName(cat.defaultResponsibleTeamId)}</span>
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

      {/* Modal: Submit Request */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Inbox className="h-4 w-4 text-primary" />
              Submit Service Request
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Create an internal request. It will be routed according to category rules.
            </p>

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Request Title</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of request..."
                  value={reqForm.title}
                  onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Category</label>
                  <select
                    required
                    value={reqForm.categoryId}
                    onChange={(e) => setReqForm({ ...reqForm, categoryId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Priority</label>
                  <select
                    value={reqForm.priority}
                    onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide context, requirements, location, or details..."
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Replenishment Scenario Launcher */}
      {showReplenishPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-base font-semibold text-foreground">Replenishment Test Scenario</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This scenario verifies ORVEXA Phase 8 internal request fulfillment:
            </p>

            <div className="my-4 rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>5 Tissue Boxes</strong> & <strong>10 Snack Packs</strong> requested
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>Auto-routed to <strong>Facilities & Operations Queue</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Fulfillment automatically updates stock in inventory catalog</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReplenishPresetModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleLaunchReplenishScenario}>
                Create & Execute Scenario
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Configure Request Category
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Define a new category and its routing team according to your organization's structure.
            </p>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT Equipment, Office Maintenance, HR Inquiries"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Category Code</label>
                <input
                  type="text"
                  placeholder="e.g. IT_EQUIPMENT (leave blank to auto-generate)"
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Default Responsible Team</label>
                <select
                  value={catForm.defaultResponsibleTeamId}
                  onChange={(e) => setCatForm({ ...catForm, defaultResponsibleTeamId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- General Queue (No Team) --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">SLA Target (Hours)</label>
                <input
                  type="number"
                  min={1}
                  value={catForm.slaHours}
                  onChange={(e) => setCatForm({ ...catForm, slaHours: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
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
