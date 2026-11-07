'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ProfileSetupModal } from '@/components/profile-setup-modal';
import { BannerIllustration } from '@/components/banner-illustration';
import {
  Users,
  Briefcase,
  CheckCircle,
  Clock,
  ArrowRight,
  Calendar,
  Play,
  Plus,
  FileText,
  Video,
  Presentation,
  Check,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [peopleCount, setPeopleCount] = useState<number>(245);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);
  const [analyticsOverview, setAnalyticsOverview] = useState<any>(null);
  const [dismissOnboardingBanner, setDismissOnboardingBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Tasks Tab state: 'assigned' | 'created' | 'approvals'
  const [activeTaskTab, setActiveTaskTab] = useState<'assigned' | 'created' | 'approvals'>('assigned');
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    setGreeting(getGreeting());
    try {
      const cached = localStorage.getItem('orvexa_cached_profile');
      if (cached) setProfile(JSON.parse(cached));
    } catch {}

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

    if (!token || !wsId) return;

    const fetchData = async () => {
      try {
        const [profRes, attRes, taskRes, projRes, onbRes, analyticsRes, peopleRes] = await Promise.all([
          fetch(`${BRANDING.apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BRANDING.apiUrl}/time/today`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/tasks`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/projects`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/workspaces/onboarding/status`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/analytics/overview`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
          fetch(`${BRANDING.apiUrl}/people`, {
            headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
          }),
        ]);

        const profData = await profRes.json();
        const attData = await attRes.json();
        const taskData = await taskRes.json();
        const projData = projRes.ok ? await projRes.json() : null;
        const onbData = await onbRes.json();
        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;
        const peopleData = peopleRes.ok ? await peopleRes.json() : null;

        if (profData.success || profData.data) {
          const u = profData.data || profData;
          setProfile(u);
          const currentMem = u.memberships?.find((m: any) => m.workspaceId === wsId);
          setActiveWorkspace(currentMem);
        }

        if (attData.success) setTodayAttendance(attData.data);
        if (taskData.success) setTasks(taskData.data || []);
        if (projData) {
          const raw = projData.data !== undefined ? projData.data : (Array.isArray(projData) ? projData : []);
          const cleanProjects = raw.filter((p: any) => {
            const k = (p.key || '').trim().toUpperCase();
            const n = (p.name || '').trim().toLowerCase();
            return k !== 'JUJIJI' && k !== 'LK0IHB' && n !== 'abc' && n !== 'gf4f4tr';
          });
          setProjects(cleanProjects);
        }
        if (onbData.success || onbData.data) {
          setOnboardingStatus(onbData.data || onbData);
        }
        if (analyticsData) setAnalyticsOverview(analyticsData);
        if (peopleData) {
          const list = Array.isArray(peopleData.data) ? peopleData.data : Array.isArray(peopleData) ? peopleData : [];
          if (list.length > 0) setPeopleCount(list.length);
        }
      } catch (err: any) {
        console.error('Home data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleProfileUpdated = (e: any) => {
      if (e.detail) setProfile(e.detail);
    };
    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('profile-updated', handleProfileUpdated);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const role = activeWorkspace?.accessRole || 'MEMBER';
  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'OWNER' ? 'Owner' : role === 'MANAGER' ? 'Manager' : 'Team Member';
  const departmentName = activeWorkspace?.department?.name || 'Engineering';

  // Fallback demo tasks if workspace tasks list is empty
  const defaultTasks = [
    {
      id: 'demo_1',
      title: 'Review client report',
      subtitle: 'Due Today • Client A',
      assigneeName: 'John Daniel',
      category: 'assigned',
    },
    {
      id: 'demo_2',
      title: 'Approve leave request',
      subtitle: 'Due Today',
      assigneeName: 'Alex Rivera',
      category: 'assigned',
    },
    {
      id: 'demo_3',
      title: 'Update project status',
      subtitle: 'Due Today',
      assigneeName: 'Sarah Jenkins',
      category: 'assigned',
    },
  ];

  const displayedTasks = tasks.length > 0
    ? tasks.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `Due Today • ${t.project?.name || 'General Operations'}`,
        assigneeName: `${profile?.firstName || 'John'} ${profile?.lastName || 'Daniel'}`,
        category: 'assigned',
      }))
    : defaultTasks;

  const toggleTaskComplete = (id: string) => {
    if (completedTaskIds.includes(id)) {
      setCompletedTaskIds(completedTaskIds.filter((taskId) => taskId !== id));
      toast.info('Task marked as pending');
    } else {
      setCompletedTaskIds([...completedTaskIds, id]);
      toast.success('Task marked as completed!');
    }
  };

  const activeProjectsCount = projects.filter((p: any) => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS').length || 18;
  const qualityScoreDisplay = analyticsOverview?.kpis?.quality?.averageScore ?? 92;
  const pendingTasksCount = tasks.filter((t: any) => t.status !== 'COMPLETED').length || 156;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Onboarding Incomplete Reminder Banner (if applicable) */}
      {onboardingStatus && !dismissOnboardingBanner && (!onboardingStatus.isCompleted || onboardingStatus.progressPercentage < 100) && (
        <Card className="border border-amber-500/30 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Setup Incomplete</h4>
                  <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/40">
                    {onboardingStatus.progressPercentage || 0}%
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Finish workspace configuration to activate all operational tools.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => router.push('/app/onboarding')} className="h-8 text-xs">
                Resume Setup
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDismissOnboardingBanner(true)} className="h-8 px-2 text-slate-400">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TOP WELCOME BANNER (Exact Style from Image) */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100/80 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-blue-100/50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 px-6 py-3.5 md:px-8 md:py-4 shadow-xs">
        {/* Soft background curve graphics */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-70 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="none">
            <path
              d="M0,100 C150,180 250,20 400,100 L400,0 L0,0 Z"
              fill="url(#blue-grad)"
              fillOpacity="0.4"
            />
            <defs>
              <linearGradient id="blue-grad" x1="0" y1="0" x2="400" y2="200" gradientUnits="userSpaceOnUse">
                <stop stopColor="#93C5FD" stopOpacity="0.3" />
                <stop offset="1" stopColor="#38BDF8" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-0.5 max-w-xl">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {greeting}, {profile?.firstName || 'John'}!
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              Here&apos;s what&apos;s happening in your workspace today.
            </p>
          </div>

          {/* Right Vector Illustration */}
          <BannerIllustration className="shrink-0 -my-1.5" />
        </div>
      </div>

      {/* 4 STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <Card
          className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          onClick={() => router.push('/app/people')}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {peopleCount}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Employees
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
                <span>↑ 12%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Active Projects */}
        <Card
          className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          onClick={() => router.push('/app/projects')}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeProjectsCount}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Projects
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
                <span>↑ 8%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Quality Score */}
        <Card
          className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          onClick={() => router.push('/app/quality')}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {qualityScoreDisplay}%
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Quality Score
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
                <span>↑ 2%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Pending Tasks */}
        <Card
          className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          onClick={() => router.push('/app/projects')}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {pendingTasksCount}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Pending Tasks
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-0.5">
                <span>↑ 5%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* MIDDLE SECTION: My Tasks & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks Card */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">My Tasks</h2>
              <button
                type="button"
                onClick={() => router.push('/app/projects')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 group transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Pill Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTaskTab('assigned')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTaskTab === 'assigned'
                    ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Assigned ({tasks.length || 5})
              </button>
              <button
                type="button"
                onClick={() => setActiveTaskTab('created')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTaskTab === 'created'
                    ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Created (2)
              </button>
              <button
                type="button"
                onClick={() => setActiveTaskTab('approvals')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTaskTab === 'approvals'
                    ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Approvals (1)
              </button>
            </div>

            {/* Task Items List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 pt-1">
              {displayedTasks.map((t, idx) => {
                const isCompleted = completedTaskIds.includes(t.id);
                return (
                  <div key={t.id || idx} className="flex items-center justify-between py-3.5 group">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Circle Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTaskComplete(t.id)}
                        className={`h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                        title="Toggle task completion"
                      >
                        {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div
                          className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                            isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {t.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Assignee Avatar */}
                    <div className="shrink-0 ml-3">
                      <UserAvatar
                        firstName={t.assigneeName.split(' ')[0]}
                        lastName={t.assigneeName.split(' ')[1] || 'D'}
                        seed={t.assigneeName}
                        size="xs"
                        className="h-7 w-7 text-[10px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Upcoming Events Card */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Upcoming Events</h2>
              <button
                type="button"
                onClick={() => router.push('/app/calendar')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 group transition-colors"
              >
                <span>View Calendar</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Events List */}
            <div className="space-y-4 pt-2">
              {/* Event 1 */}
              <div className="flex items-center gap-4">
                {/* Date Badge */}
                <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/40 px-3 py-2 text-center min-w-[54px] shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    TUE
                  </div>
                  <div className="text-lg font-extrabold text-blue-950 dark:text-blue-200 leading-tight">
                    22
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-xl bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      Team Standup
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      10:00 AM - 10:30 AM
                    </div>
                  </div>
                </div>
              </div>

              {/* Event 2 */}
              <div className="flex items-center gap-4">
                {/* Icon Placeholder or Date */}
                <div className="w-[54px] flex items-center justify-center shrink-0" />

                {/* Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-xl bg-purple-100/70 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Presentation className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      Project Review
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      02:00 PM - 03:00 PM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* BOTTOM SECTION: Quick Actions & Your Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Card */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Apply Leave */}
            <button
              type="button"
              onClick={() => router.push('/app/time?tab=leave')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 hover:border-blue-200 transition-all group"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                Apply Leave
              </span>
            </button>

            {/* Log Work */}
            <button
              type="button"
              onClick={() => router.push('/app/time')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 hover:border-emerald-200 transition-all group"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                Log Work
              </span>
            </button>

            {/* Create Project */}
            <button
              type="button"
              onClick={() => router.push('/app/projects')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/30 hover:border-sky-200 transition-all group"
            >
              <div className="h-10 w-10 rounded-xl bg-sky-100/70 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                Create Project
              </span>
            </button>

            {/* Raise Request */}
            <button
              type="button"
              onClick={() => router.push('/app/requests')}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:border-indigo-200 transition-all group"
            >
              <div className="h-10 w-10 rounded-xl bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                Raise Request
              </span>
            </button>
          </div>
        </Card>

        {/* Your Profile Card */}
        <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Your Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Left Side: Avatar & Details */}
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  avatarUrl={profile?.avatarUrl}
                  firstName={profile?.firstName}
                  lastName={profile?.lastName}
                  seed={profile?.id || profile?.email}
                  size="lg"
                  className="ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                />
                <div className="min-w-0 space-y-0.5">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {profile?.firstName || 'John'} {profile?.lastName || 'Daniel'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {roleLabel} • {departmentName}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 pt-1 cursor-pointer group"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Right Side: Pending Approvals with Divider */}
              <div className="sm:border-l sm:border-slate-100 sm:dark:border-slate-800 sm:pl-6 space-y-1">
                <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pending Approvals
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
                    1
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => router.push('/app/requests')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 group"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Profile Setup Modal */}
      <ProfileSetupModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profile={profile}
        onProfileUpdated={(updated) => setProfile(updated)}
      />
    </div>
  );
}
