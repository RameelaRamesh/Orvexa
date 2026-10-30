'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Users,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);
  const [analyticsOverview, setAnalyticsOverview] = useState<any>(null);
  const [dismissOnboardingBanner, setDismissOnboardingBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const wsId = localStorage.getItem('activeWorkspaceId');

    if (!token || !wsId) return;

    const fetchData = async () => {
      try {
        // Fetch Profile, Attendance, Tasks, Onboarding Status, and Analytics in parallel
        const [profRes, attRes, taskRes, onbRes, analyticsRes] = await Promise.all([
          fetch(`${BRANDING.apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BRANDING.apiUrl}/time/today`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/tasks`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/workspaces/onboarding/status`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/analytics/overview`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
        ]);

        const profData = await profRes.json();
        const attData = await attRes.json();
        const taskData = await taskRes.json();
        const onbData = await onbRes.json();
        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;

        if (profData.success) {
          setProfile(profData.data);
          const currentMem = profData.data.memberships?.find((m: any) => m.workspaceId === wsId);
          setActiveWorkspace(currentMem);
        }

        if (attData.success) setTodayAttendance(attData.data);
        if (taskData.success) setTasks(taskData.data || []);
        if (onbData.success || onbData.data) {
          setOnboardingStatus(onbData.data || onbData);
        }
        if (analyticsData) {
          setAnalyticsOverview(analyticsData);
        }
      } catch (err: any) {
        console.error('Home data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClockIn = async () => {
    const token = localStorage.getItem('accessToken');
    const wsId = localStorage.getItem('activeWorkspaceId');
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Clocked in successfully');
      setTodayAttendance(data.data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleClockOut = async () => {
    const token = localStorage.getItem('accessToken');
    const wsId = localStorage.getItem('activeWorkspaceId');
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Clocked out successfully');
      setTodayAttendance(data.data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const role = activeWorkspace?.accessRole || 'MEMBER';
  const enabledModules: string[] = activeWorkspace?.workspace?.settings?.enabledModules || [
    'people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'quality', 'sla', 'settings'
  ];
  const isAttendanceEnabled = enabledModules.includes('attendance') || enabledModules.includes('time');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Welcome back, {profile?.firstName || 'User'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Role: <span className="font-semibold text-foreground">{role === 'ADMIN' ? 'HR EXECUTIVE' : role}</span> • Designation:{' '}
            <span className="font-semibold text-foreground">{activeWorkspace?.designation?.title || 'Team Member'}</span> • Department:{' '}
            <span className="font-semibold text-foreground">{activeWorkspace?.department?.name || 'General'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Apply Leave Quick Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/app/time?tab=leave')}
            className="h-10 text-xs gap-1.5 border-border bg-card shadow-sm hover:bg-muted"
          >
            <Calendar className="h-4 w-4 text-primary" />
            <span>Apply Leave / PTO</span>
          </Button>

          {/* Quick Attendance Widget */}
          {isAttendanceEnabled && (
            <div className="flex items-center gap-3 bg-card border border-border p-2.5 rounded-lg shadow-sm">
              <Clock className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground">Today's Presence</span>
                <span className="text-xs font-bold text-foreground">
                  {todayAttendance ? (todayAttendance.clockOut ? 'Clocked Out' : 'Active Clock-In') : 'Not Clocked In'}
                </span>
              </div>
              {todayAttendance && !todayAttendance.clockOut ? (
                <Button size="sm" variant="destructive" onClick={handleClockOut} className="h-8 text-xs">
                  Clock Out
                </Button>
              ) : (
                <Button size="sm" onClick={handleClockIn} disabled={!!todayAttendance?.clockOut} className="h-8 text-xs">
                  Clock In
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actionable Onboarding Setup Reminder Card */}
      {onboardingStatus && !dismissOnboardingBanner && (!onboardingStatus.isCompleted || onboardingStatus.progressPercentage < 100) && (
        <Card className={`border shadow-sm transition-all ${
          !onboardingStatus.isCompleted
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-primary/30 bg-primary/5'
        }`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-lg mt-0.5 ${
                  !onboardingStatus.isCompleted
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {!onboardingStatus.isCompleted ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      {!onboardingStatus.isCompleted
                        ? 'Organization Onboarding Incomplete'
                        : 'Finish Customizing Your Workspace'}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        !onboardingStatus.isCompleted
                          ? 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                          : 'border-primary/30 text-primary bg-primary/10'
                      }`}
                    >
                      {onboardingStatus.progressPercentage || 0}% Complete
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {!onboardingStatus.isCompleted ? (
                      <>
                        Mandatory configuration pending:{' '}
                        <span className="font-semibold text-foreground">
                          {onboardingStatus.incompleteMandatorySteps
                            ?.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
                            .join(', ')}
                        </span>
                        . Configure your organization profile and work shifts to unlock full operational workflows.
                      </>
                    ) : (
                      <>
                        Core organization requirements are fulfilled. You can still set up company holidays, locations, departments, and invite team members.
                      </>
                    )}
                  </p>
                  {/* Visual Progress Bar */}
                  <div className="pt-1.5 max-w-xs">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          !onboardingStatus.isCompleted ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${onboardingStatus.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  onClick={() => router.push('/app/onboarding')}
                  className="text-xs h-8 gap-1.5"
                >
                  {!onboardingStatus.isCompleted ? 'Resume Setup' : 'Continue Setup'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissOnboardingBanner(true)}
                  className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                  title="Dismiss Reminder"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role-Aware KPI Widgets (Connected to Live Data) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push('/app/projects')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Assigned Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsOverview?.kpis?.tasks?.completed || 0} completed • {analyticsOverview?.kpis?.tasks?.overdue || 0} overdue
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push('/app/work-queue')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operations Queue</CardTitle>
            <Layers className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analyticsOverview?.kpis?.workItems?.total ?? 0} Items
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsOverview?.kpis?.workItems?.pending ?? 0} Pending • {analyticsOverview?.kpis?.workItems?.qaReview ?? 0} In QA
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push('/app/analytics')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SLA Health</CardTitle>
            <ShieldCheck className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {analyticsOverview?.kpis?.quality?.slaHealthPercentage ?? 100}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsOverview?.kpis?.quality?.slaBreaches ?? 0} active breaches
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push('/app/quality')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analyticsOverview?.kpis?.quality?.averageScore !== null && analyticsOverview?.kpis?.quality?.averageScore !== undefined
                ? `${analyticsOverview.kpis.quality.averageScore} / 100`
                : '100 / 100'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsOverview?.kpis?.quality?.totalAudits
                ? `${analyticsOverview.kpis.quality.passedAudits} passed of ${analyticsOverview.kpis.quality.totalAudits} audits`
                : 'Zero defects recorded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task List & Activity Stream */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Work & Priority Actions</CardTitle>
              <CardDescription>Tasks requiring your immediate attention</CardDescription>
            </div>
            <Badge variant="outline">{tasks.length} items</Badge>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h4 className="text-sm font-semibold text-foreground">No pending tasks</h4>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up with your current work assignments.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tasks.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Project: {t.project?.name || 'General'} • Priority: {t.priority}
                        </div>
                      </div>
                    </div>
                    <Badge variant={t.status === 'COMPLETED' ? 'success' : 'secondary'}>{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Info Box */}
        <Card>
          <CardHeader>
            <CardTitle>Role Perspective</CardTitle>
            <CardDescription>Contextual view based on your role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {role === 'ADMIN' ? (
              <div className="rounded-lg border border-border p-3 bg-surface-secondary/50 space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">HR Executive Overview</h4>
                <p className="text-xs text-muted-foreground">
                  You manage workforce onboarding, employee attendance, leaves, asset assignments, and monthly payroll.
                </p>
                <div className="pt-2 flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/people')} className="w-full text-xs justify-between">
                    <span>People Directory &amp; Teams</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/time?tab=leave')} className="w-full text-xs justify-between">
                    <span>Leave &amp; Attendance Management</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/payroll')} className="w-full text-xs justify-between">
                    <span>Payroll &amp; Compensation</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/assets')} className="w-full text-xs justify-between">
                    <span>Asset Management</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : role === 'OWNER' ? (
              <div className="rounded-lg border border-border p-3 bg-surface-secondary/50 space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Administrative Overview</h4>
                <p className="text-xs text-muted-foreground">
                  You have full organizational visibility. Access workspace settings to modify departments, teams, roles, and SaaS subscription limits.
                </p>
                <div className="pt-2 flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/analytics')} className="w-full text-xs justify-between">
                    <span>Open Analytics Dashboard</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/calendar')} className="w-full text-xs justify-between">
                    <span>Operations Calendar</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/time?tab=leave')} className="w-full text-xs justify-between">
                    <span>Team Leave Approvals</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : role === 'MANAGER' ? (
              <div className="rounded-lg border border-border p-3 bg-surface-secondary/50 space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Team Operations</h4>
                <p className="text-xs text-muted-foreground">
                  Monitor team workload, review pending quality audits, and track team leaves.
                </p>
                <div className="pt-2 flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/time?tab=leave')} className="w-full text-xs justify-between">
                    <span>Team Leave Requests (View Only)</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/calendar')} className="w-full text-xs justify-between">
                    <span>Team Roster & Calendar</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/analytics')} className="w-full text-xs justify-between">
                    <span>Operational Reports</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border p-3 bg-surface-secondary/50 space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Individual Contributor</h4>
                <p className="text-xs text-muted-foreground">
                  Focus on executing assigned work items, logging daily time/attendance, and submitting completed batches.
                </p>
                <div className="pt-2 flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/time?tab=leave')} className="w-full text-xs justify-between">
                    <span>Apply for Leave (PTO)</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push('/app/calendar')} className="w-full text-xs justify-between">
                    <span>My Schedule & Deadlines</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
