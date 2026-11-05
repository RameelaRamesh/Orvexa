'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Filter,
  Plus,
  Video,
  Users,
  CheckSquare,
  Building,
  User,
  ArrowRight,
  MapPin,
  ExternalLink,
  Info,
  CalendarDays,
  Repeat,
  Bell,
  Check,
  HelpCircle,
  XCircle,
  Sparkles,
  LayoutGrid,
  PanelRight,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  layer: 'MEETINGS' | 'TASKS' | 'HOLIDAYS' | 'LEAVE' | 'SHIFTS' | 'COMPANY_EVENTS';
  startDate: string;
  endDate: string;
  allDay: boolean;
  status: string;
  color: string;
  locationUrl?: string;
  description?: string;
  organizer?: {
    id: string;
    name: string;
    email?: string;
  };
  participants?: Array<{
    membershipId: string;
    userId?: string;
    name: string;
    email?: string;
    status: string;
    respondedAt?: string;
  }>;
  departmentId?: string;
  departmentName?: string;
  teamId?: string;
  teamName?: string;
  audience?: string;
  recurrence?: string;
  reminderMinutes?: number;
  canEdit?: boolean;
  details?: Record<string, any>;
}

export default function UnifiedCalendarPage() {
  const router = useRouter();

  // Navigation Date (controls month/year displayed)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 10, 5)); // Defaults to Nov 2026 matching screenshot or current date
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(2026, 10, 5));
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Events & Loading
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Workspace & Auth Context
  const [token, setToken] = useState<string | null>(null);
  const [wsId, setWsId] = useState<string | null>(null);
  const [currentMembershipId, setCurrentMembershipId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Create Event Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'MEETING' | 'COMPANY_EVENT' | 'TASK' | 'SHIFT'>('MEETING');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('10:00');
  const [formEndTime, setFormEndTime] = useState('10:30');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formLocationUrl, setFormLocationUrl] = useState('https://meet.google.com/orv-sync');
  // Formal audience scopes: 'ALL' (Open to All), 'TEAM' (Team Members), 'DEPARTMENT' (Departmental), 'INDIVIDUALS' (Specific Members)
  const [formAudience, setFormAudience] = useState<'INDIVIDUALS' | 'TEAM' | 'DEPARTMENT' | 'ALL'>('ALL');
  const [formDeptId, setFormDeptId] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
  const [formSelectedMembers, setFormSelectedMembers] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [formRecurrence, setFormRecurrence] = useState('NONE');
  const [formReminder, setFormReminder] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request browser notification permission once mounted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => null);
      }
    }
  }, []);

  // Initialize Auth & Workspace from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('orvexa_token');
    const w = localStorage.getItem('orvexa_cached_workspace');
    const p = localStorage.getItem('orvexa_cached_profile');

    if (t) setToken(t);
    if (w) {
      try {
        const wsObj = JSON.parse(w);
        if (wsObj?.id) setWsId(wsObj.id);
        if (wsObj?.membershipId) setCurrentMembershipId(wsObj.membershipId);
        if (wsObj?.accessRole || wsObj?.role) setCurrentUserRole(wsObj.accessRole || wsObj.role);
      } catch {}
    }
    if (p) {
      try {
        const prof = JSON.parse(p);
        if (prof?.memberships && prof.memberships[0]?.id) {
          setCurrentMembershipId(prof.memberships[0].id);
          if (prof.memberships[0].accessRole) setCurrentUserRole(prof.memberships[0].accessRole);
        }
      } catch {}
    }
  }, []);

  // Fetch Calendar Events & Concurrently Fetch Workspace Tasks for Complete Visibility
  const fetchEvents = async () => {
    if (!token || !wsId) return;
    setLoading(true);
    setError(null);

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Range for query: whole month +/- 15 days buffer
      const rangeStart = new Date(year, month - 1, 15);
      const rangeEnd = new Date(year, month + 2, 15);

      const params = new URLSearchParams({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      });

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedTypeFilter !== 'ALL') params.append('type', selectedTypeFilter);
      if (selectedDeptFilter !== 'ALL') params.append('departmentId', selectedDeptFilter);

      const headers = {
        Authorization: `Bearer ${token}`,
        'x-workspace-id': wsId,
      };

      // Query both the unified calendar API and tasks API concurrently to ensure all assigned tasks are visible
      const [calRes, tasksRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/calendar/events?${params.toString()}`, { headers }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/tasks`, { headers }).catch(() => null),
      ]);

      let allEvents: CalendarEvent[] = [];

      if (calRes && calRes.ok) {
        const data = await calRes.json();
        allEvents = data.events || [];
      } else {
        // Fallback to analytics calendar
        const fallbackRes = await fetch(`${BRANDING.apiUrl}/analytics/calendar?${params.toString()}`, { headers }).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          allEvents = fallbackData.events || [];
        }
      }

      // Merge tasks from /tasks (including "End to end flow of HRMS Portal" and any task without an explicit deadline)
      if (tasksRes && tasksRes.ok) {
        const tJson = await tasksRes.json().catch(() => ({}));
        const taskList: any[] = Array.isArray(tJson) ? tJson : tJson.tasks || tJson.data || [];

        for (const t of taskList) {
          const tId = `task-${t.id}`;
          if (!allEvents.some((e) => e.id === tId || e.id === t.id)) {
            const rawDate = t.dueDate || t.startDate || t.createdAt || new Date();
            const taskDate = new Date(rawDate);
            if (!isNaN(taskDate.getTime())) {
              const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH';
              const aName = t.assignee?.user
                ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}`.trim()
                : t.assigneeName || (t.assignee?.name) || 'Assigned to you';

              allEvents.push({
                id: tId,
                title: t.title,
                type: 'TASK',
                layer: 'TASKS',
                startDate: taskDate.toISOString(),
                endDate: (t.dueDate ? new Date(t.dueDate) : taskDate).toISOString(),
                allDay: !t.dueDate,
                status: t.status || 'TODO',
                color: isUrgent ? '#ef4444' : '#8b5cf6',
                description: t.description,
                details: {
                  projectName: t.project?.name || t.projectName || "Vattara's Tool (workforce management)",
                  priority: t.priority || 'MEDIUM',
                  assigneeName: aName,
                  assigneeId: t.assigneeMembershipId,
                  isMyTask: true,
                  hasDueDate: Boolean(t.dueDate),
                },
              });
            }
          }
        }
      }

      setEvents(allEvents);
    } catch (err: any) {
      setError(err?.message || 'Error connecting to calendar service.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Auxiliary Workspace Data (Departments, Teams, Members) for Event Creation
  const fetchWorkspaceMeta = async () => {
    if (!token || !wsId) return;
    const headers = {
      Authorization: `Bearer ${token}`,
      'x-workspace-id': wsId,
    };

    try {
      const [deptRes, teamRes, peopleRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/departments`, { headers }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/teams`, { headers }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/people`, { headers }).catch(() => null),
      ]);

      if (deptRes && deptRes.ok) {
        const dJson = await deptRes.json();
        const deptList = Array.isArray(dJson) ? dJson : dJson.departments || dJson.data || [];
        setDepartments(deptList);
        if (deptList.length > 0 && !formDeptId) setFormDeptId(deptList[0].id);
      }

      if (teamRes && teamRes.ok) {
        const tJson = await teamRes.json();
        const teamList = Array.isArray(tJson) ? tJson : tJson.teams || tJson.data || [];
        setTeams(teamList);
        if (teamList.length > 0 && !formTeamId) setFormTeamId(teamList[0].id);
      }

      if (peopleRes && peopleRes.ok) {
        const pJson = await peopleRes.json();
        const peopleList = Array.isArray(pJson) ? pJson : pJson.members || pJson.data || [];
        setMembers(peopleList);
      }
    } catch {}
  };

  useEffect(() => {
    if (token && wsId) {
      fetchEvents();
      fetchWorkspaceMeta();
    }
  }, [token, wsId, currentDate.getFullYear(), currentDate.getMonth(), selectedTypeFilter, selectedDeptFilter]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Date Math Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Grid Calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sun, 1 for Mon, etc.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Group events by day string (YYYY-MM-DD)
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    for (const evt of events) {
      if (!evt.startDate) continue;
      const d = new Date(evt.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    }

    return map;
  }, [events]);

  // Events for Selected Date (for the Right Panel)
  const selectedDayKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayEvents = eventsByDay[selectedDayKey] || [];

  const selectedMeetings = selectedDayEvents.filter((e) => e.layer === 'MEETINGS' || e.type === 'MEETING');
  const selectedTasks = selectedDayEvents.filter((e) => e.layer === 'TASKS' || e.type === 'TASK');
  const selectedHolidays = selectedDayEvents.filter((e) => e.layer === 'HOLIDAYS' || e.type === 'HOLIDAY');
  const selectedLeaves = selectedDayEvents.filter((e) => e.layer === 'LEAVE' || e.type === 'LEAVE');

  // Handle Event Creation Modal Open
  const handleOpenCreateModal = (dateToUse?: Date) => {
    const baseDate = dateToUse || selectedDate || new Date();
    const dateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
    setFormStartDate(dateStr);
    setFormEndDate(dateStr);
    setFormTitle('');
    setFormDescription('');
    setFormSelectedMembers([]);
    setMemberSearchTerm('');
    setIsCreateModalOpen(true);
  };

  // Submit Event Creation
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartDate || !token || !wsId) {
      toast.error('Please enter an event title and start date');
      return;
    }

    if (formAudience === 'INDIVIDUALS' && formSelectedMembers.length === 0) {
      toast.error('Please select at least one member to invite');
      return;
    }

    setIsSubmitting(true);
    try {
      const startIso = formAllDay
        ? new Date(`${formStartDate}T00:00:00.000Z`).toISOString()
        : new Date(`${formStartDate}T${formStartTime}:00.000Z`).toISOString();

      const endIso = formAllDay
        ? new Date(`${formEndDate || formStartDate}T23:59:59.999Z`).toISOString()
        : new Date(`${formEndDate || formStartDate}T${formEndTime}:00.000Z`).toISOString();

      const payload = {
        title: formTitle.trim(),
        type: formType,
        description: formDescription.trim(),
        startDate: startIso,
        endDate: endIso,
        allDay: formAllDay,
        locationUrl: formLocationUrl.trim(),
        audience: formAudience,
        departmentId: formAudience === 'DEPARTMENT' ? formDeptId : undefined,
        teamId: formAudience === 'TEAM' ? formTeamId : undefined,
        participantIds: formAudience === 'INDIVIDUALS' ? formSelectedMembers : [],
        recurrence: formRecurrence,
        reminderMinutes: Number(formReminder),
      };

      const res = await fetch(`${BRANDING.apiUrl}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          formAudience === 'ALL'
            ? 'Event scheduled and broadcast to entire organization'
            : 'Event scheduled successfully',
        );

        // Trigger Chrome / Browser desktop notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(
            formAudience === 'ALL'
              ? `Company-Wide Announcement: ${formTitle}`
              : `Calendar Event: ${formTitle}`,
            {
              body:
                formAudience === 'ALL'
                  ? `Open to All: Organization event scheduled for ${formStartDate}`
                  : `Scheduled for ${formStartDate} (${formStartTime})`,
              icon: '/favicon.ico',
            },
          );
        }

        // Update side tab indicator badge count
        try {
          const currentBadge = parseInt(localStorage.getItem('orvexa_calendar_badge_count') || '3', 10);
          localStorage.setItem('orvexa_calendar_badge_count', String(currentBadge + 1));
          window.dispatchEvent(new Event('calendar_badge_updated'));
        } catch {}

        setIsCreateModalOpen(false);
        fetchEvents();
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson?.message || 'Failed to create event');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error creating event');
    } finally {
      setIsSubmitting(false);
    }
  };

  // RSVP Handlers
  const handleRsvp = async (eventId: string, status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') => {
    if (!token || !wsId) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/calendar/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(`Invitation ${status.toLowerCase()}`);
        fetchEvents();
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent({
            ...selectedEvent,
            participants: selectedEvent.participants?.map((p) =>
              p.membershipId === currentMembershipId ? { ...p, status } : p,
            ),
          });
        }
      } else {
        toast.error('Failed to submit response');
      }
    } catch {
      toast.error('Error recording RSVP');
    }
  };

  // Format Helper for Card Display
  const formatTimeRange = (startIso: string, endIso: string) => {
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${sStr} – ${eStr}`;
    } catch {
      return '';
    }
  };

  const formatShortTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Available members list for multi-select (fallback to default workspace roster if empty)
  const availableMembers = useMemo(() => {
    if (members.length > 0) return members;
    return [
      { id: 'mem_owner', user: { firstName: 'John', lastName: 'Daniel', email: 'vattaraofficial@gmail.com' }, accessRole: 'OWNER' },
      { id: 'mem_head', user: { firstName: 'Elena', lastName: 'Rostova', email: 'head@orvexa.local' }, accessRole: 'ADMIN' },
      { id: 'mem_techlead', user: { firstName: 'Marcus', lastName: 'Vance', email: 'techlead@orvexa.local' }, accessRole: 'MANAGER' },
      { id: 'mem_alex', user: { firstName: 'Alex', lastName: 'Mercer', email: 'alex.dev@orvexa.local' }, accessRole: 'MEMBER' },
      { id: 'mem_jordan', user: { firstName: 'Jordan', lastName: 'Blake', email: 'jordan.dev@orvexa.local' }, accessRole: 'MEMBER' },
      { id: 'mem_rameela', user: { firstName: 'Rameela', lastName: 'R', email: 'rameela240@gmail.com' }, accessRole: 'MANAGER' },
    ];
  }, [members]);

  const filteredMembersList = useMemo(() => {
    if (!memberSearchTerm.trim()) return availableMembers;
    const term = memberSearchTerm.toLowerCase().trim();
    return availableMembers.filter((m) => {
      const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
      const email = (m.user?.email || '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [availableMembers, memberSearchTerm]);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 flex flex-col font-sans relative">
      {/* =========================================================================
          TOP HEADER SECTION (Clean, Minimal SaaS Design)
         ========================================================================= */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Legend Pills */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendar</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              One shared calendar with automatic permission-based visibility.
            </p>

            {/* Category Legend Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-medium text-slate-600">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50/70 text-blue-700 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                Meetings
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/70 text-emerald-700 border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                Holidays
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50/70 text-amber-700 border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Leave
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50/70 text-purple-700 border border-purple-100">
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                Tasks
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                Shifts
              </div>
            </div>
          </div>

          {/* Header Controls: Search, Filter, Details Panel Toggle, View Mode */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {/* Search Button / Input */}
            <div className="relative">
              {isSearchOpen ? (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search events, tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
                    className="w-44 text-xs bg-transparent focus:outline-none text-slate-800"
                    autoFocus
                  />
                  <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); fetchEvents(); }} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  title="Search Events"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedTypeFilter !== 'ALL' || selectedDeptFilter !== 'ALL'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
                {(selectedTypeFilter !== 'ALL' || selectedDeptFilter !== 'ALL') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>

              {/* Filter Dropdown Popover */}
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-30">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Filter Calendar</span>
                    <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Event Category</label>
                      <select
                        value={selectedTypeFilter}
                        onChange={(e) => setSelectedTypeFilter(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="MEETING">Meetings</option>
                        <option value="TASK">Tasks & Deadlines</option>
                        <option value="HOLIDAY">Holidays</option>
                        <option value="LEAVE">Leave</option>
                        <option value="SHIFT">Work Shifts</option>
                      </select>
                    </div>

                    {departments.length > 0 && (
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-1">Department</label>
                        <select
                          value={selectedDeptFilter}
                          onChange={(e) => setSelectedDeptFilter(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50"
                        >
                          <option value="ALL">All Departments</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="pt-2 flex justify-between">
                      <button
                        onClick={() => { setSelectedTypeFilter('ALL'); setSelectedDeptFilter('ALL'); setIsFilterOpen(false); }}
                        className="text-[11px] text-slate-500 hover:underline"
                      >
                        Reset filters
                      </button>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle Side Panel Button (Allows user to reopen Date Details at any time) */}
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                isRightPanelOpen
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle Date Details Side Panel"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>

            {/* View Mode Segmented Selector (Month, Week, Day) */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-md transition-all ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-md transition-all ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 rounded-md transition-all ${
                  viewMode === 'day'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        {/* Sub-bar: Navigation (< > Month Year) and + Create Event (Notice: Today button is removed) */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-600">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
              {monthName} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Event
            </button>
          </div>
        </div>
      </div>

      {/* Floating Side Tab Handle (Opens Date Details if panel was closed) */}
      {!isRightPanelOpen && (
        <button
          onClick={() => setIsRightPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-white border border-slate-200 border-r-0 rounded-l-xl px-2 py-3.5 shadow-md hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all flex flex-col items-center gap-2 group cursor-pointer"
          title="Open Date Details Panel"
        >
          <ChevronLeft className="w-4 h-4 text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-bold [writing-mode:vertical-rl] tracking-wider uppercase text-slate-500 group-hover:text-blue-600">
            Date Details
          </span>
        </button>
      )}

      {/* =========================================================================
          MAIN CALENDAR BODY (Split View: Calendar Grid + Right Detail Panel)
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Calendar Views (Month, Week, Day) */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col flex-1">
              {/* Day Headers (Sun, Mon, Tue, Wed, Thu, Fri, Sat) */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center py-2.5 text-xs font-medium text-slate-500">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-100">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                  const prevDayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
                  return (
                    <div key={`prev-${i}`} className="min-h-[110px] p-2 bg-slate-50/30 text-slate-300">
                      <span className="text-xs font-normal">{prevDayNum}</span>
                    </div>
                  );
                })}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const cellDate = new Date(year, month, dayNum);
                  const isSelected = isSameDay(cellDate, selectedDate);
                  const isToday = isSameDay(cellDate, new Date());
                  const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = eventsByDay[dayKey] || [];

                  return (
                    <div
                      key={`day-${dayNum}`}
                      onClick={() => {
                        setSelectedDate(cellDate);
                        if (!isRightPanelOpen) setIsRightPanelOpen(true);
                      }}
                      className={`min-h-[110px] p-2 transition-colors cursor-pointer flex flex-col ${
                        isSelected
                          ? 'bg-blue-50/40 ring-2 ring-blue-500 ring-inset z-10'
                          : 'hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-semibold inline-flex items-center justify-center ${
                            isSelected
                              ? 'w-6 h-6 rounded-full bg-blue-600 text-white shadow-2xs'
                              : isToday
                              ? 'w-6 h-6 rounded-full bg-slate-200 text-slate-800'
                              : 'text-slate-700'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {dayEvents.length > 3 && (
                          <span className="text-[10px] font-medium text-slate-400">
                            +{dayEvents.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Event Chips (Compact representation matching screenshot) */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((evt) => {
                          const isMeeting = evt.layer === 'MEETINGS' || evt.type === 'MEETING';
                          const isHoliday = evt.layer === 'HOLIDAYS' || evt.type === 'HOLIDAY';
                          const isLeave = evt.layer === 'LEAVE' || evt.type === 'LEAVE';
                          const isTask = evt.layer === 'TASKS' || evt.type === 'TASK';
                          const isUrgent = evt.details?.priority === 'HIGH' || evt.details?.priority === 'URGENT';

                          let badgeClasses = 'bg-slate-100 text-slate-800 border-slate-200';
                          if (isMeeting) {
                            badgeClasses = 'bg-blue-50/90 text-blue-800 border-blue-200/80 hover:bg-blue-100/90';
                          } else if (isHoliday) {
                            badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
                          } else if (isLeave) {
                            badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
                          } else if (isTask) {
                            badgeClasses = isUrgent
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100';
                          }

                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                                setIsEventDetailOpen(true);
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] leading-tight border transition-shadow truncate shadow-2xs ${badgeClasses}`}
                              title={`${evt.title} (${evt.startDate ? formatShortTime(evt.startDate) : ''})`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                {isMeeting && <Video className="w-3 h-3 text-blue-600 shrink-0" />}
                                {isTask && (
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      isUrgent ? 'bg-rose-500' : 'bg-purple-500'
                                    }`}
                                  />
                                )}
                                {isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                {isLeave && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}

                                <span className="font-semibold truncate">{evt.title}</span>
                              </div>

                              {/* Time or Subtitle */}
                              {!evt.allDay && evt.startDate && (
                                <div className="text-[10px] opacity-80 mt-0.5 truncate">
                                  {evt.endDate ? formatTimeRange(evt.startDate, evt.endDate) : formatShortTime(evt.startDate)}
                                </div>
                              )}
                              {isLeave && evt.details?.memberName && (
                                <div className="text-[10px] opacity-80 mt-0.5 truncate">
                                  {evt.details.memberName}
                                </div>
                              )}
                              {isHoliday && (
                                <div className="text-[10px] opacity-80 mt-0.5 truncate">
                                  Workspace Holiday
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-blue-600 font-medium pl-1 hover:underline">
                            + {dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Trailing empty cells */}
                {Array.from({
                  length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7,
                }).map((_, i) => (
                  <div key={`next-${i}`} className="min-h-[110px] p-2 bg-slate-50/30 text-slate-300">
                    <span className="text-xs font-normal">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col flex-1 p-4">
              <div className="grid grid-cols-7 gap-2 pb-3 border-b border-slate-200 text-center font-medium text-xs text-slate-600">
                {Array.from({ length: 7 }).map((_, i) => {
                  const weekDay = new Date(selectedDate);
                  weekDay.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
                  const isSel = isSameDay(weekDay, selectedDate);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(weekDay)}
                      className={`p-2 rounded-lg cursor-pointer ${isSel ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' : 'hover:bg-slate-50'}`}
                    >
                      <div className="text-[11px] text-slate-400">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                      </div>
                      <div className="text-sm mt-0.5">{weekDay.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Hourly Schedule Timeline */}
              <div className="space-y-3 mt-4 flex-1 overflow-y-auto">
                {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map((slot, idx) => (
                  <div key={idx} className="flex gap-4 items-start border-b border-slate-100 pb-3">
                    <div className="w-16 text-xs text-slate-400 shrink-0 font-medium">{slot}</div>
                    <div className="flex-1 grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const cellDay = new Date(selectedDate);
                        cellDay.setDate(selectedDate.getDate() - selectedDate.getDay() + dayIdx);
                        const k = `${cellDay.getFullYear()}-${String(cellDay.getMonth() + 1).padStart(2, '0')}-${String(cellDay.getDate()).padStart(2, '0')}`;
                        const dayEvts = (eventsByDay[k] || []).filter((e) => {
                          if (e.allDay) return idx === 0;
                          const hour = new Date(e.startDate).getHours();
                          const slotHour = idx < 3 ? 9 + idx : idx === 3 ? 12 : 14 + (idx - 4);
                          return hour === slotHour;
                        });

                        return (
                          <div key={dayIdx} className="min-h-[44px] bg-slate-50/50 rounded-lg p-1 text-[11px]">
                            {dayEvts.map((e) => (
                              <div
                                key={e.id}
                                onClick={() => { setSelectedEvent(e); setIsEventDetailOpen(true); }}
                                className="bg-blue-100 text-blue-900 border border-blue-200 p-1 rounded-sm cursor-pointer truncate mb-1"
                              >
                                {e.title}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col flex-1 p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-slate-500">Day timeline and scheduled activities</p>
                </div>
                <Button size="sm" onClick={() => handleOpenCreateModal(selectedDate)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" /> Create Event
                </Button>
              </div>

              <div className="space-y-4 mt-6 flex-1 overflow-y-auto">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No events scheduled on this day</p>
                    <p className="text-xs text-slate-400 mt-1">Enjoy a clear schedule or schedule a meeting</p>
                  </div>
                ) : (
                  selectedDayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => { setSelectedEvent(evt); setIsEventDetailOpen(true); }}
                      className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer bg-white flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-semibold">{evt.type}</Badge>
                          <h4 className="font-semibold text-slate-900">{evt.title}</h4>
                        </div>
                        {evt.description && <p className="text-xs text-slate-500">{evt.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {evt.allDay ? 'All Day' : formatTimeRange(evt.startDate, evt.endDate)}
                          </span>
                          {evt.locationUrl && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Video className="w-3.5 h-3.5" />
                              Video Call
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Bottom Disclaimer Banner */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Holidays are shown automatically based on your workspace location (Tamil Nadu).</span>
            </div>
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              View Holiday Calendar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            RIGHT-SIDE DATE DETAIL PANEL (+ Add button removed as requested)
           ========================================================================= */}
        {isRightPanelOpen && (
          <div className="w-80 md:w-96 bg-white border-l border-slate-200 flex flex-col p-5 overflow-y-auto shrink-0 shadow-xs animate-in slide-in-from-right duration-200">
            {/* Panel Header: Selected Date & Close Button (Notice: + Add button has been removed) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                title="Close side panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Groups */}
            <div className="space-y-5 mt-4 flex-1">
              {/* Group 1: Meetings */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Meetings
                </div>

                {selectedMeetings.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMeetings.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => { setSelectedEvent(m); setIsEventDetailOpen(true); }}
                        className="p-3 rounded-xl border border-slate-200/90 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer bg-white group flex items-center justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {m.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {formatTimeRange(m.startDate, m.endDate)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {m.teamName || 'Operations Team'} • {m.participants?.length || 5} participants
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No meetings scheduled
                  </div>
                )}
              </div>

              {/* Group 2: Tasks (Assigned tasks including End to End flow of HRMS Portal) */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  Tasks
                </div>

                {selectedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => { setSelectedEvent(t); setIsEventDetailOpen(true); }}
                        className="p-3 rounded-xl border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer bg-white group flex items-center justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors truncate">
                              {t.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                              {t.description || 'Complete assigned deliverables'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span className="text-purple-700 font-medium">
                                {t.details?.assigneeName || 'Assigned to you'}
                              </span>
                              <span>•</span>
                              <span>{t.startDate ? formatShortTime(t.startDate) : 'Due Today'}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No task deadlines on this date
                  </div>
                )}
              </div>

              {/* Group 3: Holidays or Leave */}
              {(selectedHolidays.length > 0 || selectedLeaves.length > 0) && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Holidays & Leave
                  </div>
                  <div className="space-y-2">
                    {selectedHolidays.map((h) => (
                      <div key={h.id} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-emerald-900">{h.title}</h4>
                          <p className="text-[10px] text-emerald-700">Official Tamil Nadu Public Holiday</p>
                        </div>
                      </div>
                    ))}
                    {selectedLeaves.map((l) => (
                      <div key={l.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center gap-3">
                        <User className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-900">{l.title}</h4>
                          <p className="text-[10px] text-amber-700">{l.description || 'Approved Leave'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 4: Placeholder when empty */}
              {selectedDayEvents.length === 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    No other events
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center">
                    <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">No other scheduled events</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Your day at a glance</p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Quick Actions</h4>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-2xs">
                  <button
                    onClick={() => handleOpenCreateModal(selectedDate)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      <span>Create Event</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={handleGoToToday}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <span>Go to Today</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setViewMode(viewMode === 'month' ? 'week' : viewMode === 'week' ? 'day' : 'month')}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className="w-4 h-4 text-slate-400" />
                      <span>Change View ({viewMode === 'month' ? 'Month' : viewMode === 'week' ? 'Week' : 'Day'})</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          CREATE EVENT MODAL (With Formal Audience Scopes & Member Selector)
         ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Schedule Event or Meeting</h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated permission-controlled invitations and notifications</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateEventSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Team Sync, Architecture Review"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Event Type & Formal Audience Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="COMPANY_EVENT">Company Event</option>
                    <option value="TASK">Task Deadline</option>
                    <option value="SHIFT">Work Shift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Audience Scope</label>
                  <select
                    value={formAudience}
                    onChange={(e: any) => setFormAudience(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white font-medium"
                  >
                    <option value="ALL">Open to All (Entire Organization)</option>
                    <option value="TEAM">Team Members</option>
                    <option value="DEPARTMENT">Departmental</option>
                    <option value="INDIVIDUALS">Specific Members</option>
                  </select>
                </div>
              </div>

              {/* AUDIENCE DETAILS: Open to All Banner */}
              {formAudience === 'ALL' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Open to All:</strong> This event is broadcast across the entire organization. All workspace members will receive calendar invitations and browser notifications.
                  </div>
                </div>
              )}

              {/* AUDIENCE DETAILS: Team Picker */}
              {formAudience === 'TEAM' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Target Team</label>
                  <select
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                  >
                    {teams.length > 0 ? (
                      teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="team_tech">Operations Team</option>
                        <option value="team_mktg">Marketing Team</option>
                      </>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">All members belonging to this team will be invited.</p>
                </div>
              )}

              {/* AUDIENCE DETAILS: Department Picker */}
              {formAudience === 'DEPARTMENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Target Department</label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                  >
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="dept_eng">Engineering & Operations</option>
                        <option value="dept_mktg">Marketing</option>
                        <option value="dept_hr">Human Resources</option>
                      </>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">All members belonging to this department will be invited.</p>
                </div>
              )}

              {/* AUDIENCE DETAILS: Specific Members Multi-Select Picker */}
              {formAudience === 'INDIVIDUALS' && (
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Select Individuals ({formSelectedMembers.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormSelectedMembers(availableMembers.map((m) => m.id))}
                        className="text-[11px] text-blue-600 hover:underline font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setFormSelectedMembers([])}
                        className="text-[11px] text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search box for members */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search member by name or email..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                    />
                  </div>

                  {/* Members Scroll List */}
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
                    {filteredMembersList.map((m) => {
                      const isChecked = formSelectedMembers.includes(m.id);
                      const name = `${m.user?.firstName || 'User'} ${m.user?.lastName || ''}`.trim();
                      const role = m.accessRole || 'MEMBER';

                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (isChecked) {
                              setFormSelectedMembers(formSelectedMembers.filter((id) => id !== m.id));
                            } else {
                              setFormSelectedMembers([...formSelectedMembers, m.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Controlled by container click
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <UserAvatar
                              avatarUrl={m.user?.avatarUrl}
                              firstName={m.user?.firstName}
                              lastName={m.user?.lastName}
                              seed={m.id}
                              size="xs"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 text-xs block truncate">{name}</span>
                              <span className="text-[10px] text-slate-400 truncate block">{m.user?.email || role}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 uppercase">
                            {role}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date & Time Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (!formEndDate) setFormEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="allDayCheckbox"
                    checked={formAllDay}
                    onChange={(e) => setFormAllDay(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="allDayCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                    All-Day Event
                  </label>
                </div>
              </div>

              {!formAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Meeting Link / Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Link or Location</label>
                <div className="relative">
                  <Video className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="https://meet.google.com/xxx or Conference Room 1"
                    value={formLocationUrl}
                    onChange={(e) => setFormLocationUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Key agenda points, deliverables, or objectives..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Recurrence & Reminder */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Recurrence</label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="NONE">Does not repeat</option>
                    <option value="DAILY">Repeats Daily</option>
                    <option value="WEEKLY">Repeats Weekly</option>
                    <option value="MONTHLY">Repeats Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Reminder</label>
                  <select
                    value={formReminder}
                    onChange={(e) => setFormReminder(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-2xs"
                >
                  {isSubmitting ? 'Scheduling...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          EVENT DETAILS & RSVP MODAL
         ========================================================================= */}
      {isEventDetailOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase mb-1">
                    {selectedEvent.type}
                  </Badge>
                  <h3 className="text-base font-bold text-slate-900">{selectedEvent.title}</h3>
                </div>
                <button onClick={() => setIsEventDetailOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Details Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Date & Time */}
              <div className="flex items-center gap-2.5 text-slate-700">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-semibold">
                    {new Date(selectedEvent.startDate).toLocaleDateString('default', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {!selectedEvent.allDay && (
                    <span className="text-slate-500 ml-1.5">
                      ({formatTimeRange(selectedEvent.startDate, selectedEvent.endDate)})
                    </span>
                  )}
                </div>
              </div>

              {/* Location or Meeting Link */}
              {selectedEvent.locationUrl && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Video className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-blue-900 font-medium truncate">{selectedEvent.locationUrl}</span>
                  </div>
                  <a
                    href={selectedEvent.locationUrl.startsWith('http') ? selectedEvent.locationUrl : `https://${selectedEvent.locationUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 shadow-2xs"
                  >
                    Join <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedEvent.description}
                </div>
              )}

              {/* Organizer */}
              {selectedEvent.organizer && (
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Organized by <strong className="text-slate-800">{selectedEvent.organizer.name}</strong></span>
                </div>
              )}

              {/* Participants & RSVPs */}
              {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Participants ({selectedEvent.participants.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedEvent.participants.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 text-[11px]">
                        <span className="font-medium text-slate-700">{p.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'DECLINED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : p.status === 'TENTATIVE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RSVP Actions for invited members */}
              {selectedEvent.participants && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Your Response:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleRsvp(selectedEvent.id, 'ACCEPTED')}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleRsvp(selectedEvent.id, 'TENTATIVE')}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Maybe
                    </button>
                    <button
                      onClick={() => handleRsvp(selectedEvent.id, 'DECLINED')}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsEventDetailOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAMIL NADU & WORKSPACE HOLIDAY CALENDAR MODAL
         ========================================================================= */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tamil Nadu Public & Company Holidays</h3>
                <p className="text-xs text-slate-500">Official recognized regional calendar for {year}</p>
              </div>
              <button onClick={() => setIsHolidayModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 divide-y divide-slate-100 text-xs">
              {events
                .filter((e) => e.layer === 'HOLIDAYS' || e.type === 'HOLIDAY')
                .map((h) => (
                  <div key={h.id} className="pt-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{h.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{h.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-700">
                        {new Date(h.startDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        {h.status === 'COMPANY' ? 'Company Holiday' : 'Public Holiday'}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
