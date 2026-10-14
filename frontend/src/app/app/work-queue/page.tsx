'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Plus, ShieldAlert, Award, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkQueuePage() {
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', batchId: '', quantity: 1, currentStage: 'PROCESSING' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  const loadItems = async () => {
    if (!token || !wsId) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/work-items`, {
        headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
      });
      const data = await res.json();
      if (data.success) setWorkItems(data.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleCreateWorkItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BRANDING.apiUrl}/work-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Work Item Batch added to queue!');
      setShowModal(false);
      setNewItem({ title: '', batchId: '', quantity: 1, currentStage: 'PROCESSING' });
      loadItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdvanceStage = async (id: string, nextStage: string, nextStatus: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/work-items/${id}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ currentStage: nextStage, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Advanced batch to ${nextStage}`);
      loadItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Work Queue Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Process high-volume operational batches, transaction pipelines, and execution workflows
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Batch / Work Queue
        </Button>
      </div>

      {/* Pipeline Stage Columns Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {['PROCESSING', 'QA_REVIEW', 'REWORK', 'COMPLETED'].map((stage) => {
          const count = workItems.filter((w) => w.status === stage || w.currentStage === stage).length;
          return (
            <Card key={stage} className="border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{stage.replace('_', ' ')}</CardTitle>
                <div className="text-2xl font-bold text-foreground mt-1">{count} <span className="text-xs text-muted-foreground font-normal">batches</span></div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Work Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Work Queue Items</CardTitle>
          <CardDescription>Track processing stages, batch quantities, and throughput metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                  <th className="py-3 px-4">Batch / Work Item Title</th>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{item.title}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{item.batchId || '-'}</td>
                    <td className="py-3 px-4 text-foreground font-semibold">{item.quantity} units</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-mono text-xs">{item.currentStage || 'PROCESSING'}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={item.status === 'COMPLETED' ? 'success' : item.status === 'REWORK' ? 'destructive' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {item.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleAdvanceStage(
                              item.id,
                              item.currentStage === 'PROCESSING' ? 'QA_REVIEW' : 'COMPLETED',
                              item.currentStage === 'PROCESSING' ? 'QA_REVIEW' : 'COMPLETED',
                            )
                          }
                          className="h-7 text-xs gap-1"
                        >
                          Next Stage <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {workItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No operational work items in queue. Click "Add Batch / Work Queue" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader>
              <CardTitle>Add Work Item / Operational Batch</CardTitle>
              <CardDescription>Register a new operational queue entry</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateWorkItem}>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Batch Title / Name <span className="text-destructive font-semibold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Process Operational Batch #4092"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Batch / Reference ID</label>
                    <input
                      type="text"
                      value={newItem.batchId}
                      onChange={(e) => setNewItem({ ...newItem, batchId: e.target.value })}
                      placeholder="BATCH-4092"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Quantity (Units) <span className="text-destructive font-semibold ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit to Queue</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
