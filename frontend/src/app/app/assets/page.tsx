'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  HardDrive,
  Layers,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Plus,
  ArrowRight,
  ArrowRightLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  User,
  Users,
  Building,
  Tag,
  Wrench,
  ShieldAlert,
  Folder,
  FileCheck,
  Sparkles,
  ExternalLink,
  X,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'assets' | 'inventory' | 'movements' | 'documents'>('assets');
  const [assets, setAssets] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [assetFilterStatus, setAssetFilterStatus] = useState<string>('ALL');
  const [assetSearch, setAssetSearch] = useState<string>('');
  const [fileEntityFilter, setFileEntityFilter] = useState<string>('ALL');

  // Modals
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [showMoveStockModal, setShowMoveStockModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState<{
    type: 'ASSIGN' | 'TRANSFER' | 'RETURN' | 'MAINTENANCE' | 'RETIRE';
    asset: any;
  } | null>(null);

  // Form States
  const [assetForm, setAssetForm] = useState({
    name: '',
    assetTag: '',
    serialNumber: '',
    category: '',
    condition: 'EXCELLENT' as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
    location: 'Headquarters',
    cost: '',
    assignedToMembershipId: '',
  });

  const [movementForm, setMovementForm] = useState({
    itemId: '',
    movementType: 'INWARD' as 'INWARD' | 'OUTWARD' | 'TRANSFER' | 'ADJUSTMENT',
    quantity: 1,
    fromLocationId: '',
    toLocationId: '',
    reason: '',
  });

  const [lifecycleActionForm, setLifecycleActionForm] = useState({
    toMembershipId: '',
    toLocation: '',
    condition: 'GOOD' as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
    reason: '',
    notes: '',
    serviceProvider: '',
    cost: '',
    salvageValue: '',
  });

  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    entityType: 'general',
    entityId: '',
    isPublic: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const [assetRes, catRes, invRes, locRes, movRes, fileRes, pplRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/assets`, { headers }),
        fetch(`${BRANDING.apiUrl}/assets/categories`, { headers }),
        fetch(`${BRANDING.apiUrl}/inventory/items`, { headers }),
        fetch(`${BRANDING.apiUrl}/inventory/locations`, { headers }),
        fetch(`${BRANDING.apiUrl}/inventory/movements`, { headers }),
        fetch(`${BRANDING.apiUrl}/files`, { headers }),
        fetch(`${BRANDING.apiUrl}/people`, { headers }),
      ]);

      const assetData = await assetRes.json();
      const catData = await catRes.json();
      const invData = await invRes.json();
      const locData = await locRes.json();
      const movData = await movRes.json();
      const fileData = await fileRes.json();
      const pplData = await pplRes.json();

      if (assetData.success || Array.isArray(assetData)) setAssets(assetData.data || assetData || []);
      if (catData.success || Array.isArray(catData)) setAssetCategories(catData.data || catData || []);
      if (invData.success || Array.isArray(invData)) setInventoryItems(invData.data || invData || []);
      if (locData.success || Array.isArray(locData)) setLocations(locData.data || locData || []);
      if (movData.success || Array.isArray(movData)) setMovements(movData.data || movData || []);
      if (fileData.success || Array.isArray(fileData)) setFiles(fileData.data || fileData || []);
      if (pplData.success || Array.isArray(pplData)) setPeople(pplData.data || pplData || []);

      if (selectedAsset) {
        const fresh = (assetData.data || assetData || []).find((a: any) => a.id === selectedAsset.id);
        if (fresh) setSelectedAsset(fresh);
      }
    } catch (err: any) {
      console.error('Failed to load asset data:', err);
      toast.error('Failed to load asset and inventory records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/assets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...assetForm,
          cost: assetForm.cost ? Number(assetForm.cost) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create asset');

      toast.success(`Asset "${data.name || assetForm.name}" registered`);
      setShowCreateAssetModal(false);
      setAssetForm({
        name: '',
        assetTag: '',
        serialNumber: '',
        category: '',
        condition: 'EXCELLENT',
        location: 'Headquarters',
        cost: '',
        assignedToMembershipId: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error registering asset');
    }
  };

  const handleExecuteLifecycleAction = async () => {
    if (!showLifecycleModal) return;
    const { type, asset } = showLifecycleModal;
    const headers = getHeaders();

    try {
      let endpoint = '';
      let body: any = {};

      if (type === 'ASSIGN') {
        endpoint = `${BRANDING.apiUrl}/assets/${asset.id}/assign`;
        body = {
          toMembershipId: lifecycleActionForm.toMembershipId,
          condition: lifecycleActionForm.condition,
          location: lifecycleActionForm.toLocation,
          notes: lifecycleActionForm.notes,
        };
      } else if (type === 'TRANSFER') {
        endpoint = `${BRANDING.apiUrl}/assets/${asset.id}/transfer`;
        body = {
          toMembershipId: lifecycleActionForm.toMembershipId || undefined,
          toLocation: lifecycleActionForm.toLocation,
          reason: lifecycleActionForm.reason || 'Inter-department transfer',
          condition: lifecycleActionForm.condition,
        };
      } else if (type === 'RETURN') {
        endpoint = `${BRANDING.apiUrl}/assets/${asset.id}/return`;
        body = {
          condition: lifecycleActionForm.condition,
          returnLocation: lifecycleActionForm.toLocation || 'Central Inventory Storage',
          notes: lifecycleActionForm.notes,
        };
      } else if (type === 'MAINTENANCE') {
        endpoint = `${BRANDING.apiUrl}/assets/${asset.id}/maintenance`;
        body = {
          action: 'START',
          issueDescription: lifecycleActionForm.reason || 'Scheduled routine service',
          serviceProvider: lifecycleActionForm.serviceProvider,
          cost: lifecycleActionForm.cost ? Number(lifecycleActionForm.cost) : undefined,
        };
      } else if (type === 'RETIRE') {
        endpoint = `${BRANDING.apiUrl}/assets/${asset.id}/retire`;
        body = {
          reason: lifecycleActionForm.reason || 'End of economic life',
          salvageValue: lifecycleActionForm.salvageValue ? Number(lifecycleActionForm.salvageValue) : 0,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${type.toLowerCase()} asset`);

      toast.success(`Asset action "${type}" recorded successfully`);
      setShowLifecycleModal(null);
      setLifecycleActionForm({
        toMembershipId: '',
        toLocation: '',
        condition: 'GOOD',
        reason: '',
        notes: '',
        serviceProvider: '',
        cost: '',
        salvageValue: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update asset');
    }
  };

  const handleRecordStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementForm.itemId || !movementForm.reason.trim()) {
      toast.error('Item and movement reason are required');
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/inventory/movements`, {
        method: 'POST',
        headers,
        body: JSON.stringify(movementForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Movement rejected');

      toast.success(`Stock movement recorded: ${movementForm.movementType} (${movementForm.quantity})`);
      setShowMoveStockModal(false);
      setMovementForm({
        itemId: '',
        movementType: 'INWARD',
        quantity: 1,
        fromLocationId: '',
        toLocationId: '',
        reason: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record movement');
    }
  };

  const handleTriggerReplenishment = async (itemId: string, requestedQty: number = 20) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/inventory/items/${itemId}/replenish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requestedQuantity: requestedQty,
          reason: 'Low stock automatic threshold trigger',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to request replenishment');

      toast.success(`Replenishment Ticket ${data.ticketNumber} created!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error triggering replenishment');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error('Please choose a file');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const wsId = localStorage.getItem('activeWorkspaceId');

      // Convert file to base64 for reliable universal transmission
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch(`${BRANDING.apiUrl}/files/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            ...(wsId ? { 'x-workspace-id': wsId } : {}),
          },
          body: JSON.stringify({
            base64Data,
            originalName: uploadForm.file!.name,
            mimeType: uploadForm.file!.type || 'application/octet-stream',
            entityType: uploadForm.entityType,
            entityId: uploadForm.entityId || undefined,
            isPublic: uploadForm.isPublic,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'File upload failed');

        toast.success(`Uploaded: ${data.originalName || uploadForm.file!.name}`);
        setShowUploadModal(false);
        setUploadForm({ file: null, entityType: 'general', entityId: '', isPublic: false });
        loadData();
      };
      reader.readAsDataURL(uploadForm.file);
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/files/${fileId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete file');

      toast.success('File deleted');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting file');
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/files/${fileId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error generating download URL');

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        toast.info('File download URL unavailable');
      }
    } catch (err: any) {
      toast.error(err.message || 'Download error');
    }
  };

  // Helper getters
  const getMemberName = (memId?: string) => {
    if (!memId) return 'Unassigned';
    const p = people.find((item) => item.id === memId);
    if (!p) return 'Team Member';
    const first = p.user?.firstName || p.firstName || '';
    const last = p.user?.lastName || p.lastName || '';
    return `${first} ${last}`.trim() || p.user?.email || 'Member';
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-600 text-white text-[10px]">AVAILABLE</Badge>;
      case 'ASSIGNED':
        return <Badge className="bg-blue-600 text-white text-[10px]">ASSIGNED</Badge>;
      case 'UNDER_MAINTENANCE':
        return <Badge className="bg-amber-500 text-white text-[10px]">MAINTENANCE</Badge>;
      case 'DISPOSED':
        return <Badge variant="secondary" className="text-muted-foreground text-[10px]">DISPOSED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
    }
  };

  const getConditionBadge = (c: string) => {
    switch (c) {
      case 'EXCELLENT':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">EXCELLENT</Badge>;
      case 'GOOD':
        return <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]">GOOD</Badge>;
      case 'FAIR':
        return <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">FAIR</Badge>;
      case 'POOR':
        return <Badge variant="destructive" className="text-[10px]">POOR</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{c}</Badge>;
    }
  };

  const filteredAssets = assets.filter((a) => {
    if (assetFilterStatus !== 'ALL' && a.status !== assetFilterStatus) return false;
    if (assetSearch.trim()) {
      const q = assetSearch.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const lowStockCount = inventoryItems.filter((i) => i.isLowStock).length;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Assets, Inventory & Native Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Hardware lifecycle tracking, multi-location stock movements, low-stock alerts, and secure document vault.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMoveStockModal(true)}>
            <ArrowRightLeft className="mr-1.5 h-4 w-4" />
            Move Stock
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
            <UploadCloud className="mr-1.5 h-4 w-4" />
            Upload Document
          </Button>
          <Button size="sm" onClick={() => setShowCreateAssetModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Register Asset
          </Button>
        </div>
      </div>

      {/* Top Nav Tabs */}
      <div className="flex items-center gap-4 border-b border-border pb-2 text-sm">
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'assets'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          Company Assets ({assets.length})
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
          Stock & Locations ({inventoryItems.length})
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
              {lowStockCount} Low
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'movements'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          Movement Ledger ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'documents'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Document Vault ({files.length})
        </button>
      </div>

      {/* TAB 1: COMPANY ASSETS */}
      {activeTab === 'assets' && (
        <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Asset List Column */}
          <div className="col-span-6 flex flex-col border-r border-border bg-muted/20">
            {/* Filter Bar */}
            <div className="p-3 border-b border-border flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search asset tag, name, or serial..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground"
                />
              </div>
              <select
                value={assetFilterStatus}
                onChange={(e) => setAssetFilterStatus(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
                <option value="DISPOSED">Disposed</option>
              </select>
            </div>

            {/* Assets Table */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading assets...</div>
              ) : filteredAssets.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No assets found.</div>
              ) : (
                filteredAssets.map((a) => {
                  const isSelected = selectedAsset?.id === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAsset(a)}
                      className={`cursor-pointer rounded-lg p-3 border transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 shadow-xs'
                          : 'bg-background hover:bg-muted/40 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-primary">{a.assetTag}</span>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(a.status)}
                          {getConditionBadge(a.condition || 'GOOD')}
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-foreground truncate">{a.name}</h4>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {getMemberName(a.assignedToMembershipId)}
                        </span>
                        <span>{a.location || 'Headquarters'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Asset Details & Lifecycle Drawer */}
          <div className="col-span-6 flex flex-col h-full bg-background overflow-y-auto">
            {selectedAsset ? (
              <div className="p-4 space-y-6">
                {/* Header */}
                <div className="border-b border-border pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-primary">{selectedAsset.assetTag}</span>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(selectedAsset.status)}
                      {getConditionBadge(selectedAsset.condition || 'GOOD')}
                    </div>
                  </div>
                  <h2 className="text-base font-bold text-foreground">{selectedAsset.name}</h2>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>Category: {selectedAsset.category || 'General'}</span>
                    <span>•</span>
                    <span>Serial: {selectedAsset.serialNumber || 'N/A'}</span>
                    <span>•</span>
                    <span>Location: {selectedAsset.location || 'Headquarters'}</span>
                  </div>
                </div>

                {/* Quick Lifecycle Action Buttons */}
                <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lifecycle Actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAsset.status !== 'DISPOSED' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowLifecycleModal({ type: 'ASSIGN', asset: selectedAsset })}
                          className="text-xs h-7"
                        >
                          <User className="mr-1 h-3 w-3" />
                          Assign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowLifecycleModal({ type: 'TRANSFER', asset: selectedAsset })}
                          className="text-xs h-7"
                        >
                          <ArrowRightLeft className="mr-1 h-3 w-3" />
                          Transfer
                        </Button>
                        {selectedAsset.status === 'ASSIGNED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLifecycleModal({ type: 'RETURN', asset: selectedAsset })}
                            className="text-xs h-7"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Return
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowLifecycleModal({ type: 'MAINTENANCE', asset: selectedAsset })}
                          className="text-xs h-7"
                        >
                          <Wrench className="mr-1 h-3 w-3" />
                          Maintenance
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowLifecycleModal({ type: 'RETIRE', asset: selectedAsset })}
                          className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Retire
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Lifecycle Audit History */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Asset Event History & Chain of Custody
                  </h3>
                  <div className="space-y-3 border-l-2 border-border pl-3 ml-2">
                    {selectedAsset.lifecycleHistory?.map((evt: any, i: number) => (
                      <div key={i} className="relative text-xs">
                        <div className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span>{evt.eventType}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{evt.notes}</p>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Actor: {evt.actorName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <HardDrive className="h-12 w-12 mb-3 opacity-30" />
                <h3 className="text-base font-semibold text-foreground">Select an asset</h3>
                <p className="text-xs max-w-sm mt-1">
                  Choose a company asset on the left to inspect assignment details, chain of custody, and condition logs.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & STOCK LOCATIONS */}
      {activeTab === 'inventory' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Low Stock Warning Banner */}
          {lowStockCount > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <h4 className="font-bold text-foreground">Low Stock Threshold Breach Alert</h4>
                  <p className="text-muted-foreground mt-0.5">
                    {lowStockCount} inventory items have dropped to or below their configured reorder points.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Locations Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <Card key={loc.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{loc.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">{loc.code}</Badge>
                  </div>
                  <CardDescription className="text-xs">{loc.addressOrZone || 'Standard Zone'}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                  Status: {loc.isDefault ? 'Default Hub' : 'Active Stockroom'}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Inventory Items Table */}
          <Card>
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Inventory Items & Stock Levels</CardTitle>
                <CardDescription className="text-xs">
                  Real-time quantities, location breakdown, and replenishment triggers.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowMoveStockModal(true)}>
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                Move Stock
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border uppercase text-muted-foreground bg-muted/40 text-[10px]">
                    <th className="py-2.5 px-4">Item Code</th>
                    <th className="py-2.5 px-4">Item Name</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-center">Reorder Point</th>
                    <th className="py-2.5 px-4 text-center">Total Stock</th>
                    <th className="py-2.5 px-4">Location Breakdown</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-primary">{item.code}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{item.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                      <td className="py-3 px-4 text-center font-mono">{item.reorderThreshold}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold ${
                            item.isLowStock ? 'text-destructive font-mono' : 'text-emerald-600 font-mono'
                          }`}
                        >
                          {item.totalQuantityOnHand} {item.unit}
                        </span>
                        {item.isLowStock && (
                          <Badge variant="destructive" className="ml-2 text-[9px] py-0">LOW</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.locationQuantities || {}).map(([locId, qty]) => {
                            const l = locations.find((x) => x.id === locId);
                            return (
                              <Badge key={locId} variant="outline" className="text-[10px]">
                                {l?.name || locId}: {String(qty)}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTriggerReplenishment(item.id)}
                          className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Replenish
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: MOVEMENT LEDGER */}
      {activeTab === 'movements' && (
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Stock Movement Audit Ledger</CardTitle>
              <CardDescription className="text-xs">
                Auditable transaction history of inward receipts, issues, location transfers, and physical adjustments.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh Ledger
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border uppercase text-muted-foreground bg-muted/40 text-[10px]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Movement Type</th>
                  <th className="py-2.5 px-4">Item</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4">From / To Route</th>
                  <th className="py-2.5 px-4 text-center">Balance Delta</th>
                  <th className="py-2.5 px-4">Reason & Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPlus = m.movementType === 'INWARD';
                    const isMinus = m.movementType === 'OUTWARD';
                    return (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {new Date(m.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] ${
                              isPlus
                                ? 'bg-emerald-600 text-white'
                                : isMinus
                                ? 'bg-destructive text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {m.movementType}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{m.itemName}</td>
                        <td className="py-3 px-4 text-center font-bold font-mono">
                          {isPlus ? `+${m.quantity}` : isMinus ? `-${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {m.fromLocationName || '-'} &rarr; {m.toLocationName || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                          {m.balanceBefore} &rarr; <strong>{m.balanceAfter}</strong>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{m.reason}</div>
                          <div className="text-[10px] text-muted-foreground">By {m.actorName}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: DOCUMENT & ATTACHMENT VAULT */}
      {activeTab === 'documents' && (
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Native Document & Attachment Vault</CardTitle>
              <CardDescription className="text-xs">
                Secure file storage, pre-signed temporary downloads, MIME type validation, and security auditing.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowUploadModal(true)}>
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
              Upload Document
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border uppercase text-muted-foreground bg-muted/40 text-[10px]">
                  <th className="py-2.5 px-4">Document Name</th>
                  <th className="py-2.5 px-4">MIME Type</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4">Linked Entity</th>
                  <th className="py-2.5 px-4">Uploaded Date</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No files uploaded yet.
                    </td>
                  </tr>
                ) : (
                  files.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate max-w-xs">{f.originalName}</span>
                          {f.isPublic && (
                            <Badge variant="outline" className="text-[9px] py-0">Public</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">{f.mimeType}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {(f.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-4">
                        {f.entityType ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {f.entityType} {f.entityId ? `#${f.entityId.slice(0, 6)}` : ''}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(f.id)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                          title="Download file with secure pre-signed token"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFile(f.id)}
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* MODAL: REGISTER ASSET */}
      {showCreateAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              Register Company Asset
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add a physical hardware or equipment record into the organization catalog.
            </p>

            <form onSubmit={handleCreateAsset} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro M3 16-inch, Herman Miller Aeron Chair"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Asset Tag</label>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate (AST-...)"
                    value={assetForm.assetTag}
                    onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Serial Number</label>
                  <input
                    type="text"
                    placeholder="Hardware serial number"
                    value={assetForm.serialNumber}
                    onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Category</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Category --</option>
                    {assetCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Condition</label>
                  <select
                    value={assetForm.condition}
                    onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Initial Assignee (Optional)</label>
                <select
                  value={assetForm.assignedToMembershipId}
                  onChange={(e) => setAssetForm({ ...assetForm, assignedToMembershipId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Available in Central Pool --</option>
                  {people.map((p) => {
                    const first = p.user?.firstName || p.firstName || '';
                    const last = p.user?.lastName || p.lastName || '';
                    const name = `${first} ${last}`.trim() || p.user?.email || 'Member';
                    return (
                      <option key={p.id} value={p.id}>
                        {name} ({p.accessRole || 'Member'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateAssetModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVE STOCK */}
      {showMoveStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Record Stock Movement
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Issue stock, receive shipments, transfer between locations, or record inventory adjustments.
            </p>

            <form onSubmit={handleRecordStockMovement} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Select Item</label>
                <select
                  required
                  value={movementForm.itemId}
                  onChange={(e) => setMovementForm({ ...movementForm, itemId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  <option value="">-- Choose Item --</option>
                  {inventoryItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.totalQuantityOnHand} {i.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Movement Type</label>
                  <select
                    value={movementForm.movementType}
                    onChange={(e) => setMovementForm({ ...movementForm, movementType: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="INWARD">INWARD (Receive)</option>
                    <option value="OUTWARD">OUTWARD (Issue/Consume)</option>
                    <option value="TRANSFER">TRANSFER (Location Move)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Count Correction)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>

              {(movementForm.movementType === 'OUTWARD' || movementForm.movementType === 'TRANSFER') && (
                <div>
                  <label className="text-xs font-medium text-foreground">From Location</label>
                  <select
                    value={movementForm.fromLocationId}
                    onChange={(e) => setMovementForm({ ...movementForm, fromLocationId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="">-- Source Location --</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(movementForm.movementType === 'INWARD' || movementForm.movementType === 'TRANSFER') && (
                <div>
                  <label className="text-xs font-medium text-foreground">To Location</label>
                  <select
                    value={movementForm.toLocationId}
                    onChange={(e) => setMovementForm({ ...movementForm, toLocationId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="">-- Destination Location --</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground">Reason / Reference Ticket</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PO-8921 received, restock pantry, broken unit written off"
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowMoveStockModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Confirm Movement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIFECYCLE ACTION (ASSIGN, TRANSFER, RETURN, MAINTENANCE, RETIRE) */}
      {showLifecycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              {showLifecycleModal.type} Asset: {showLifecycleModal.asset.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Tag: {showLifecycleModal.asset.assetTag}
            </p>

            <div className="mt-4 space-y-3">
              {(showLifecycleModal.type === 'ASSIGN' || showLifecycleModal.type === 'TRANSFER') && (
                <div>
                  <label className="text-xs font-medium text-foreground">Assignee / Target Member</label>
                  <select
                    value={lifecycleActionForm.toMembershipId}
                    onChange={(e) => setLifecycleActionForm({ ...lifecycleActionForm, toMembershipId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="">-- Choose Member --</option>
                    {people.map((p) => {
                      const first = p.user?.firstName || p.firstName || '';
                      const last = p.user?.lastName || p.lastName || '';
                      const name = `${first} ${last}`.trim() || p.user?.email || 'Member';
                      return (
                        <option key={p.id} value={p.id}>
                          {name} ({p.accessRole || 'Member'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground">Condition</label>
                <select
                  value={lifecycleActionForm.condition}
                  onChange={(e) => setLifecycleActionForm({ ...lifecycleActionForm, condition: e.target.value as any })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Floor 3 Desk 42, Server Lab, Remote"
                  value={lifecycleActionForm.toLocation}
                  onChange={(e) => setLifecycleActionForm({ ...lifecycleActionForm, toLocation: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Notes / Reason</label>
                <textarea
                  rows={2}
                  placeholder="Reason, handover notes, or condition assessment..."
                  value={lifecycleActionForm.reason}
                  onChange={(e) => setLifecycleActionForm({ ...lifecycleActionForm, reason: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowLifecycleModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleExecuteLifecycleAction}>
                Confirm {showLifecycleModal.type}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-primary" />
              Upload Document to Secure Vault
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Supports PDFs, Word docs, spreadsheets, images, and archives up to 25 MB.
            </p>

            <form onSubmit={handleFileUpload} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Select File</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadForm({ ...uploadForm, file: e.target.files[0] });
                    }
                  }}
                  className="mt-1 w-full text-xs text-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Link to Entity</label>
                  <select
                    value={uploadForm.entityType}
                    onChange={(e) => setUploadForm({ ...uploadForm, entityType: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="general">General Vault</option>
                    <option value="asset">Asset Record</option>
                    <option value="request">Service Request</option>
                    <option value="work_item">Work Item</option>
                    <option value="project">Project</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Entity ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Asset ID, Ticket ID"
                    value={uploadForm.entityId}
                    onChange={(e) => setUploadForm({ ...uploadForm, entityId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={uploadForm.isPublic}
                  onChange={(e) => setUploadForm({ ...uploadForm, isPublic: e.target.checked })}
                  className="rounded border-input text-primary"
                />
                <label htmlFor="isPublic" className="text-xs text-muted-foreground cursor-pointer">
                  Public document (accessible without signed URL)
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!uploadForm.file}>
                  Upload File
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
