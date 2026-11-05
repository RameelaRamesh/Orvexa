'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  X,
  RefreshCw,
  Eye,
  Filter,
  User,
  Users,
  CheckSquare,
  Folder,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  layer: 'ATTENDANCE' | 'SHIFTS' | 'LEAVE' | 'TASKS' | 'QUALITY';
  startDate: string;
  endDate: string;
  allDay: boolean;
  status: string;
  color: string;
  entityType: string;
  entityId: string;
  details?: any;
}

export default function UniversalCalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Scope: 'mine' shows strictly the logged in user's tasks/deadlines; 'all' shows team
  const [scopeMode, setScopeMode] = useState<'mine' | 'all'>('mine');

  // Logged-in user information
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p?.id || '';
    } catch {
      return '';
    }
  });

  const [currentMembershipId, setCurrentMembershipId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const w = JSON.parse(localStorage.getItem('orvexa_cached_workspace') || '{}');
      return w?.id || '';
    } catch {
      return '';
    }
  });

  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p?.email || '';
    } catch {
      return '';
    }
  });

  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      const first = p?.firstName || '';
      const last = p?.lastName || '';
      return `${first} ${last}`.trim();
    } catch {
      return '';
    }
  });

  // Active Layers
  const [activeLayers, setActiveLayers] = useState<string[]>([
    'ATTENDANCE',
    'SHIFTS',
    'LEAVE',
    'TASKS',
    'QUALITY',
  ]);

  // Live Events
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Event Modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  const today = new Date();

  // Helper to format date to YYYY-MM-DD for date input
  const toDateInputValue = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper to check if a task belongs to current logged-in user
  const checkIsMyTask = (
    task: any,
    memId: string,
    usrId: string,
    email: string,
    fullName: string,
  ) => {
    const emailLower = (email || '').toLowerCase().trim();
    const nameLower = (fullName || '').toLowerCase().trim();

    // 1. Direct assignee membership ID
    if (memId && (task.assigneeMembershipId === memId || task.assignee?.id === memId)) {
      return true;
    }

    // 2. User ID
    if (usrId && (task.assignee?.userId === usrId || task.assignee?.user?.id === usrId)) {
      return true;
    }

    // 3. User Email
    if (emailLower && task.assignee?.user?.email?.toLowerCase().trim() === emailLower) {
      return true;
    }

    // 4. Name match
    if (nameLower && task.assignee?.user) {
      const aName = `${task.assignee.user.firstName || ''} ${task.assignee.user.lastName || ''}`
        .toLowerCase()
        .trim();
      if (aName && (aName === nameLower || aName.includes(nameLower) || nameLower.includes(aName))) {
        return true;
      }
    }

    // 5. Multi-assignee list
    const assigneeIds = Array.isArray(task.assigneeMembershipIds)
      ? task.assigneeMembershipIds
      : Array.isArray(task.sla?.assigneeMembershipIds)
      ? task.sla.assigneeMembershipIds
      : [];
    if (memId && assigneeIds.includes(memId)) return true;

    // 6. Collaborators
    const collabIds = Array.isArray(task.collaboratorIds) ? task.collaboratorIds : [];
    if (memId && collabIds.includes(memId)) return true;

    return false;
  };

  // Calculate Start & End of Month / Range
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadCalendarEvents = async () => {
    if (!token || !wsId) return;
    setLoading(true);
    setError(null);
    try {
      const firstDay = new Date(year, month, 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(year, month + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        startDate: firstDay.toISOString(),
        endDate: lastDay.toISOString(),
        layers: activeLayers.join(','),
      });

      const headers = {
        Authorization: `Bearer ${token}`,
        'x-workspace-id': wsId,
      };

      // Query both the analytics calendar and raw modules concurrently for guaranteed coverage
      const [calRes, tasksRes, leavesRes, meRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/analytics/calendar?${params.toString()}`, { headers }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/tasks`, { headers }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/leave`, { headers }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers }).catch(() => null),
      ]);

      // Resolve live user identity
      let myUserId = currentUserId;
      let myMemId = currentMembershipId;
      let myEmail = currentUserEmail;
      let myName = currentUserName;

      if (meRes && meRes.ok) {
        const meJson = await meRes.json().catch(() => ({}));
        const userObj = meJson?.data?.user || meJson?.data || meJson?.user || {};
        const memberships = meJson?.data?.memberships || userObj?.memberships || meJson?.memberships || [];
        const activeMem = memberships.find((m: any) => m.workspaceId === wsId) || memberships[0];

        if (userObj.id) {
          myUserId = userObj.id;
          setCurrentUserId(userObj.id);
        }
        if (userObj.email) {
          myEmail = userObj.email;
          setCurrentUserEmail(userObj.email);
        }
        const fName = userObj.firstName || '';
        const lName = userObj.lastName || '';
        if (fName || lName) {
          myName = `${fName} ${lName}`.trim();
          setCurrentUserName(myName);
        }
        if (activeMem?.id) {
          myMemId = activeMem.id;
          setCurrentMembershipId(activeMem.id);
        }
      }

      const mergedEventsMap = new Map<string, CalendarEvent>();

      // 1. Ingest analytics calendar events if returned
      if (calRes && calRes.ok) {
        const calJson = await calRes.json().catch(() => ({}));
        if (Array.isArray(calJson.events)) {
          for (const ev of calJson.events) {
            const assignee = ev.details?.assigneeName || '';
            const member = ev.details?.memberName || '';
            const isForMe =
              (myName && (assignee.toLowerCase().includes(myName.toLowerCase()) || member.toLowerCase().includes(myName.toLowerCase()))) ||
              (myEmail && (assignee.toLowerCase().includes(myEmail.toLowerCase()) || member.toLowerCase().includes(myEmail.toLowerCase())));

            mergedEventsMap.set(ev.id || `${ev.entityType}-${ev.entityId}`, {
              ...ev,
              details: {
                ...ev.details,
                isAssignedToMe: isForMe,
              },
            });
          }
        }
      }

      // 2. Ingest tasks directly from /tasks (same endpoint used by Projects & Tasks)
      if (tasksRes && tasksRes.ok) {
        const taskData = await tasksRes.json().catch(() => []);
        const rawTasks: any[] = Array.isArray(taskData) ? taskData : (taskData?.data || []);

        for (const t of rawTasks) {
          const key = `task-${t.id}`;
          const isForMe = checkIsMyTask(t, myMemId, myUserId, myEmail, myName);
          const taskDate = t.dueDate || t.startDate || t.createdAt || new Date().toISOString();
          const dateIso = new Date(taskDate).toISOString();
          const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH';
          const assigneeName = t.assignee?.user
            ? `${t.assignee.user.firstName || ''} ${t.assignee.user.lastName || ''}`.trim()
            : (t.assigneeMembershipId ? 'Assigned Member' : 'Unassigned');

          mergedEventsMap.set(key, {
            id: key,
            title: `${t.dueDate ? 'Due' : 'Task'}: ${t.title} [${t.priority || 'MEDIUM'}]`,
            type: 'TASK_DEADLINE',
            layer: 'TASKS',
            startDate: dateIso,
            endDate: t.dueDate ? new Date(t.dueDate).toISOString() : dateIso,
            allDay: true,
            status: t.status || 'TODO',
            color: isUrgent ? '#ef4444' : '#8b5cf6',
            entityType: 'TASK',
            entityId: t.id,
            details: {
              title: t.title,
              description: t.description || null,
              projectName: t.project?.name || 'General',
              assigneeName,
              priority: t.priority || 'MEDIUM',
              dueDate: t.dueDate || null,
              isAssignedToMe: isForMe,
            },
          });
        }
      }

      // 3. Ingest leaves directly from /leave if available
      if (leavesRes && leavesRes.ok) {
        const leaveData = await leavesRes.json().catch(() => []);
        const rawLeaves: any[] = Array.isArray(leaveData) ? leaveData : (leaveData?.data || []);

        for (const l of rawLeaves) {
          const key = `leave-${l.id}`;
          if (l.startDate) {
            const memberName = l.membership?.user
              ? `${l.membership.user.firstName || ''} ${l.membership.user.lastName || ''}`.trim()
              : 'Team Member';
            const isForMe =
              (myMemId && l.membershipId === myMemId) ||
              (myName && memberName.toLowerCase().includes(myName.toLowerCase()));

            mergedEventsMap.set(key, {
              id: key,
              title: `${memberName} — ${l.leaveType || 'Leave'} (${l.totalDays || 1}d)`,
              type: 'LEAVE_REQUEST',
              layer: 'LEAVE',
              startDate: new Date(l.startDate).toISOString(),
              endDate: new Date(l.endDate || l.startDate).toISOString(),
              allDay: true,
              status: l.status || 'APPROVED',
              color: l.status === 'APPROVED' ? '#f59e0b' : '#9ca3af',
              entityType: 'LEAVE',
              entityId: l.id,
              details: {
                memberName,
                reason: l.reason || 'Leave request',
                days: l.totalDays || 1,
                isAssignedToMe: isForMe,
              },
            });
          }
        }
      }

      setEvents(Array.from(mergedEventsMap.values()));
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate, activeLayers]);

  // Layer Toggle
  const toggleLayer = (layer: string) => {
    if (activeLayers.includes(layer)) {
      if (activeLayers.length === 1) {
        toast.info('At least one calendar layer must remain active');
        return;
      }
      setActiveLayers(activeLayers.filter((l) => l !== layer));
    } else {
      setActiveLayers([...activeLayers, layer]);
    }
  };

  // Date Navigation Handlers
  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split('-').map(Number);
    if (parts.length === 3) {
      const newDate = new Date(parts[0], parts[1] - 1, parts[2]);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    }
  };

  const prevMonth = () => {
    const newMonthDate = new Date(year, month - 1, 1);
    setCurrentDate(newMonthDate);
    setSelectedDate(new Date(year, month - 1, Math.min(selectedDate.getDate(), 28)));
  };

  const nextMonth = () => {
    const newMonthDate = new Date(year, month + 1, 1);
    setCurrentDate(newMonthDate);
    setSelectedDate(new Date(year, month + 1, Math.min(selectedDate.getDate(), 28)));
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCurrentDate(now);
  };

  // Month Grid Calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter events based on active layers AND logged-in user scope
  const activeEvents = events.filter((ev) => {
    // 1. Layer filter
    if (!activeLayers.includes(ev.layer)) return false;

    // 2. Personal scope filter: when 'mine', show strictly current user's tasks & records
    if (scopeMode === 'mine') {
      if (ev.layer === 'TASKS') {
        return ev.details?.isAssignedToMe === true;
      }
      if (ev.layer === 'ATTENDANCE' || ev.layer === 'LEAVE') {
        return ev.details?.isAssignedToMe === true;
      }
    }

    return true;
  });

  // Map events by Day of Month (Timezone-resilient)
  const getEventsForDay = (day: number) => {
    return activeEvents.filter((ev) => {
      if (!ev.startDate) return false;
      const d = new Date(ev.startDate);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return true;
      }
      const datePart = typeof ev.startDate === 'string' ? ev.startDate.split('T')[0] : '';
      if (datePart) {
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const y = Number(parts[0]);
          const m = Number(parts[1]) - 1;
          const dt = Number(parts[2]);
          if (y === year && m === month && dt === day) {
            return true;
          }
        }
      }
      return false;
    });
  };

  const navigateToEntity = (event: CalendarEvent) => {
    switch (event.entityType) {
      case 'TASK':
        router.push('/app/projects');
        break;
      case 'ATTENDANCE':
      case 'LEAVE':
        router.push('/app/time');
        break;
      case 'QUALITY':
        router.push('/app/quality');
        break;
      default:
        break;
    }
    setSelectedEvent(null);
  };

  const formatScheduleDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Universal Operations Calendar</h1>
            <Badge variant="outline" className="text-xs font-mono">Multi-Layer Scheduling</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {scopeMode === 'mine'
              ? `Personal schedule for ${currentUserName || currentUserEmail || 'you'} — only your assigned tasks & deadlines are displayed.`
              : 'Workspace operations schedule — viewing all team attendance, shifts, leave requests, and task deadlines.'}
          </p>
        </div>

        {/* View Switcher, Scope Mode & Date Nav */}
        <div className="flex flex-wrap items-center gap-2">
          {/* User Scope Toggle (My Tasks vs All Team) */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setScopeMode('mine')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
                scopeMode === 'mine'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Show only tasks assigned to you"
            >
              <User className="h-3.5 w-3.5" />
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
                scopeMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Show all workspace tasks"
            >
              <Users className="h-3.5 w-3.5" />
              All Team
            </button>
          </div>

          {/* Date Navigator with Calendar Icon Date Picker */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-xs">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Previous Month">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Interactive Calendar Icon Date Picker */}
            <div className="relative flex items-center gap-1.5 px-2 py-0.5 border-x border-border mx-1">
              <CalendarIcon className="h-4 w-4 text-primary shrink-0 pointer-events-none" />
              <input
                type="date"
                title="Select date to jump to"
                value={toDateInputValue(selectedDate)}
                onChange={handleDatePick}
                className="bg-transparent text-xs font-semibold text-foreground border-none outline-none cursor-pointer focus:ring-0"
              />
            </div>

            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-surface-secondary rounded transition-colors"
              title="Jump to Today"
            >
              Today
            </button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Next Month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month / Agenda View Mode */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'month' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'agenda' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Agenda
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadCalendarEvents} disabled={loading} className="h-8 gap-1.5 shadow-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Interactive Layer Filter Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Layers:
        </span>

        <button
          type="button"
          onClick={() => toggleLayer('ATTENDANCE')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('ATTENDANCE')
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Attendance Sessions
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('SHIFTS')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('SHIFTS')
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400 font-semibold shadow-2xs'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Work Shifts
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('LEAVE')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('LEAVE')
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold shadow-2xs'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Leave Requests
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('TASKS')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('TASKS')
              ? 'bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400 font-semibold shadow-2xs'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          Task Deadlines
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('QUALITY')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('QUALITY')
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold shadow-2xs'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Quality Audits
        </button>
      </div>

      {/* Month Label & Scope Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-card border border-border px-4 py-3 rounded-xl shadow-xs gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-lg font-bold text-foreground">{monthName}</span>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 font-medium py-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            Today: {today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </Badge>
          <Badge variant="secondary" className="text-xs flex items-center gap-1.5 font-medium py-1">
            <User className="h-3.5 w-3.5 text-primary" />
            {scopeMode === 'mine' ? (
              <span>My Tasks: <strong className="text-foreground">{currentUserName || currentUserEmail || 'Logged In User'}</strong></span>
            ) : (
              <span>Scope: <strong className="text-foreground">All Team Members</strong></span>
            )}
          </Badge>
          {selectedDate.toDateString() !== today.toDateString() && (
            <Badge variant="outline" className="text-xs flex items-center gap-1 font-medium py-1">
              Focus: {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2.5 py-1 rounded-md border border-border">
            {activeEvents.length} {activeEvents.length === 1 ? 'event' : 'events'} in scope
          </span>
        </div>
      </div>

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <Card className="overflow-hidden border border-border shadow-xs">
          <div className="grid grid-cols-7 border-b border-border bg-surface-secondary/50 text-center text-xs font-semibold uppercase text-muted-foreground py-2.5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-border bg-card">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`blank-${idx}`} className="min-h-28 bg-surface-secondary/20 p-2 text-muted-foreground/20 text-xs" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dayEvents = getEventsForDay(day);
              const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year;
              const isSelected =
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  className={`min-h-28 p-1.5 sm:p-2 transition-all flex flex-col justify-between cursor-pointer rounded-xs ${
                    isSelected
                      ? 'ring-2 ring-primary ring-inset bg-primary/10 font-semibold shadow-2xs'
                      : isToday
                      ? 'bg-primary/5 font-semibold'
                      : 'hover:bg-surface-secondary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs rounded-full h-6 w-6 flex items-center justify-center transition-all ${
                        isToday
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : isSelected
                          ? 'bg-foreground text-background font-bold'
                          : 'text-foreground font-medium'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-tight">Today</span>
                    )}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 rounded">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className="w-full text-left truncate text-[11px] px-2 py-1 rounded-md shadow-2xs font-medium transition-all hover:scale-[1.02] hover:shadow-xs flex items-center justify-between gap-1 border border-border/40"
                        style={{
                          backgroundColor: `${ev.color}15`,
                          borderLeft: `3px solid ${ev.color}`,
                          color: ev.color,
                        }}
                        title={`${ev.title} — ${ev.details?.assigneeName || ''}`}
                      >
                        <span className="truncate flex-1 font-semibold">{ev.title}</span>
                        {ev.details?.isAssignedToMe && (
                          <span className="text-[9px] px-1 rounded bg-primary/20 text-primary font-bold shrink-0">You</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* AGENDA VIEW LIST */}
      {viewMode === 'agenda' && (
        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Chronological Activity Agenda</CardTitle>
                <CardDescription>
                  {scopeMode === 'mine' ? 'Your upcoming task deadlines and personal events' : 'All upcoming workspace operations ordered by date'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {activeEvents.length} {activeEvents.length === 1 ? 'Event' : 'Events'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {activeEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h4 className="text-sm font-semibold text-foreground">No events found for this filter</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {scopeMode === 'mine'
                    ? 'You have no assigned tasks scheduled for this period. Switch to "All Team" to view workspace activities.'
                    : 'Adjust layer filters or navigate to a different month to view scheduled events.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {[...activeEvents]
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 hover:bg-surface-secondary/40 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-3 w-3 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{ev.title}</span>
                            {ev.details?.isAssignedToMe && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-primary/10 text-primary border-primary/20">
                                Assigned to You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                            <span>{formatScheduleDate(ev.startDate)}</span>
                            <span>•</span>
                            <span>Layer: <strong className="text-foreground">{ev.layer}</strong></span>
                            <span>•</span>
                            <span>Status: <strong className="text-foreground">{ev.status}</strong></span>
                            {ev.details?.assigneeName && (
                              <>
                                <span>•</span>
                                <span>Assignee: <strong className="text-foreground">{ev.details.assigneeName}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedEvent(ev)}
                          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigateToEntity(ev)}
                          className="h-8 text-xs gap-1.5 font-medium"
                        >
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modern Event Details Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4 gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `${selectedEvent.color}20`,
                    color: selectedEvent.color,
                  }}
                >
                  {selectedEvent.layer === 'TASKS' ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : selectedEvent.layer === 'LEAVE' ? (
                    <CalendarIcon className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground leading-snug">
                    {selectedEvent.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {selectedEvent.type}
                    </Badge>
                    <Badge
                      variant={
                        selectedEvent.status === 'COMPLETED' || selectedEvent.status === 'APPROVED' || selectedEvent.status === 'PASSED'
                          ? 'success'
                          : 'secondary'
                      }
                      className="text-[11px]"
                    >
                      {selectedEvent.status}
                    </Badge>
                    {selectedEvent.details?.isAssignedToMe && (
                      <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground">
                        Assigned to You
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEvent(null)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body - Clean Structured Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  <span>Schedule Date</span>
                </div>
                <div className="text-foreground font-medium text-sm">
                  {formatScheduleDate(selectedEvent.startDate)}
                </div>
              </div>

              <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Assigned Member</span>
                </div>
                <div className="text-foreground font-medium text-sm truncate">
                  {selectedEvent.details?.assigneeName || selectedEvent.details?.memberName || 'Unassigned'}
                </div>
              </div>

              {selectedEvent.details?.projectName && (
                <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <Folder className="h-3.5 w-3.5 text-primary" />
                    <span>Project</span>
                  </div>
                  <div className="text-foreground font-medium text-sm truncate">
                    {selectedEvent.details.projectName}
                  </div>
                </div>
              )}

              {selectedEvent.details?.priority && (
                <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                    <span>Priority</span>
                  </div>
                  <div className="text-foreground font-medium text-sm">
                    {selectedEvent.details.priority}
                  </div>
                </div>
              )}
            </div>

            {/* Task Description if available */}
            {selectedEvent.details?.description && (
              <div className="p-3 bg-muted/30 border border-border/60 rounded-xl text-xs space-y-1">
                <span className="font-semibold text-muted-foreground">Description</span>
                <p className="text-foreground leading-relaxed">{selectedEvent.details.description}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              <Button size="sm" onClick={() => navigateToEntity(selectedEvent)} className="gap-2 font-medium shadow-xs">
                Open in Projects & Tasks
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}