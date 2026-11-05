'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QualityPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    workItemId: '',
    score: 95,
    maxScore: 100,
    passStatus: 'PASSED',
    feedback: '',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  const loadData = async () => {
    if (!token || !wsId) return;
    try {
      const [revRes, wiRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/quality`, { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId } }),
        fetch(`${BRANDING.apiUrl}/work-items`, { headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId } }),
      ]);

      const revData = await revRes.json();
      const wiData = await wiRes.json();

      if (revData.success) setReviews(revData.data || []);
      if (wiData.success) setWorkItems(wiData.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BRANDING.apiUrl}/quality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Quality Audit review submitted!');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quality Scorecard & SLA Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit work item accuracy, track defects, trigger rework loops, and manage breach thresholds
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Conduct Quality Audit
        </Button>
      </div>

      {/* Quality Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Audit History</CardTitle>
          <CardDescription>Scorecards submitted across operational work items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                  <th className="py-3 px-4">Batch / Work Item</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Audit Result</th>
                  <th className="py-3 px-4">Feedback</th>
                  <th className="py-3 px-4">Reviewed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-secondary/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">{r.workItem?.title || 'Batch Item'}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {r.reviewer?.user?.firstName} {r.reviewer?.user?.lastName}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {r.score} / {r.maxScore}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={r.passStatus === 'PASSED' ? 'success' : 'destructive'}>
                        {r.passStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{r.feedback || 'None'}</td>
                    <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                      {new Date(r.reviewedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No quality reviews recorded yet. Click "Conduct Quality Audit" to audit a work item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader>
              <CardTitle>Conduct Quality Audit</CardTitle>
              <CardDescription>Grade accuracy and trigger rework if needed</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitReview}>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Select Work Item / Batch <span className="text-destructive font-semibold ml-0.5">*</span>
                  </label>
                  <select
                    required
                    value={reviewForm.workItemId}
                    onChange={(e) => setReviewForm({ ...reviewForm, workItemId: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                  >
                    <option value="">Select Work Item</option>
                    {workItems.map((w) => (
                      <option key={w.id} value={w.id}>{w.title} ({w.quantity} units)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Accuracy Score (%) <span className="text-destructive font-semibold ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={reviewForm.score}
                      onChange={(e) => setReviewForm({ ...reviewForm, score: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Audit Verdict</label>
                    <select
                      value={reviewForm.passStatus}
                      onChange={(e) => setReviewForm({ ...reviewForm, passStatus: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                    >
                      <option value="PASSED">Passed (Pass)</option>
                      <option value="REWORK_REQUIRED">Rework Required</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Auditor Feedback / Defects</label>
                  <textarea
                    value={reviewForm.feedback}
                    onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                    placeholder="Enter audit observations..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1 h-20"
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Audit</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
