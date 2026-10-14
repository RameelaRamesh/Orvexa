'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  ShieldCheck,
  Package,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Filter,
  Info,
  Layers,
  ArrowUpRight,
  HelpCircle,
  FileSpreadsheet,
  FileCode,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'attendance' | 'leave' | 'quality' | 'assets'>('overview');

  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      preset: 'THIS_MONTH',
    };
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Data State
  const [overviewData, setOverviewData] = useState<any>(null);
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formula Info Modal
  const [selectedFormulaKey, setSelectedFormulaKey] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  // Load Overview Data
  const fetchOverview = async () => {
    if (!token || !wsId) return;
    setLoadingOverview(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);

      const res = await fetch(`${BRANDING.apiUrl}/analytics/overview?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load analytics overview');
      const payload = json.data !== undefined ? json.data : json;
      setOverviewData(payload);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load Drilldown Data
  const fetchDrilldown = async (category: string) => {
    if (!token || !wsId || category === 'overview') return;
    setLoadingDrilldown(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`${BRANDING.apiUrl}/analytics/drilldown/${category}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load drilldown report');
      const payload = json.data !== undefined ? json.data : json;
      setDrilldownData(payload);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoadingDrilldown(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    if (activeTab !== 'overview') {
      fetchDrilldown(activeTab);
    }
  }, [dateRange, statusFilter, priorityFilter]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      fetchDrilldown(activeTab);
    }
  }, [activeTab, searchQuery]);

  // Secure Export Action
  const handleExport = async (format: 'csv' | 'json') => {
    if (!token || !wsId) return;
    const category = activeTab === 'overview' ? 'tasks' : activeTab;
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);

      const res = await fetch(`${BRANDING.apiUrl}/analytics/export/${category}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.message || 'Export failed');
      }

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orvexa_${category}_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orvexa_${category}_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      toast.success(`${category.toUpperCase()} export downloaded successfully`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const kpis = overviewData?.kpis || overviewData?.data?.kpis;
  const metricDefs = overviewData?.metricDefinitions || overviewData?.data?.metricDefinitions || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-foreground">Operational Analytics & Reports</h1>
            <Badge variant="outline" className="text-xs font-mono">Live Scoped Data</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time cross-module metrics, deterministic formulas, drill-down tables, and verified data exports.
          </p>
        </div>

        {/* Global Date Range System */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOverview();
              if (activeTab !== 'overview') fetchDrilldown(activeTab);
            }}
            disabled={loadingOverview || loadingDrilldown}
            className="h-9 gap-1.5"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingOverview || loadingDrilldown ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          className="text-xs gap-1.5 h-8"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Overview & KPIs
        </Button>
        <Button
          variant={activeTab === 'tasks' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('tasks')}
          className="text-xs gap-1.5 h-8"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Work Items & Tasks
        </Button>
        <Button
          variant={activeTab === 'attendance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('attendance')}
          className="text-xs gap-1.5 h-8"
        >
          <Clock className="h-3.5 w-3.5" />
          Time & Attendance
        </Button>
        <Button
          variant={activeTab === 'leave' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('leave')}
          className="text-xs gap-1.5 h-8"
        >
          <Calendar className="h-3.5 w-3.5" />
          Leave Requests
        </Button>
        <Button
          variant={activeTab === 'quality' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('quality')}
          className="text-xs gap-1.5 h-8"
        >
          <Award className="h-3.5 w-3.5" />
          Quality & SLAs
        </Button>
        <Button
          variant={activeTab === 'assets' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('assets')}
          className="text-xs gap-1.5 h-8"
        >
          <Package className="h-3.5 w-3.5" />
          Physical Resources
        </Button>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchOverview} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* OVERVIEW TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Real KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Task Completion Rate */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Task Completion Rate
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedFormulaKey('taskCompletionRate')}
                  className="text-muted-foreground hover:text-foreground"
                  title="Formula Breakdown"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loadingOverview ? '—' : `${kpis?.tasks?.completionRate || 0}%`}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>
                    {kpis?.tasks?.completed || 0} completed of {kpis?.tasks?.total || 0} tasks
                  </span>
                  {kpis?.tasks?.overdue > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {kpis?.tasks?.overdue} overdue
                    </Badge>
                  )}
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, kpis?.tasks?.completionRate || 0)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Daily Productive Hours */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg Daily Work Hours
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedFormulaKey('averageWorkHours')}
                  className="text-muted-foreground hover:text-foreground"
                  title="Formula Breakdown"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loadingOverview ? '—' : `${kpis?.attendance?.averageDailyHours || 0}h`}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>Total {kpis?.attendance?.totalWorkHours || 0}h logged</span>
                  <Badge variant="outline" className="text-[10px]">
                    {kpis?.attendance?.totalSessions || 0} sessions
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((kpis?.attendance?.averageDailyHours || 0) / 8) * 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 3. Today's Presence */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Active Presence
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedFormulaKey('attendanceRate')}
                  className="text-muted-foreground hover:text-foreground"
                  title="Formula Breakdown"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loadingOverview ? '—' : `${kpis?.attendance?.presentToday || 0} Present`}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{kpis?.attendance?.activeClockedIn || 0} currently clocked in</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {kpis?.attendance?.totalMembers || 0} total active
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        kpis?.attendance?.totalMembers > 0
                          ? Math.min(100, (kpis.attendance.presentToday / kpis.attendance.totalMembers) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Quality Audit Score */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quality Audit Score
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedFormulaKey('averageQualityScore')}
                  className="text-muted-foreground hover:text-foreground"
                  title="Formula Breakdown"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loadingOverview
                    ? '—'
                    : kpis?.quality?.averageScore !== null
                    ? `${kpis?.quality?.averageScore}%`
                    : 'No Audits'}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>
                    {kpis?.quality?.passedAudits || 0} passed / {kpis?.quality?.reworkRequired || 0} rework
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {kpis?.quality?.totalAudits || 0} total audits
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, kpis?.quality?.averageScore || 0)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 5. SLA Adherence Health */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SLA Adherence Health
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedFormulaKey('slaAdherenceRate')}
                  className="text-muted-foreground hover:text-foreground"
                  title="Formula Breakdown"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loadingOverview ? '—' : `${kpis?.quality?.slaHealthPercentage || 100}%`}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{kpis?.quality?.slaBreaches || 0} active breaches</span>
                  <Badge
                    variant={kpis?.quality?.slaBreaches === 0 ? 'success' : 'destructive'}
                    className="text-[10px]"
                  >
                    {kpis?.quality?.slaBreaches === 0 ? 'HEALTHY' : 'WARNING'}
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, kpis?.quality?.slaHealthPercentage || 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 6. Physical Asset Utilization */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Asset Utilization
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedFormulaKey('assetUtilizationRate')}
                  className="text-muted-foreground hover:text-foreground"
                  title="Formula Breakdown"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loadingOverview ? '—' : `${kpis?.assets?.utilizationRate || 0}%`}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>
                    {kpis?.assets?.assigned || 0} assigned of {kpis?.assets?.total || 0} total
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {kpis?.assets?.available || 0} available
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, kpis?.assets?.utilizationRate || 0)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transparent Metric Definition Modal / Drawer */}
          {selectedFormulaKey && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
              <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">
                      {metricDefs[selectedFormulaKey]?.name || 'Metric Formula'}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFormulaKey(null)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Category
                    </label>
                    <div className="text-foreground font-medium">
                      {metricDefs[selectedFormulaKey]?.category}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Deterministic Mathematical Formula
                    </label>
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs text-foreground mt-1 break-words">
                      {metricDefs[selectedFormulaKey]?.formula}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Operational Meaning & Safeguards
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {metricDefs[selectedFormulaKey]?.description}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Unit of Measure
                    </label>
                    <Badge variant="outline" className="font-mono text-xs mt-1">
                      {metricDefs[selectedFormulaKey]?.unit}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => setSelectedFormulaKey(null)}>
                    Understood
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Visual Operational Distributions */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Work Item Status Distribution</CardTitle>
                <CardDescription>Live breakdown across operational stages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-semibold text-foreground">{kpis?.tasks?.completed || 0}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${kpis?.tasks?.total > 0 ? (kpis.tasks.completed / kpis.tasks.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-semibold text-foreground">{kpis?.tasks?.inProgress || 0}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${kpis?.tasks?.total > 0 ? (kpis.tasks.inProgress / kpis.tasks.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">In Review</span>
                    <span className="font-semibold text-foreground">{kpis?.tasks?.inReview || 0}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${kpis?.tasks?.total > 0 ? (kpis.tasks.inReview / kpis.tasks.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pending / To-Do</span>
                    <span className="font-semibold text-foreground">{kpis?.tasks?.todo || 0}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{
                        width: `${kpis?.tasks?.total > 0 ? (kpis.tasks.todo / kpis.tasks.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Quality & Compliance Distribution</CardTitle>
                <CardDescription>Audited pass rates and defect rework volume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Passed Audits</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {kpis?.quality?.passedAudits || 0}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${
                          kpis?.quality?.totalAudits > 0
                            ? (kpis.quality.passedAudits / kpis.quality.totalAudits) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Rework Required / Failed</span>
                    <span className="font-semibold text-rose-500">
                      {kpis?.quality?.reworkRequired || 0}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${
                          kpis?.quality?.totalAudits > 0
                            ? (kpis.quality.reworkRequired / kpis.quality.totalAudits) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pending Leave Approvals</span>
                  <Badge variant="secondary" className="font-mono">
                    {kpis?.leave?.pending || 0} requests
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Members on Leave Today</span>
                  <Badge variant="outline" className="font-mono">
                    {kpis?.leave?.onLeaveToday || 0} members
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* DRILLDOWN TABS CONTENT */}
      {activeTab !== 'overview' && (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <CardTitle className="text-lg capitalize">
                {activeTab === 'tasks'
                  ? 'Tasks & Work Items Drilldown'
                  : activeTab === 'attendance'
                  ? 'Attendance Sessions Drilldown'
                  : activeTab === 'leave'
                  ? 'Leave Applications Drilldown'
                  : activeTab === 'quality'
                  ? 'Quality Audit Reviews Drilldown'
                  : 'Company Assets Registry Drilldown'}
              </CardTitle>
              <CardDescription>
                {drilldownData?.total ?? drilldownData?.data?.total ?? (Array.isArray(drilldownData?.items) ? drilldownData.items.length : Array.isArray(drilldownData?.data?.items) ? drilldownData.data.items.length : 0)} scoped records matching current filters
              </CardDescription>
            </div>

            {/* Filter Controls & Secure Exports */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground w-44 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {activeTab === 'tasks' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="TODO">To-Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={exportLoading}
                className="h-8 text-xs gap-1.5"
                title="Download CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                Export CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
                disabled={exportLoading}
                className="h-8 text-xs gap-1.5"
                title="Download JSON"
              >
                <FileCode className="h-3.5 w-3.5 text-primary" />
                Export JSON
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {(() => {
              const items: any[] = Array.isArray(drilldownData?.items)
                ? drilldownData.items
                : Array.isArray(drilldownData?.data?.items)
                ? drilldownData.data.items
                : Array.isArray(drilldownData)
                ? drilldownData
                : [];

              if (loadingDrilldown) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">Loading drilldown report...</span>
                  </div>
                );
              }

              if (!drilldownData || items.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <h4 className="text-sm font-semibold text-foreground">No records match criteria</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      There are no records in this date window and filter scope. Adjust your date range or reset filters.
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-secondary/40">
                        {activeTab === 'tasks' && (
                          <>
                            <th className="py-3 px-4 font-semibold">Title</th>
                            <th className="py-3 px-4 font-semibold">Project</th>
                            <th className="py-3 px-4 font-semibold">Assignee</th>
                            <th className="py-3 px-4 font-semibold">Priority</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 font-semibold">Due Date</th>
                          </>
                        )}
                        {activeTab === 'attendance' && (
                          <>
                            <th className="py-3 px-4 font-semibold">Member</th>
                            <th className="py-3 px-4 font-semibold">Date</th>
                            <th className="py-3 px-4 font-semibold">Clock In</th>
                            <th className="py-3 px-4 font-semibold">Clock Out</th>
                            <th className="py-3 px-4 font-semibold">Work Hours</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                          </>
                        )}
                        {activeTab === 'leave' && (
                          <>
                            <th className="py-3 px-4 font-semibold">Member</th>
                            <th className="py-3 px-4 font-semibold">Leave Type</th>
                            <th className="py-3 px-4 font-semibold">Start Date</th>
                            <th className="py-3 px-4 font-semibold">End Date</th>
                            <th className="py-3 px-4 font-semibold">Duration</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                          </>
                        )}
                        {activeTab === 'quality' && (
                          <>
                            <th className="py-3 px-4 font-semibold">Work Item / Batch</th>
                            <th className="py-3 px-4 font-semibold">Reviewer</th>
                            <th className="py-3 px-4 font-semibold">Score</th>
                            <th className="py-3 px-4 font-semibold">Audit Status</th>
                            <th className="py-3 px-4 font-semibold">Feedback</th>
                            <th className="py-3 px-4 font-semibold">Date</th>
                          </>
                        )}
                        {activeTab === 'assets' && (
                          <>
                            <th className="py-3 px-4 font-semibold">Asset Name</th>
                            <th className="py-3 px-4 font-semibold">Asset Tag</th>
                            <th className="py-3 px-4 font-semibold">Category</th>
                            <th className="py-3 px-4 font-semibold">Custody</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {items.map((row: any) => (
                      <tr key={row.id} className="hover:bg-surface-secondary/50 transition-colors">
                        {activeTab === 'tasks' && (
                          <>
                            <td className="py-3 px-4 font-medium text-foreground">{row.title}</td>
                            <td className="py-3 px-4 text-muted-foreground">{row.projectName}</td>
                            <td className="py-3 px-4 text-foreground">{row.assigneeName}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  row.priority === 'URGENT' || row.priority === 'HIGH'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="text-[10px]"
                              >
                                {row.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={row.status === 'COMPLETED' ? 'success' : 'outline'}
                                className="text-[10px]"
                              >
                                {row.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono">
                              {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'None'}
                            </td>
                          </>
                        )}

                        {activeTab === 'attendance' && (
                          <>
                            <td className="py-3 px-4 font-medium text-foreground">{row.memberName}</td>
                            <td className="py-3 px-4 text-muted-foreground font-mono">
                              {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {new Date(row.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {row.clockOut
                                ? new Date(row.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Active'}
                            </td>
                            <td className="py-3 px-4 font-bold text-foreground">{row.totalWorkHours}h</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={row.status === 'PRESENT' ? 'success' : 'secondary'}
                                className="text-[10px]"
                              >
                                {row.status}
                              </Badge>
                            </td>
                          </>
                        )}

                        {activeTab === 'leave' && (
                          <>
                            <td className="py-3 px-4 font-medium text-foreground">{row.memberName}</td>
                            <td className="py-3 px-4 font-mono">{row.leaveType}</td>
                            <td className="py-3 px-4 text-muted-foreground font-mono">
                              {new Date(row.startDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono">
                              {new Date(row.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-foreground">{row.totalDays} days</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  row.status === 'APPROVED'
                                    ? 'success'
                                    : row.status === 'PENDING'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                                className="text-[10px]"
                              >
                                {row.status}
                              </Badge>
                            </td>
                          </>
                        )}

                        {activeTab === 'quality' && (
                          <>
                            <td className="py-3 px-4 font-medium text-foreground">{row.workItemTitle}</td>
                            <td className="py-3 px-4 text-muted-foreground">{row.reviewerName}</td>
                            <td className="py-3 px-4 font-bold text-foreground">{row.score}%</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={row.passStatus === 'PASSED' ? 'success' : 'destructive'}
                                className="text-[10px]"
                              >
                                {row.passStatus}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground truncate max-w-xs">
                              {row.feedback || 'No remarks'}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono">
                              {new Date(row.reviewedAt).toLocaleDateString()}
                            </td>
                          </>
                        )}

                        {activeTab === 'assets' && (
                          <>
                            <td className="py-3 px-4 font-medium text-foreground">{row.name}</td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">{row.assetTag}</td>
                            <td className="py-3 px-4 text-muted-foreground">{row.category || 'General'}</td>
                            <td className="py-3 px-4 text-foreground">{row.assignedToName}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={row.status === 'ASSIGNED' ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {row.status}
                              </Badge>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
