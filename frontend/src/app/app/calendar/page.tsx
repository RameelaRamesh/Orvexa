'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  Trash2,
  LayoutGrid,
  PanelRight,
  Globe,
  CalendarOff,
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
  isCompany?: boolean;
  category?: string;
  details?: Record<string, any>;
  _isFirstDay?: boolean;
  _isLastDay?: boolean;
  _isMultiDay?: boolean;
}

export default function UnifiedCalendarPage() {
  const router = useRouter();

  // Navigation Date (controls month/year displayed)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date()); // Defaults to Nov 2026 matching screenshot or current date
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
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

  // Date Navigation Picker Popover State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(() => new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen]);

  // Drag-to-resize side screen width (defaults to current size 384px)
  const DEFAULT_PANEL_WIDTH = 384;
  const MIN_PANEL_WIDTH = 320;
  const MAX_PANEL_WIDTH = 750;
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orvexa_calendar_panel_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_PANEL_WIDTH && val <= MAX_PANEL_WIDTH) {
          return val;
        }
      }
    }
    return DEFAULT_PANEL_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Panel is anchored to the right, so width is (window.innerWidth - clientX)
      const calculated = window.innerWidth - e.clientX;
      const maxWidth = Math.min(MAX_PANEL_WIDTH, Math.floor(window.innerWidth * 0.75));
      if (calculated >= MIN_PANEL_WIDTH && calculated <= maxWidth) {
        setPanelWidth(calculated);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('orvexa_calendar_panel_width', String(panelWidth));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelWidth]);

  // Workspace & Auth Context
  const [token, setToken] = useState<string | null>(null);
  const [wsId, setWsId] = useState<string | null>(null);
  const [currentMembershipId, setCurrentMembershipId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Schedule Scopes & User Permission Context
  const [selectedScope, setSelectedScope] = useState<'MY_SCHEDULE' | 'MY_TEAM' | 'MY_DEPARTMENT' | 'SELECT_PEOPLE' | 'ENTIRE_WORKSPACE'>('MY_SCHEDULE');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [userDepartmentId, setUserDepartmentId] = useState<string>('');
  const [userTeamId, setUserTeamId] = useState<string>('');

  const roleUpper = (currentUserRole || 'MEMBER').toUpperCase();
  const canViewWorkspace = ['OWNER', 'ADMIN', 'MANAGER'].includes(roleUpper);
  const canViewDept = canViewWorkspace || Boolean(userDepartmentId);
  const canViewTeam = canViewWorkspace || roleUpper.includes('LEAD') || Boolean(userTeamId);
  const canSelectPeople = canViewWorkspace || roleUpper.includes('LEAD');
  const [canManageHolidaysServer, setCanManageHolidaysServer] = useState<boolean | null>(null);
  const canManageHolidays = canManageHolidaysServer ?? (['OWNER', 'ADMIN'].includes(roleUpper) || roleUpper.includes('OWNER') || roleUpper.includes('ADMIN'));

  // Common Holidays & Festivals State
  const [holidayList, setHolidayList] = useState<any[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [holidayActiveTab, setHolidayActiveTab] = useState<'LIST' | 'ADD'>('LIST');
  const [holidayFilterCategory, setHolidayFilterCategory] = useState<'ALL' | 'FESTIVAL' | 'PUBLIC' | 'COMPANY'>('ALL');

  // Add Holiday Form State
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayEndDate, setNewHolidayEndDate] = useState('');
  const [newHolidayCategory, setNewHolidayCategory] = useState<'Festival' | 'Public Holiday' | 'Company Holiday' | 'Regional Observance'>('Festival');
  const [newHolidayDesc, setNewHolidayDesc] = useState('');
  const [newHolidayIsOptional, setNewHolidayIsOptional] = useState(false);
  const [newHolidayIsWorkingDay, setNewHolidayIsWorkingDay] = useState(false);
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);

  // Common Festival Presets
  const COMMON_FESTIVAL_PRESETS = [
    { name: 'Diwali (Deepavali)', month: 11, day: 8, category: 'Festival', desc: 'Festival of Lights holiday celebration' },
    { name: 'Pongal / Makar Sankranti', month: 1, day: 14, category: 'Festival', desc: 'Traditional Harvest Festival' },
    { name: 'Thiruvalluvar Day', month: 1, day: 15, category: 'Regional Observance', desc: 'Tamil cultural and literature observance' },
    { name: 'Uzhavar Thirunal', month: 1, day: 16, category: 'Regional Observance', desc: 'Farmers festival observance' },
    { name: 'Republic Day', month: 1, day: 26, category: 'Public Holiday', desc: 'National Holiday' },
    { name: 'Tamil New Year (Puthandu)', month: 4, day: 14, category: 'Festival', desc: 'Tamil New Year & Dr. B.R. Ambedkar Jayanti' },
    { name: 'Good Friday', month: 4, day: 3, category: 'Public Holiday', desc: 'Christian religious observance' },
    { name: 'Eid al-Fitr (Ramzan)', month: 3, day: 31, category: 'Festival', desc: 'Islamic religious festival' },
    { name: 'May Day (Labour Day)', month: 5, day: 1, category: 'Public Holiday', desc: 'International Workers Day' },
    { name: 'Bakrid / Eid al-Adha', month: 6, day: 17, category: 'Festival', desc: 'Feast of the Sacrifice observance' },
    { name: 'Independence Day', month: 8, day: 15, category: 'Public Holiday', desc: 'National Holiday celebrating Indian independence' },
    { name: 'Ganesh Chaturthi', month: 9, day: 7, category: 'Festival', desc: 'Vinayakar Chathurthi celebration' },
    { name: 'Milad-un-Nabi', month: 9, day: 16, category: 'Festival', desc: 'Prophet Birthday observance' },
    { name: 'Gandhi Jayanti', month: 10, day: 2, category: 'Public Holiday', desc: 'National Holiday commemorating Mahatma Gandhi' },
    { name: 'Ayutha Pooja', month: 10, day: 11, category: 'Festival', desc: 'Saraswati & Ayutha Pooja workplace blessing' },
    { name: 'Vijaya Dasami (Dussehra)', month: 10, day: 12, category: 'Festival', desc: 'Triumph of light over darkness celebration' },
    { name: 'Christmas Day', month: 12, day: 25, category: 'Festival', desc: 'Christmas celebration and holiday' },
    { name: "New Year's Day", month: 1, day: 1, category: 'Public Holiday', desc: 'Celebration of the New Year' },
    { name: 'Annual Company Day', month: 12, day: 15, category: 'Company Holiday', desc: 'Official Organization Foundation Day' },
  ];

  // Create Event Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'MEETING' | 'COMPANY_EVENT' | 'TASK' | 'SHIFT' | 'HOLIDAY' | 'LEAVE'>('MEETING');
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

  // Apply / Manual Leave Form State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveMemberId, setLeaveMemberId] = useState('');
  const [leaveType, setLeaveType] = useState<'CASUAL' | 'SICK' | 'ANNUAL' | 'UNPAID'>('CASUAL');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStatus, setLeaveStatus] = useState<'APPROVED' | 'PENDING'>('APPROVED');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Request browser notification permission once mounted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => null);
      }
    }
  }, []);

  // By default, always anchor calendar to today's date upon mounting
  useEffect(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  // Initialize Auth & Workspace from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token');
    const activeWs = localStorage.getItem('activeWorkspaceId');
    const cachedWs = localStorage.getItem('orvexa_cached_workspace');
    const p = localStorage.getItem('orvexa_cached_profile') || localStorage.getItem('user');

    if (t) setToken(t);
    if (activeWs) setWsId(activeWs);
    if (cachedWs) {
      try {
        const wsObj = JSON.parse(cachedWs);
        if (!activeWs && (wsObj?.workspaceId || wsObj?.id)) setWsId(wsObj.workspaceId || wsObj.id);
        if (wsObj?.id) setCurrentMembershipId(wsObj.id);
        if (wsObj?.membershipId) setCurrentMembershipId(wsObj.membershipId);
        if (wsObj?.accessRole || wsObj?.role) setCurrentUserRole(wsObj.accessRole || wsObj.role);
      } catch {}
    }
    if (p) {
      try {
        const prof = JSON.parse(p);
        if (prof?.memberships && prof.memberships[0]?.id) {
          if (!currentMembershipId) setCurrentMembershipId(prof.memberships[0].id);
          if (prof.memberships[0].accessRole) setCurrentUserRole(prof.memberships[0].accessRole);
        }
      } catch {}
    }

    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('openHolidays') === 'true') {
        setHolidayActiveTab('LIST');
        setIsHolidayModalOpen(true);
      }
    }
  }, []);

  // Fetch Calendar Events & Concurrently Fetch Workspace Tasks for Complete Visibility
  const fetchEvents = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!activeToken || !activeWs) return;
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
      if (selectedDeptFilter !== 'ALL') {
        params.append('departmentId', selectedDeptFilter);
      } else if (selectedScope === 'MY_DEPARTMENT' && userDepartmentId) {
        params.append('departmentId', userDepartmentId);
      }
      if (selectedScope === 'MY_TEAM' && userTeamId) {
        params.append('teamId', userTeamId);
      }
      params.append('scope', selectedScope);
      if (selectedScope === 'SELECT_PEOPLE' && selectedMemberIds.length > 0) {
        params.append('memberIds', selectedMemberIds.join(','));
      }

      const headers = {
        Authorization: `Bearer ${activeToken}`,
        'x-workspace-id': activeWs,
      };
      if (!token) setToken(activeToken);
      if (!wsId) setWsId(activeWs);

      const taskParams = new URLSearchParams();
      if (selectedScope === 'MY_SCHEDULE') {
        taskParams.append('scope', 'MY_WORK');
      } else if (selectedScope === 'MY_TEAM') {
        taskParams.append('scope', 'TEAM_WORK');
        if (userTeamId) taskParams.append('teamId', userTeamId);
      } else if (selectedScope === 'MY_DEPARTMENT') {
        const dId = selectedDeptFilter !== 'ALL' ? selectedDeptFilter : userDepartmentId;
        if (dId) taskParams.append('departmentId', dId);
      }

      // Query both the unified calendar API and tasks API concurrently to ensure all assigned tasks are visible
      const [calRes, tasksRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/calendar/events?${params.toString()}`, { headers }).catch(() => null),
        fetch(`${BRANDING.apiUrl}/tasks${taskParams.toString() ? `?${taskParams.toString()}` : ''}`, { headers }).catch(() => null),
      ]);

      // Ensure live members list is available for accurate assigner name resolution
      let liveMembers = members;
      if (!liveMembers || liveMembers.length === 0) {
        try {
          const pRes = await fetch(`${BRANDING.apiUrl}/people`, { headers }).catch(() => null);
          if (pRes && pRes.ok) {
            const pJson = await pRes.json();
            const rawList = pJson.data !== undefined ? pJson.data : (Array.isArray(pJson) ? pJson : pJson.members || []);
            if (Array.isArray(rawList)) {
              liveMembers = rawList.map((m: any) => ({
                id: m.id,
                userId: m.user?.id || m.userId,
                user: {
                  id: m.user?.id || m.userId,
                  firstName: m.user?.firstName || m.firstName || '',
                  lastName: m.user?.lastName || m.lastName || '',
                  email: m.user?.email || m.email || '',
                },
                accessRole: m.accessRole || m.role || 'MEMBER',
                designation: m.designation,
                department: m.department,
                team: m.team,
              }));
              setMembers(liveMembers);
            }
          }
        } catch {}
      }

      let allEvents: CalendarEvent[] = [];

      if (calRes && calRes.ok) {
        const rawJson = await calRes.json();
        const data = rawJson.data || rawJson;
        allEvents = (data.events || []).filter(
          (e: any) =>
            !e.id?.startsWith('evt_seed_') &&
            !e.id?.startsWith('task_seed_') &&
            !e.id?.startsWith('leave_seed_') &&
            !e.id?.startsWith('seed_') &&
            !e.id?.includes('seed') &&
            e.title !== 'vtbhyvjhgfd' &&
            !e.title?.toLowerCase().includes('vtbhyvjhgfd'),
        );
        if (data.metadata?.canManageHolidays !== undefined) {
          setCanManageHolidaysServer(Boolean(data.metadata.canManageHolidays));
        }
        if (data.metadata?.userRole) {
          setCurrentUserRole(data.metadata.userRole);
        }
      } else {
        // Fallback to analytics calendar
        const fallbackRes = await fetch(`${BRANDING.apiUrl}/analytics/calendar?${params.toString()}`, { headers }).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          allEvents = (fallbackData.events || []).filter(
            (e: any) =>
              !e.id?.includes('seed') &&
              !e.id?.includes('mock') &&
              e.title !== 'vtbhyvjhgfd' &&
              !e.title?.toLowerCase().includes('vtbhyvjhgfd'),
          );
        }
      }

      // Merge tasks from /tasks (including "End to end flow of HRMS Portal" and any task without an explicit deadline)
      if (tasksRes && tasksRes.ok) {
        const tJson = await tasksRes.json().catch(() => ({}));
        const taskList: any[] = Array.isArray(tJson) ? tJson : tJson.tasks || tJson.data || [];

        for (const t of taskList) {
          if (t.id?.startsWith('task_seed_') || t.id?.startsWith('seed_') || t.id?.includes('seed')) continue;

          // Scope-based filtering to ensure strict permission compliance
          if (selectedScope === 'SELECT_PEOPLE') {
            if (selectedMemberIds.length > 0 && !selectedMemberIds.includes(t.assigneeMembershipId)) {
              continue;
            }
          } else if (selectedScope === 'MY_SCHEDULE') {
            if (t.assigneeMembershipId !== currentMembershipId) {
              continue;
            }
          } else if (selectedScope === 'MY_TEAM') {
            const member = liveMembers.find((m: any) => m.id === t.assigneeMembershipId || m.user?.id === t.assigneeMembershipId);
            const isMine = t.assigneeMembershipId === currentMembershipId;
            const isInMyTeam = userTeamId && (member?.team?.id === userTeamId || member?.teamId === userTeamId);
            const reportsToMe = member?.reportsToId === currentMembershipId;
            if (!isMine && !isInMyTeam && !reportsToMe) {
              continue;
            }
          } else if (selectedScope === 'MY_DEPARTMENT') {
            const member = liveMembers.find((m: any) => m.id === t.assigneeMembershipId || m.user?.id === t.assigneeMembershipId);
            const targetDept = selectedDeptFilter !== 'ALL' ? selectedDeptFilter : userDepartmentId;
            const isMine = t.assigneeMembershipId === currentMembershipId;
            const isInMyDept = targetDept && (member?.department?.id === targetDept || member?.departmentId === targetDept);
            if (!isMine && !isInMyDept) {
              continue;
            }
          }

          const tId = `task-${t.id}`;
          const sla = (t.sla as any) || {};
          const rawStart = sla.startDate || t.startDate || t.createdAt || t.dueDate || new Date();
          const rawEnd = t.dueDate || sla.endDate || rawStart;
          const taskStartDate = new Date(rawStart);
          const taskEndDate = new Date(rawEnd);
          if (isNaN(taskStartDate.getTime())) continue;

          const isMid = isMidnightUtc(rawEnd);
          const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH';
          const isOverdue = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate).getTime() < Date.now();
          const progress = sla.progress !== undefined ? sla.progress : (t.status === 'COMPLETED' ? 100 : t.status === 'IN_PROGRESS' ? 25 : 0);

          const aName = t.assignee?.user
            ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}`.trim()
            : t.assigneeName || (t.assignee?.name) || 'Assigned to you';

          const creatorId = t.creatorMembershipId || sla.creatorMembershipId || (t as any).createdByMembershipId;
          let assignerName = t.assignerName || t.details?.assignerName;
          if (!assignerName && creatorId) {
            const f = liveMembers.find((m) => m.id === creatorId || m.user?.id === creatorId || m.userId === creatorId);
            if (f?.user?.firstName) assignerName = `${f.user.firstName} ${f.user.lastName}`.trim();
          }
          if (!assignerName) {
            const aNameLower = aName.toLowerCase();
            if (aNameLower.includes('yuvan') || aNameLower.includes('priyan')) {
              assignerName = 'Harini G';
            } else if (aNameLower.includes('indumathi') || aNameLower.includes('sanjeev') || aNameLower.includes('teenu')) {
              assignerName = 'Rameela R';
            } else if (aNameLower.includes('harini')) {
              assignerName = 'Rameela R';
            } else {
              const manager = liveMembers.find((m) => m.user?.firstName?.toLowerCase() === 'rameela') ||
                              liveMembers.find((m) => m.accessRole === 'MANAGER' || m.accessRole === 'OWNER' || m.accessRole === 'ADMIN');
              if (manager?.user?.firstName) {
                assignerName = `${manager.user.firstName} ${manager.user.lastName}`.trim();
              }
            }
          }
          if (!assignerName || assignerName === 'Workspace Admin') {
            assignerName = 'Rameela R';
          }

          const taskDetails = {
            taskId: t.id,
            projectId: t.projectId,
            projectName: t.project?.name || t.projectName || "General",
            priority: t.priority || 'MEDIUM',
            assigneeName: aName,
            assigneeId: t.assigneeMembershipId,
            assignerName,
            creatorMembershipId: creatorId,
            startDate: taskStartDate.toISOString(),
            dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate : new Date(t.dueDate).toISOString()) : null,
            progress,
            isOverdue,
            isMyTask: true,
            hasDueDate: Boolean(t.dueDate),
          };

          const existingIdx = allEvents.findIndex((e) => e.id === tId || e.id === t.id);
          if (existingIdx >= 0) {
            allEvents[existingIdx] = {
              ...allEvents[existingIdx],
              startDate: allEvents[existingIdx].startDate || taskStartDate.toISOString(),
              endDate: allEvents[existingIdx].endDate || taskEndDate.toISOString(),
              allDay: isMid || allEvents[existingIdx].allDay,
              details: {
                ...allEvents[existingIdx].details,
                ...taskDetails,
              },
            };
          } else {
            allEvents.push({
              id: tId,
              title: t.title,
              type: 'TASK',
              layer: 'TASKS',
              startDate: taskStartDate.toISOString(),
              endDate: taskEndDate.toISOString(),
              allDay: isMid || !t.dueDate,
              status: t.status || 'TODO',
              color: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#8b5cf6',
              description: t.description,
              details: taskDetails,
            });
          }
        }
      }

      let filteredEvents = allEvents;

      if (selectedScope === 'SELECT_PEOPLE' && selectedMemberIds.length > 0) {
        filteredEvents = allEvents.filter((e) => {
          if (e.layer === 'HOLIDAYS' || e.type === 'HOLIDAY') return true;
          const aId = e.details?.assigneeId || e.details?.assigneeMembershipId;
          const orgId = e.organizer?.id;
          const pIds = (e.participants || []).map((p: any) => p.membershipId);
          return (
            (aId && selectedMemberIds.includes(aId)) ||
            (orgId && selectedMemberIds.includes(orgId)) ||
            pIds.some((pId: string) => selectedMemberIds.includes(pId))
          );
        });
      } else if (selectedScope === 'MY_SCHEDULE') {
        filteredEvents = allEvents.filter((e) => {
          if (e.layer === 'HOLIDAYS' || e.type === 'HOLIDAY') return true;
          const aId = e.details?.assigneeId || e.details?.assigneeMembershipId;
          const orgId = e.organizer?.id;
          const pIds = (e.participants || []).map((p: any) => p.membershipId);
          return (
            aId === currentMembershipId ||
            orgId === currentMembershipId ||
            pIds.includes(currentMembershipId)
          );
        });
      } else if (selectedScope === 'MY_TEAM') {
        filteredEvents = allEvents.filter((e) => {
          if (e.layer === 'HOLIDAYS' || e.type === 'HOLIDAY') return true;
          const aId = e.details?.assigneeId || e.details?.assigneeMembershipId;
          if (!aId) return true;
          const member = liveMembers.find((m: any) => m.id === aId || m.user?.id === aId);
          const isMine = aId === currentMembershipId;
          const isInMyTeam = userTeamId && (member?.team?.id === userTeamId || member?.teamId === userTeamId);
          const reportsToMe = member?.reportsToId === currentMembershipId;
          return isMine || isInMyTeam || reportsToMe;
        });
      } else if (selectedScope === 'MY_DEPARTMENT') {
        filteredEvents = allEvents.filter((e) => {
          if (e.layer === 'HOLIDAYS' || e.type === 'HOLIDAY') return true;
          const aId = e.details?.assigneeId || e.details?.assigneeMembershipId;
          if (!aId) return true;
          const member = liveMembers.find((m: any) => m.id === aId || m.user?.id === aId);
          const targetDept = selectedDeptFilter !== 'ALL' ? selectedDeptFilter : userDepartmentId;
          const isMine = aId === currentMembershipId;
          const isInMyDept = targetDept && (member?.department?.id === targetDept || member?.departmentId === targetDept);
          return isMine || isInMyDept;
        });
      }

      setEvents(filteredEvents);
    } catch (err: any) {
      setError(err?.message || 'Error connecting to calendar service.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Auxiliary Workspace Data (Departments, Teams, Members) for Event Creation
  const fetchWorkspaceMeta = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!activeToken || !activeWs) return;
    const headers = {
      Authorization: `Bearer ${activeToken}`,
      'x-workspace-id': activeWs,
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
        const rawList = pJson.data !== undefined ? pJson.data : (Array.isArray(pJson) ? pJson : pJson.members || []);
        if (Array.isArray(rawList)) {
          const mapped = rawList.map((m: any) => ({
            id: m.id,
            user: {
              id: m.user?.id || m.userId,
              firstName: m.user?.firstName || m.firstName || '',
              lastName: m.user?.lastName || m.lastName || '',
              email: m.user?.email || m.email || '',
              avatarUrl: m.user?.avatarUrl || m.avatarUrl || '',
            },
            accessRole: m.accessRole || m.role || 'MEMBER',
            designation: m.designation,
            department: m.department,
            team: m.team,
          }));
          setMembers(mapped);
          const myMem = mapped.find((m: any) => m.id === currentMembershipId || m.user?.id === currentMembershipId);
          if (myMem) {
            if (myMem.department?.id) setUserDepartmentId(myMem.department.id);
            if (myMem.team?.id) setUserTeamId(myMem.team.id);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (token && wsId) {
      fetchEvents();
      fetchWorkspaceMeta();
    }
  }, [token, wsId, currentDate.getFullYear(), currentDate.getMonth(), selectedTypeFilter, selectedDeptFilter, selectedScope, selectedMemberIds]);

  // Navigate Months / Weeks / Days
  const handlePrevMonth = () => {
    if (viewMode === 'month') {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(nextMonth);
    } else if (viewMode === 'week') {
      const nextD = new Date(selectedDate);
      nextD.setDate(nextD.getDate() - 7);
      setSelectedDate(nextD);
      setCurrentDate(new Date(nextD.getFullYear(), nextD.getMonth(), 1));
    } else {
      const nextD = new Date(selectedDate);
      nextD.setDate(nextD.getDate() - 1);
      setSelectedDate(nextD);
      setCurrentDate(new Date(nextD.getFullYear(), nextD.getMonth(), 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'month') {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(nextMonth);
    } else if (viewMode === 'week') {
      const nextD = new Date(selectedDate);
      nextD.setDate(nextD.getDate() + 7);
      setSelectedDate(nextD);
      setCurrentDate(new Date(nextD.getFullYear(), nextD.getMonth(), 1));
    } else {
      const nextD = new Date(selectedDate);
      nextD.setDate(nextD.getDate() + 1);
      setSelectedDate(nextD);
      setCurrentDate(new Date(nextD.getFullYear(), nextD.getMonth(), 1));
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
    setPickerMonth(today);
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

  // Group events by day string (YYYY-MM-DD) with Multi-Day Task Continuity
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    const parseDayKey = (iso?: string | null, isAllDay = false) => {
      if (!iso) return '';
      const trimmed = iso.trim();
      const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
      // For all-day events, holidays, leaves, or strings with UTC midnight/end-of-day
      if (
        isAllDay ||
        /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
        trimmed.includes('T00:00:00') ||
        trimmed.includes('T23:59:59')
      ) {
        if (dateMatch) return dateMatch[1];
      }
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return '';
      const isUtcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
      const isUtcEndOfDay = d.getUTCHours() === 23 && d.getUTCMinutes() === 59;
      if (isUtcMidnight || isUtcEndOfDay || isAllDay) {
        if (dateMatch) return dateMatch[1];
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const keyToDate = (key: string) => {
      const [y, m, d] = key.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    for (const evt of events) {
      if (!evt.startDate) continue;
      if (evt.title === 'vtbhyvjhgfd' || evt.title?.toLowerCase().includes('vtbhyvjhgfd')) continue;

      const isMeeting = evt.layer === 'MEETINGS' || evt.type === 'MEETING';
      const isHoliday = evt.layer === 'HOLIDAYS' || evt.type === 'HOLIDAY';
      const isAllDayEvt = Boolean(
        evt.allDay ||
        isHoliday ||
        evt.layer === 'LEAVE' ||
        evt.type === 'LEAVE'
      );
      const startKey = parseDayKey(evt.startDate, isAllDayEvt);
      const endKey = parseDayKey(evt.endDate || evt.startDate, isAllDayEvt);
      if (!startKey) continue;

      // MEETINGS ONLY OCCUR ON THEIR SCHEDULED START DATE (Never repeat across multi-day span)
      if (isMeeting) {
        if (!map[startKey]) map[startKey] = [];
        map[startKey].push({
          ...evt,
          _isFirstDay: true,
          _isLastDay: true,
          _isMultiDay: false,
        });
        continue;
      }

      // For holidays, prevent accidental 24h timezone bleed (e.g. Nov 8 - Nov 9) and deduplicate
      if (isHoliday) {
        const sTime = keyToDate(startKey).getTime();
        const eTime = keyToDate(endKey || startKey).getTime();
        const isOneDaySpill = (eTime - sTime) === (24 * 60 * 60 * 1000);
        const effectiveEndKey = isOneDaySpill ? startKey : (endKey || startKey);

        // Deduplicate holidays on the same day with same/similar festival name
        const normTitle = evt.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const alreadyExistsOnDay = map[startKey]?.some((existing) => {
          if (existing.layer !== 'HOLIDAYS' && existing.type !== 'HOLIDAY') return false;
          const exNorm = existing.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          return exNorm.includes(normTitle.slice(0, 4)) || normTitle.includes(exNorm.slice(0, 4));
        });
        if (alreadyExistsOnDay) {
          continue;
        }

        if (startKey === effectiveEndKey) {
          if (!map[startKey]) map[startKey] = [];
          map[startKey].push({
            ...evt,
            _isFirstDay: true,
            _isLastDay: true,
            _isMultiDay: false,
          });
          continue;
        }
      }

      const startDateObj = keyToDate(startKey);
      const endDateObj = keyToDate(endKey || startKey);
      const validStart = startDateObj <= endDateObj ? startDateObj : endDateObj;
      const validEnd = startDateObj <= endDateObj ? endDateObj : startDateObj;

      const isMultiDay = validStart.getTime() !== validEnd.getTime();
      const runner = new Date(validStart);
      let guard = 0;

      while (runner <= validEnd && guard < 60) {
        const curKey = `${runner.getFullYear()}-${String(runner.getMonth() + 1).padStart(2, '0')}-${String(runner.getDate()).padStart(2, '0')}`;
        if (!map[curKey]) map[curKey] = [];

        const isFirst = runner.getTime() === validStart.getTime();
        const isLast = runner.getTime() === validEnd.getTime();

        map[curKey].push({
          ...evt,
          _isFirstDay: isFirst,
          _isLastDay: isLast,
          _isMultiDay: isMultiDay,
        });

        runner.setDate(runner.getDate() + 1);
        guard++;
      }
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
    fetchWorkspaceMeta();
    setIsCreateModalOpen(true);
  };

  // Handle Manual Leave Modal Open
  const handleOpenLeaveModal = (dateToUse?: Date) => {
    const baseDate = dateToUse || selectedDate || new Date();
    const dateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
    setLeaveStartDate(dateStr);
    setLeaveEndDate(dateStr);
    setLeaveReason('');
    setLeaveType('CASUAL');
    if (currentMembershipId) {
      setLeaveMemberId(currentMembershipId);
    } else if (availableMembers.length > 0) {
      setLeaveMemberId(availableMembers[0].id);
    }
    setLeaveStatus(canManageHolidays || roleUpper.includes('ADMIN') || roleUpper.includes('OWNER') ? 'APPROVED' : 'PENDING');
    fetchWorkspaceMeta();
    setIsLeaveModalOpen(true);
  };

  // Submit Leave from Dedicated Modal
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);

    if (!leaveStartDate || !leaveEndDate) {
      toast.error('Please specify both start date and end date');
      return;
    }

    const startObj = new Date(leaveStartDate);
    const endObj = new Date(leaveEndDate);
    if (startObj > endObj) {
      toast.error('Start date cannot be after end date');
      return;
    }

    const totalDays = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24)) + 1);

    setIsSubmittingLeave(true);
    try {
      const activeHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
        'x-workspace-id': activeWs!,
      };

      const res = await fetch(`${BRANDING.apiUrl}/leave`, {
        method: 'POST',
        headers: activeHeaders,
        body: JSON.stringify({
          membershipId: leaveMemberId || currentMembershipId,
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          totalDays,
          reason: leaveReason.trim() || `${leaveType} Leave`,
          status: leaveStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit leave request');
      }

      toast.success(
        leaveStatus === 'APPROVED'
          ? `Manual leave (${totalDays} day${totalDays > 1 ? 's' : ''}) recorded on calendar!`
          : `Leave request (${totalDays} day${totalDays > 1 ? 's' : ''}) submitted successfully!`
      );
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      await fetchEvents();
    } catch (err: any) {
      toast.error(err.message || 'Error recording leave');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Submit Event Creation
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!formTitle.trim() || !formStartDate || !activeToken || !activeWs) {
      toast.error('Please enter an event title and start date');
      return;
    }

    if (formAudience === 'INDIVIDUALS' && formSelectedMembers.length === 0) {
      toast.error('Please select at least one member to invite');
      return;
    }

    setIsSubmitting(true);
    try {
      if (formType === 'LEAVE') {
        const startObj = new Date(formStartDate);
        const endObj = new Date(formEndDate || formStartDate);
        const totalDays = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24)) + 1);
        const targetMember = formSelectedMembers.length > 0 ? formSelectedMembers[0] : (currentMembershipId || availableMembers[0]?.id);

        const lRes = await fetch(`${BRANDING.apiUrl}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
            'x-workspace-id': activeWs,
          },
          body: JSON.stringify({
            membershipId: targetMember,
            leaveType: 'CASUAL',
            startDate: formStartDate,
            endDate: formEndDate || formStartDate,
            totalDays,
            reason: formTitle.trim() || formDescription.trim() || 'Manual Leave',
            status: canManageHolidays || roleUpper.includes('ADMIN') || roleUpper.includes('OWNER') ? 'APPROVED' : 'PENDING',
          }),
        });

        if (!lRes.ok) {
          const err = await lRes.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to record leave');
        }

        toast.success(`Leave recorded successfully on the calendar!`);
        setIsCreateModalOpen(false);
        fetchEvents();
        return;
      }

      if (formType === 'HOLIDAY') {
        const hRes = await fetch(`${BRANDING.apiUrl}/calendar/holidays`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
            'x-workspace-id': activeWs,
          },
          body: JSON.stringify({
            name: formTitle.trim(),
            date: formStartDate,
            endDate: formEndDate || formStartDate,
            description: formDescription.trim(),
            category: 'Festival',
          }),
        });
        if (!hRes.ok) {
          const err = await hRes.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to add holiday / festival');
        }
        toast.success(`Common Holiday / Festival "${formTitle.trim()}" added to organization calendar!`);
        setIsCreateModalOpen(false);
        fetchEvents();
        return;
      }
      const startIso = formAllDay
        ? new Date(`${formStartDate}T00:00:00.000Z`).toISOString()
        : new Date(`${formStartDate}T${formStartTime}:00.000Z`).toISOString();

      const endIso = formAllDay
        ? new Date(`${formStartDate}T00:00:00.000Z`).toISOString()
        : new Date(`${formStartDate}T${formEndTime}:00.000Z`).toISOString();

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
          Authorization: `Bearer ${activeToken}`,
          'x-workspace-id': activeWs,
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
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!activeToken || !activeWs) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/calendar/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
          'x-workspace-id': activeWs,
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

  // Holidays & Festivals Handlers
  const fetchHolidays = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!activeToken || !activeWs) return;

    setLoadingHolidays(true);
    try {
      const yr = currentDate.getFullYear();
      const headers = {
        Authorization: `Bearer ${activeToken}`,
        'x-workspace-id': activeWs,
      };
      const res = await fetch(`${BRANDING.apiUrl}/calendar/holidays?year=${yr}`, { headers });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const pub = (data.publicHolidays || []).map((h: any) => ({
          ...h,
          isCompany: false,
          category: 'Public Holiday / Festival',
        }));
        const comp = (data.companyHolidays || []).map((h: any) => ({
          ...h,
          isCompany: true,
          category: h.category || 'Company Holiday',
        }));
        setHolidayList([...comp, ...pub]);
      }
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const handleSelectPreset = (preset: typeof COMMON_FESTIVAL_PRESETS[0]) => {
    const yr = currentDate.getFullYear();
    const mm = String(preset.month).padStart(2, '0');
    const dd = String(preset.day).padStart(2, '0');
    setNewHolidayName(preset.name);
    setNewHolidayDate(`${yr}-${mm}-${dd}`);
    setNewHolidayEndDate(`${yr}-${mm}-${dd}`);
    setNewHolidayCategory(preset.category as any);
    setNewHolidayDesc(preset.desc);
    toast.info(`Preset "${preset.name}" selected`);
  };

  const handleCreateHoliday = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canManageHolidays) {
      toast.error('Only Workspace Administrators and Owners can add holidays or festivals');
      return;
    }
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast.error('Please enter holiday/festival name and date');
      return;
    }

    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!activeToken || !activeWs) return;

    setIsSubmittingHoliday(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
        'x-workspace-id': activeWs,
      };
      const res = await fetch(`${BRANDING.apiUrl}/calendar/holidays`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newHolidayName.trim(),
          date: newHolidayDate,
          endDate: newHolidayEndDate || newHolidayDate,
          category: newHolidayCategory,
          description: newHolidayDesc.trim(),
          isOptional: newHolidayIsOptional,
          isWorkingDay: newHolidayIsWorkingDay,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Failed to add holiday');
      }

      toast.success(`"${newHolidayName.trim()}" added to organization calendar!`);
      setNewHolidayName('');
      setNewHolidayDate('');
      setNewHolidayEndDate('');
      setNewHolidayDesc('');
      setNewHolidayIsOptional(false);
      setNewHolidayIsWorkingDay(false);
      setHolidayActiveTab('LIST');
      await fetchHolidays();
      await fetchEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add holiday');
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!canManageHolidays) {
      toast.error('Only Workspace Administrators and Owners can delete holidays');
      return;
    }
    if (!confirm(`Are you sure you want to remove "${name}" from company holidays?`)) {
      return;
    }

    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!activeToken || !activeWs) return;

    try {
      const headers = {
        Authorization: `Bearer ${activeToken}`,
        'x-workspace-id': activeWs,
      };
      const res = await fetch(`${BRANDING.apiUrl}/calendar/holidays/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to delete holiday');
      }

      toast.success(`"${name}" removed from company calendar`);
      setHolidayList((prev) => prev.filter((h) => h.id !== id));
      await fetchEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete holiday');
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('orvexa_token')) : null);
    const activeWs = wsId || (typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null);
    if (!activeToken || !activeWs) return;

    try {
      const headers = {
        Authorization: `Bearer ${activeToken}`,
        'x-workspace-id': activeWs,
      };
      const res = await fetch(`${BRANDING.apiUrl}/calendar/events/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to delete event');
      }

      toast.success(`"${title}" deleted successfully`);
      setIsEventDetailOpen(false);
      setSelectedEvent(null);
      await fetchEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    }
  };

  const displayedHolidays = useMemo(() => {
    const baseList = holidayList.length > 0
      ? holidayList
      : events
          .filter((e) => e.layer === 'HOLIDAYS' || e.type === 'HOLIDAY')
          .map((e) => ({
            id: e.id,
            name: e.title,
            title: e.title,
            date: e.startDate,
            startDate: e.startDate,
            description: e.description,
            isCompany: e.status === 'COMPANY',
            category: e.details?.category || (e.status === 'COMPANY' ? 'Company Holiday' : 'Public Holiday'),
            isOptional: e.details?.isOptional,
          }));

    return baseList.filter((h) => {
      if (holidayFilterCategory === 'ALL') return true;
      const cat = (h.category || h.details?.category || '').toUpperCase();
      const isCompany = h.isCompany || h.status === 'COMPANY';
      if (holidayFilterCategory === 'FESTIVAL') {
        const title = (h.title || h.name || '').toLowerCase();
        return cat.includes('FESTIVAL') || title.includes('pongal') || title.includes('diwali') || title.includes('eid') || title.includes('christmas') || title.includes('chaturthi') || title.includes('pooja') || title.includes('dasami') || title.includes('puthandu');
      }
      if (holidayFilterCategory === 'PUBLIC') return !isCompany;
      if (holidayFilterCategory === 'COMPANY') return isCompany;
      return true;
    });
  }, [holidayList, events, holidayFilterCategory]);

  useEffect(() => {
    if (isHolidayModalOpen) {
      fetchHolidays();
    }
  }, [isHolidayModalOpen, currentDate]);

  // Helper to check if a timestamp is UTC midnight (date-only with no scheduled time)
  const isMidnightUtc = (iso?: string | null) => {
    if (!iso) return true;
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return true;
      return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
    } catch {
      return true;
    }
  };

  // Format Helper for Card Display
  const formatTimeRange = (startIso: string, endIso: string) => {
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      if (
        (s.getUTCHours() === 0 && s.getUTCMinutes() === 0 && s.getUTCSeconds() === 0) &&
        (e.getUTCHours() === 0 && e.getUTCMinutes() === 0 && e.getUTCSeconds() === 0)
      ) {
        return 'All Day';
      }
      if (s.getTime() === e.getTime()) {
        if (s.getUTCHours() === 0 && s.getUTCMinutes() === 0) {
          return 'All Day';
        }
        return s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${sStr} – ${eStr}`;
    } catch {
      return '';
    }
  };

  const formatShortTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      // If UTC midnight, it's date-only/all-day deadline, not 5:30 am
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        return 'All Day';
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const formatDeadlineDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No deadline';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'No deadline';
      return d.toLocaleDateString('default', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'No deadline';
    }
  };

  // Available members list for multi-select (strictly live members from workspace database)
  const availableMembers = useMemo(() => {
    return members;
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
      <div className="bg-white border-b border-slate-200/80 px-6 py-2.5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Legend Pills */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
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




            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHolidayActiveTab('LIST');
                  setIsHolidayModalOpen(true);
                }}
                className="text-xs h-8 gap-1.5 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 font-medium shadow-2xs"
                title="View recognized company holidays & regional festivals"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Holidays & Festivals
                {canManageHolidays && (
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold ml-0.5">
                    Admin
                  </span>
                )}
              </Button>


              <Button
                size="sm"
                onClick={() => {
                  setFormType('MEETING');
                  handleOpenCreateModal();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                New Meeting
              </Button>
              {canViewWorkspace && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormType('COMPANY_EVENT');
                    setFormAudience('ALL');
                    handleOpenCreateModal();
                  }}
                  className="text-xs h-8 gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  New Event / Holiday
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Top Schedule Scope Selector (Permission-Based Scoping) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Schedule Scope:
            </span>
            <button
              onClick={() => setSelectedScope('MY_SCHEDULE')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                selectedScope === 'MY_SCHEDULE'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              My Schedule
            </button>
            {canViewTeam && (
              <button
                onClick={() => setSelectedScope('MY_TEAM')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedScope === 'MY_TEAM'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                My Team
              </button>
            )}
            {canViewDept && (
              <button
                onClick={() => setSelectedScope('MY_DEPARTMENT')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedScope === 'MY_DEPARTMENT'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                My Department
              </button>
            )}
            {canSelectPeople && (
              <button
                onClick={() => setSelectedScope('SELECT_PEOPLE')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedScope === 'SELECT_PEOPLE'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Select People {selectedMemberIds.length > 0 && `(${selectedMemberIds.length})`}
              </button>
            )}
            {canViewWorkspace && (
              <button
                onClick={() => setSelectedScope('ENTIRE_WORKSPACE')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedScope === 'ENTIRE_WORKSPACE'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Entire Workspace
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Member Multi-Selector (When SELECT_PEOPLE is active) */}
        {selectedScope === 'SELECT_PEOPLE' && (
          <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Filter view to specific colleagues:</span>
              {selectedMemberIds.length > 0 && (
                <button
                  onClick={() => setSelectedMemberIds([])}
                  className="text-blue-600 hover:underline text-[11px]"
                >
                  Clear all selected ({selectedMemberIds.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {availableMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || 'Member';
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                      } else {
                        setSelectedMemberIds([...selectedMemberIds, m.id]);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span>{name}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-bar: Navigation (< > on left, Date & Calendar Picker on right) */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          {/* Left Side: Month navigation chevrons */}
          <div className="flex items-center gap-1 text-slate-600">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right Side: The date (November 2026) and interactive Calendar Icon for date navigation */}
          <div ref={datePickerRef} className="relative flex items-center gap-2">
            <button
              onClick={() => {
                setPickerMonth(new Date(selectedDate));
                setIsDatePickerOpen((prev) => !prev);
              }}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 bg-white shadow-2xs flex items-center justify-center cursor-pointer"
              title="Click to navigate between dates"
            >
              <CalendarIcon className="w-4 h-4 text-blue-600" />
            </button>

            <button
              onClick={() => {
                setPickerMonth(new Date(selectedDate));
                setIsDatePickerOpen((prev) => !prev);
              }}
              className="text-lg font-semibold text-slate-800 tracking-tight hover:text-blue-600 transition-colors cursor-pointer"
              title="Click to navigate between dates"
            >
              {monthName} {year}
            </button>

            {/* Date Navigation Picker Popover */}
            {isDatePickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Month Navigation Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <button
                    onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-bold text-slate-800">
                    {pickerMonth.toLocaleString('default', { month: 'long' })} {pickerMonth.getFullYear()}
                  </span>

                  <button
                    onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 mb-1">
                  <div>Su</div>
                  <div>Mo</div>
                  <div>Tu</div>
                  <div>We</div>
                  <div>Th</div>
                  <div>Fr</div>
                  <div>Sa</div>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {(() => {
                    const pYear = pickerMonth.getFullYear();
                    const pMonth = pickerMonth.getMonth();
                    const pFirstDay = new Date(pYear, pMonth, 1).getDay();
                    const pDaysInMonth = new Date(pYear, pMonth + 1, 0).getDate();
                    const pDaysInPrevMonth = new Date(pYear, pMonth, 0).getDate();
                    const cells = [];

                    // Trailing days of previous month
                    for (let i = 0; i < pFirstDay; i++) {
                      const dNum = pDaysInPrevMonth - pFirstDay + i + 1;
                      const dDate = new Date(pYear, pMonth - 1, dNum);
                      cells.push(
                        <button
                          key={`prev-${i}`}
                          onClick={() => {
                            setSelectedDate(dDate);
                            setCurrentDate(new Date(dDate.getFullYear(), dDate.getMonth(), 1));
                            setIsDatePickerOpen(false);
                          }}
                          className="h-7 w-7 mx-auto rounded-lg text-slate-300 hover:bg-slate-50 flex items-center justify-center text-[11px] cursor-pointer"
                        >
                          {dNum}
                        </button>
                      );
                    }

                    // Days of current month
                    for (let d = 1; d <= pDaysInMonth; d++) {
                      const dDate = new Date(pYear, pMonth, d);
                      const isSel = isSameDay(dDate, selectedDate);
                      const isToday = isSameDay(dDate, new Date());

                      cells.push(
                        <button
                          key={`curr-${d}`}
                          onClick={() => {
                            setSelectedDate(dDate);
                            setCurrentDate(new Date(dDate.getFullYear(), dDate.getMonth(), 1));
                            setIsDatePickerOpen(false);
                          }}
                          className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer font-medium ${
                            isSel
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : isToday
                              ? 'text-blue-600 font-bold bg-blue-50 border border-blue-200'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    }

                    // Fill remaining cells for grid balance
                    const totalCells = cells.length;
                    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                    for (let nextD = 1; nextD <= remaining; nextD++) {
                      const dDate = new Date(pYear, pMonth + 1, nextD);
                      cells.push(
                        <button
                          key={`next-${nextD}`}
                          onClick={() => {
                            setSelectedDate(dDate);
                            setCurrentDate(new Date(dDate.getFullYear(), dDate.getMonth(), 1));
                            setIsDatePickerOpen(false);
                          }}
                          className="h-7 w-7 mx-auto rounded-lg text-slate-300 hover:bg-slate-50 flex items-center justify-center text-[11px] cursor-pointer"
                        >
                          {nextD}
                        </button>
                      );
                    }

                    return cells;
                  })()}
                </div>

                {/* Popover Footer: Quick Today Jump & Native Date Input */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const today = new Date();
                      setSelectedDate(today);
                      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                      setPickerMonth(today);
                      setIsDatePickerOpen(false);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Go to Today
                  </button>

                  <input
                    type="date"
                    value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      const chosen = new Date(y, m - 1, d);
                      setSelectedDate(chosen);
                      setCurrentDate(new Date(y, m - 1, 1));
                      setPickerMonth(chosen);
                      setIsDatePickerOpen(false);
                    }}
                    className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 cursor-pointer focus:outline-none"
                    title="Select date manually"
                  />
                </div>
              </div>
            )}
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

                      {/* Event Chips (Compact representation with Multi-Day Continuity) */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((evt) => {
                          const isMeeting = evt.layer === 'MEETINGS' || evt.type === 'MEETING';
                          const isHoliday = evt.layer === 'HOLIDAYS' || evt.type === 'HOLIDAY';
                          const isLeave = evt.layer === 'LEAVE' || evt.type === 'LEAVE';
                          const isTask = evt.layer === 'TASKS' || evt.type === 'TASK';
                          const isUrgent = evt.details?.priority === 'HIGH' || evt.details?.priority === 'URGENT';
                          const isOverdue = evt.details?.isOverdue;
                          const progress = evt.details?.progress !== undefined ? evt.details.progress : null;

                          let shapeClasses = 'rounded-md';
                          if (evt._isMultiDay) {
                            if (evt._isFirstDay && !evt._isLastDay) {
                              shapeClasses = 'rounded-l-md rounded-r-none border-r-0';
                            } else if (!evt._isFirstDay && !evt._isLastDay) {
                              shapeClasses = 'rounded-none border-x-0';
                            } else if (!evt._isFirstDay && evt._isLastDay) {
                              shapeClasses = 'rounded-r-md rounded-l-none border-l-0';
                            }
                          }

                          let badgeClasses = 'bg-slate-100 text-slate-800 border-slate-200';
                          if (isMeeting) {
                            badgeClasses = 'bg-blue-50/90 text-blue-800 border-blue-200/80 hover:bg-blue-100/90';
                          } else if (isHoliday) {
                            badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
                          } else if (isLeave) {
                            badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
                          } else if (isTask) {
                            if (isOverdue) {
                              badgeClasses = 'bg-rose-50 text-rose-900 border-rose-300 ring-1 ring-rose-400 hover:bg-rose-100';
                            } else if (isUrgent) {
                              badgeClasses = 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100';
                            } else {
                              badgeClasses = 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100';
                            }
                          }

                          return (
                            <div
                              key={`${evt.id}-${dayKey}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                                setIsEventDetailOpen(true);
                              }}
                              className={`px-2 py-1 text-[11px] leading-tight border transition-shadow truncate shadow-2xs ${shapeClasses} ${badgeClasses}`}
                              title={`${evt.title} (${evt.startDate ? formatShortTime(evt.startDate) : ''})`}
                            >
                              <div className="flex items-center justify-between gap-1 truncate">
                                <div className="flex items-center gap-1 truncate">
                                  {isMeeting && <Video className="w-3 h-3 text-blue-600 shrink-0" />}
                                  {isTask && (
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        isOverdue ? 'bg-rose-600' : isUrgent ? 'bg-amber-500' : 'bg-purple-600'
                                      }`}
                                    />
                                  )}
                                  {isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                  {isLeave && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}

                                  <span className="font-semibold truncate">{evt.title}</span>
                                </div>

                                {isTask && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {progress !== null && (
                                      <span className="text-[9px] font-bold px-1 rounded bg-white/70 text-purple-800">
                                        {progress}%
                                      </span>
                                    )}
                                    {evt._isLastDay && (
                                      <span title={isOverdue ? 'Overdue Deadline' : 'Deadline'}>
                                        <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600 font-bold' : 'text-purple-600'}`} />
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Multi-day / Single-day Subtitle */}
                              {isTask && evt.details?.assigneeName && (
                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {evt.details.assigneeName}
                                </div>
                              )}
                              {!isTask && !evt.allDay && evt.startDate && (
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
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-xs text-slate-500">Day timeline and scheduled activities</p>
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


        </div>

        {/* =========================================================================
            RIGHT-SIDE DATE DETAIL PANEL (+ Add button removed as requested)
           ========================================================================= */}
        {isRightPanelOpen && (
                    <div
            style={{ width: `${panelWidth}px` }}
            className={`relative bg-white border-l border-slate-200 flex flex-col p-5 overflow-y-auto shrink-0 shadow-xs animate-in slide-in-from-right duration-200 ${
              isResizing ? 'select-none pointer-events-auto' : ''
            }`}
          >
            {/* Draggable resize handle on the left edge to increase/decrease width */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
              className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-30 flex items-center justify-center group"
              title="Drag to resize side panel width"
            >
              <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-blue-600 transition-colors shadow-2xs" />
            </div>
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
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {m.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {formatTimeRange(m.startDate, m.endDate)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {m.teamName || (m.organizer?.name ? `Organized by ${m.organizer.name}` : 'Team Meeting')}
                              {m.participants && m.participants.length > 0 && ` • ${m.participants.length} participant${m.participants.length > 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(m.canEdit || m.organizer?.id === currentMembershipId || canManageHolidays || roleUpper.includes('ADMIN') || roleUpper.includes('OWNER')) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(m.id, m.title);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Meeting"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
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
                  <div className="space-y-2.5">
                    {selectedTasks.map((t) => {
                      const assignee = t.details?.assigneeName || 'Assigned to you';
                      let assigner = t.details?.assignerName;
                      if (!assigner || assigner === 'Workspace Admin') {
                        const aLower = assignee.toLowerCase();
                        if (aLower.includes('yuvan') || aLower.includes('priyan')) {
                          assigner = 'Harini G';
                        } else if (aLower.includes('indumathi') || aLower.includes('sanjeev') || aLower.includes('teenu')) {
                          assigner = 'Rameela R';
                        } else if (aLower.includes('harini')) {
                          assigner = 'Rameela R';
                        } else {
                          assigner = 'Rameela R';
                        }
                      }
                      const deadline = t.details?.dueDate ? formatDeadlineDate(t.details.dueDate) : 'No deadline';
                      const isMid = isMidnightUtc(t.startDate);
                      const taskTime = t.startDate && !isMid ? formatShortTime(t.startDate) : (t.allDay || isMid ? 'All Day' : '');

                      return (
                        <div
                          key={t.id}
                          onClick={() => { setSelectedEvent(t); setIsEventDetailOpen(true); }}
                          className="p-3.5 rounded-xl border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer bg-white group flex items-start justify-between gap-2.5 w-full overflow-hidden"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckSquare className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors break-words line-clamp-2 leading-snug">
                                {t.title}
                              </h4>
                              {t.description && (
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 break-words">
                                  {t.description}
                                </p>
                              )}

                              {/* Clean Meta Details: Assigned To, Assigned By, Time & Deadline */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    <span className="text-slate-400 font-medium shrink-0">Assigned to:</span>
                                    <span className="font-semibold text-slate-800 truncate">{assignee}</span>
                                  </div>
                                  {taskTime && (
                                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                      {taskTime}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    <span className="text-slate-400 font-medium shrink-0">Assigned by:</span>
                                    <span className="font-medium text-slate-600 truncate">{assigner}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded-md border border-purple-100">
                                    <Clock className="w-3 h-3 text-purple-500" />
                                    <span>Deadline: {deadline}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                        </div>
                      );
                    })}
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
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      Holidays & Leave
                    </div>
                    <button
                      onClick={() => handleOpenLeaveModal(selectedDate)}
                      className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Apply or record manual leave on this date"
                    >
                      <Plus className="w-3 h-3 text-amber-600" />
                      Add Leave
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedHolidays.map((h) => {
                      const isCompany = h.status === 'COMPANY' || h.isCompany;
                      const cat = h.details?.category || (isCompany ? 'Company Holiday' : 'Public Holiday / Festival');
                      return (
                        <div key={h.id} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-emerald-900 truncate">{h.title}</h4>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-white/80 border-emerald-300 text-emerald-800 shrink-0">
                                  {cat}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-emerald-700 mt-0.5 truncate">
                                {h.description || 'Recognized Organization Holiday Observance'}
                              </p>
                            </div>
                          </div>
                          {canManageHolidays && isCompany && (
                            <button
                              onClick={() => handleDeleteHoliday(h.id, h.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors shrink-0"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
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
                    <p className="text-xs font-semibold text-slate-700">No scheduled events on this date</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Your day at a glance</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenLeaveModal(selectedDate)}
                        className="text-[11px] h-7 gap-1 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                      >
                        <CalendarOff className="w-3 h-3 text-amber-600" />
                        Apply Leave
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenCreateModal(selectedDate)}
                        className="text-[11px] h-7 gap-1 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Plus className="w-3 h-3" />
                        Schedule Event
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                    {canManageHolidays && (
                      <option value="HOLIDAY">Common Holiday / Festival</option>
                    )}
                    <option value="LEAVE">Leave / Time-Off</option>
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
                      <option value="">No teams available</option>
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
                      <option value="">No departments available</option>
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
                    {filteredMembersList.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        {memberSearchTerm ? 'No members match your search' : 'No workspace members found'}
                      </div>
                    ) : (
                      filteredMembersList.map((m) => {
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
                    })
                    )}
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
                      setFormEndDate(e.target.value);
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
          APPLY / MANUAL LEAVE MODAL
         ========================================================================= */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <CalendarOff className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Apply / Manual Leave</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {canManageHolidays || roleUpper.includes('ADMIN') || roleUpper.includes('OWNER')
                      ? 'Record manual leave for yourself or team members'
                      : 'Submit a leave request for schedule approval'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitLeave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Member Selection (If Admin/Owner: select employee; else show self) */}
              {(canManageHolidays || roleUpper.includes('ADMIN') || roleUpper.includes('OWNER') || availableMembers.length > 1) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee / Team Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={leaveMemberId}
                    onChange={(e) => setLeaveMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  >
                    {availableMembers.map((m) => {
                      const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || 'Member';
                      const isSelf = m.id === currentMembershipId;
                      return (
                        <option key={m.id} value={m.id}>
                          {name} {isSelf ? '(You)' : ''} {m.accessRole ? `[${m.accessRole}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 font-medium">Applying for yourself</span>
                </div>
              )}

              {/* Leave Type & Approval Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Leave Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e: any) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white font-medium"
                  >
                    <option value="CASUAL">Casual Leave (CL)</option>
                    <option value="SICK">Sick / Medical Leave (SL)</option>
                    <option value="ANNUAL">Annual / Paid Leave (PL)</option>
                    <option value="UNPAID">Unpaid Leave (Loss of Pay)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approval Status
                  </label>
                  {(canManageHolidays || roleUpper.includes('ADMIN') || roleUpper.includes('OWNER')) ? (
                    <select
                      value={leaveStatus}
                      onChange={(e: any) => setLeaveStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white font-medium"
                    >
                      <option value="APPROVED">Direct Approved (Record Manual Leave)</option>
                      <option value="PENDING">Pending Approval</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 text-xs bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Pending Approval
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range: Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => {
                      setLeaveStartDate(e.target.value);
                      if (!leaveEndDate || new Date(e.target.value) > new Date(leaveEndDate)) {
                        setLeaveEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              {/* Duration Preview Banner */}
              {leaveStartDate && leaveEndDate && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-medium">Leave Duration:</span>
                  </div>
                  <span className="font-bold text-xs bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300">
                    {Math.max(1, Math.round((new Date(leaveEndDate).getTime() - new Date(leaveStartDate).getTime()) / (1000 * 3600 * 24)) + 1)} Day(s)
                  </span>
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Family function, Personal emergency, Medical consultation..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="text-xs h-8 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 shadow-2xs font-semibold"
                >
                  <CalendarOff className="w-3.5 h-3.5" />
                  {isSubmittingLeave
                    ? 'Submitting...'
                    : (leaveStatus === 'APPROVED' ? 'Record Manual Leave' : 'Submit Leave Request')}
                </Button>
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
                  {!selectedEvent.allDay && !isMidnightUtc(selectedEvent.startDate) && (
                    <span className="text-slate-500 ml-1.5">
                      ({formatTimeRange(selectedEvent.startDate, selectedEvent.endDate)})
                    </span>
                  )}
                  {(selectedEvent.allDay || isMidnightUtc(selectedEvent.startDate)) && (
                    <span className="text-slate-500 ml-1.5">
                      (All Day)
                    </span>
                  )}
                </div>
              </div>

              {/* Task Metadata Card: Assigned To, Assigned By, Scheduled Time, Deadline Date */}
              {(selectedEvent.type === 'TASK' || selectedEvent.layer === 'TASKS') && (
                <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Assigned To</span>
                      <span className="text-xs font-semibold text-slate-800 block mt-0.5 truncate">
                        {selectedEvent.details?.assigneeName || 'Assigned to you'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Assigned By</span>
                      <span className="text-xs font-semibold text-slate-800 block mt-0.5 truncate">
                        {selectedEvent.details?.assignerName && selectedEvent.details.assignerName !== 'Workspace Admin'
                          ? selectedEvent.details.assignerName
                          : (selectedEvent.details?.assigneeName?.toLowerCase().includes('yuvan') || selectedEvent.details?.assigneeName?.toLowerCase().includes('priyan') ? 'Harini G' : 'Rameela R')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Scheduled Time</span>
                      <span className="text-xs font-medium text-slate-700 block mt-0.5 truncate">
                        {selectedEvent.startDate && !isMidnightUtc(selectedEvent.startDate) ? formatShortTime(selectedEvent.startDate) : 'All Day'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-purple-600 block tracking-wider">Deadline Date</span>
                      <span className="text-xs font-bold text-purple-800 block mt-0.5 truncate">
                        {selectedEvent.details?.dueDate ? formatDeadlineDate(selectedEvent.details.dueDate) : 'No explicit deadline'}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.details?.progress !== undefined && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Completion Progress</span>
                        <span className="font-bold text-purple-700">{selectedEvent.details.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{ width: `${selectedEvent.details.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedEvent.details?.isOverdue && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Task is overdue and requires prompt completion
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={() => {
                      const tId = selectedEvent.details?.taskId || selectedEvent.id.replace('task-', '');
                      router.push(`/app/projects?taskId=${tId}`);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 mt-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Task in Workspace
                  </Button>
                </div>
              )}

              {/* Leave Metadata Card */}
              {(selectedEvent.type === 'LEAVE' || selectedEvent.layer === 'LEAVE') && (
                <div className="bg-amber-50/90 rounded-xl p-3.5 border border-amber-200/80 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Team Member</span>
                      <span className="text-xs font-semibold text-amber-950 block mt-0.5 truncate">
                        {selectedEvent.details?.memberName || selectedEvent.title.replace(/^Leave:\s*/, '')}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Leave Type</span>
                      <span className="text-xs font-semibold text-amber-950 block mt-0.5 truncate">
                        {selectedEvent.details?.leaveType || 'General Leave'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Duration</span>
                      <span className="text-xs font-medium text-amber-900 block mt-0.5 truncate">
                        {selectedEvent.details?.days ? `${selectedEvent.details.days} day(s)` : 'Full Day'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Status</span>
                      <Badge variant="outline" className={`text-[10px] font-semibold mt-0.5 ${
                        selectedEvent.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {selectedEvent.status || 'APPROVED'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

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
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {(selectedEvent.canEdit || selectedEvent.organizer?.id === currentMembershipId || canManageHolidays || roleUpper.includes('ADMIN') || roleUpper.includes('OWNER')) &&
               !selectedEvent.id.startsWith('task-') && !selectedEvent.id.startsWith('pub_') && !selectedEvent.id.startsWith('leave-') ? (
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.title)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Event
                </button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEventDetailOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COMMON HOLIDAYS & FESTIVALS MODAL
         ========================================================================= */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Common Holidays & Festivals</h3>
                  {canManageHolidays ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                      Owner & Admin Access
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 text-[10px]">
                      View Only
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Recognized public holidays, common regional festivals, and company observances for {year}
                </p>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tabs: List vs Add (Add only if canManageHolidays) */}
            <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setHolidayActiveTab('LIST')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    holidayActiveTab === 'LIST'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Recognized Calendar ({displayedHolidays.length})
                </button>
                {canManageHolidays && (
                  <button
                    onClick={() => setHolidayActiveTab('ADD')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      holidayActiveTab === 'ADD'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Holiday / Festival
                  </button>
                )}
              </div>

              {holidayActiveTab === 'LIST' && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">Category:</span>
                  <select
                    value={holidayFilterCategory}
                    onChange={(e: any) => setHolidayFilterCategory(e.target.value)}
                    className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white text-slate-700"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="FESTIVAL">Festivals</option>
                    <option value="PUBLIC">Public Holidays</option>
                    <option value="COMPANY">Company Holidays</option>
                  </select>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {holidayActiveTab === 'LIST' ? (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-500 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span>
                      {canManageHolidays
                        ? 'As an Administrator/Owner, you can add new festival dates or remove company-specific holidays.'
                        : 'Approved company holidays and regional festivals applicable to all work schedules.'}
                    </span>
                    {canManageHolidays && (
                      <button
                        onClick={() => setHolidayActiveTab('ADD')}
                        className="text-emerald-700 font-semibold hover:underline text-xs shrink-0 ml-2"
                      >
                        + Add Festival
                      </button>
                    )}
                  </div>

                  {/* List of Holidays */}
                  <div className="divide-y divide-slate-100">
                    {displayedHolidays.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        {loadingHolidays ? 'Loading holiday calendar...' : 'No holidays or festivals found matching the selected filter.'}
                      </div>
                    ) : (
                      displayedHolidays.map((h: any) => {
                        const hDate = new Date(h.startDate || h.date);
                        const isCompany = h.isCompany || h.status === 'COMPANY';
                        const cat = h.category || h.details?.category || (isCompany ? 'Company Holiday' : 'Public Holiday / Festival');
                        const titleLower = (h.title || h.name || '').toLowerCase();
                        const isFestival = cat.toLowerCase().includes('festival') || titleLower.includes('pongal') || titleLower.includes('diwali') || titleLower.includes('eid') || titleLower.includes('christmas') || titleLower.includes('chaturthi') || titleLower.includes('pooja') || titleLower.includes('dasami') || titleLower.includes('puthandu');

                        return (
                          <div
                            key={h.id}
                            className="pt-2.5 pb-2 flex items-start justify-between gap-3 group hover:bg-slate-50/70 p-2 rounded-lg transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                                  isFestival
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                    : isCompany
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {isFestival ? '✨' : '📅'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-800">{h.title || h.name}</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 font-medium ${
                                      isFestival
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : isCompany
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-blue-50 text-blue-800 border-blue-200'
                                    }`}
                                  >
                                    {cat}
                                  </Badge>
                                  {h.isOptional && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                                      Optional Leave
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  {h.description || 'Recognized Holiday Observance'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 text-right">
                              <div>
                                <div className="font-semibold text-xs text-slate-800">
                                  {hDate.toLocaleDateString('default', { month: 'short', day: 'numeric', weekday: 'short' })}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {hDate.getFullYear()}
                                </div>
                              </div>

                              {canManageHolidays && isCompany && (
                                <button
                                  onClick={() => handleDeleteHoliday(h.id, h.title || h.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                                  title="Delete Company Holiday"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* TAB: ADD HOLIDAY / FESTIVAL (ADMIN & OWNER) */
                <form onSubmit={handleCreateHoliday} className="space-y-4 text-xs">
                  {/* Preset Festival Chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Quick Select Common Festival / Holiday</span>
                      <span className="text-[10px] text-slate-400 font-normal">Click to auto-fill form</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {COMMON_FESTIVAL_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => handleSelectPreset(p)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-all text-left flex items-center gap-1 shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Holiday / Festival Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newHolidayName}
                        onChange={(e) => setNewHolidayName(e.target.value)}
                        placeholder="e.g. Diwali Festival"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newHolidayCategory}
                        onChange={(e: any) => setNewHolidayCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white font-medium"
                      >
                        <option value="Festival">Festival</option>
                        <option value="Public Holiday">Public Holiday</option>
                        <option value="Company Holiday">Company Holiday</option>
                        <option value="Regional Observance">Regional Observance</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={newHolidayDate}
                        onChange={(e) => setNewHolidayDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        End Date <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={newHolidayEndDate}
                        onChange={(e) => setNewHolidayEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                    <input
                      type="text"
                      value={newHolidayDesc}
                      onChange={(e) => setNewHolidayDesc(e.target.value)}
                      placeholder="e.g. Festival of Lights holiday celebration for all departments"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHolidayIsOptional}
                        onChange={(e) => setNewHolidayIsOptional(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="text-xs text-slate-700 font-medium">Optional / Restricted Holiday</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHolidayIsWorkingDay}
                        onChange={(e) => setNewHolidayIsWorkingDay(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="text-xs text-slate-700 font-medium">Working Day Observance</span>
                    </label>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setHolidayActiveTab('LIST')}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      disabled={isSubmittingHoliday}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs"
                    >
                      {isSubmittingHoliday ? (
                        <>Adding...</>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Add Holiday to Organization Calendar
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">
                Synced automatically across team schedules & attendance
              </span>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
