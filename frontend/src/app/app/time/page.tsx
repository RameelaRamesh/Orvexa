'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Play,
  Square,
  Coffee,
  Calendar,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  FileText,
  Settings,
  Plus,
  Users,
  Check,
  XCircle,
  Filter,
  Search,
  Sunrise,
  Moon,
  ChevronRight,
  ChevronDown,
  Pause,
  Timer,
  Info,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  CornerDownRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function TimeAttendancePage() {
  const [activeTab, setActiveTab] = useState<'my_attendance' | 'team_logs' | 'corrections' | 'shifts_policy' | 'leave'>('my_attendance');

  // Core Data
  const [todayData, setTodayData] = useState<any>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<any>(null);
  const [shiftsList, setShiftsList] = useState<any[]>([]);
  const [correctionsList, setCorrectionsList] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);

  // Leave & PTO State
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [currentUserDesignation, setCurrentUserDesignation] = useState<string>('');
  const [currentMembershipId, setCurrentMembershipId] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [applyLeaveType, setApplyLeaveType] = useState('CASUAL');
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Helper to get local YYYY-MM-DD string
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filters & State - Defaults to Today's date
  const [filterDate, setFilterDate] = useState<string>(getTodayDateString);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAttendanceDisabled, setIsAttendanceDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Interactive Inputs & Break Tracking State
  const [sessionNotes, setSessionNotes] = useState('');
  const [selectedBreakType, setSelectedBreakType] = useState('SHORT_BREAK');
  const [selectedBreakCategory, setSelectedBreakCategory] = useState('General Break');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Clock-out Summary Modal State
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [clockOutNotes, setClockOutNotes] = useState('');

  // Break Correction Modal State
  const [showBreakCorrectionModal, setShowBreakCorrectionModal] = useState(false);
  const [breakCorrectionTarget, setBreakCorrectionTarget] = useState<any>(null);
  const [requestedBreakStart, setRequestedBreakStart] = useState('');
  const [requestedBreakEnd, setRequestedBreakEnd] = useState('');
  const [breakCorrectionReason, setBreakCorrectionReason] = useState('');
  const [submittingBreakCorrection, setSubmittingBreakCorrection] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Live ticking timer for real-time shift and break tracking
  useEffect(() => {
    setCurrentTime(new Date());
    const tickInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(tickInterval);
  }, []);

  const formatElapsed = (startDateStr: string | null | undefined) => {
    if (!startDateStr || !currentTime) return '00:00:00';
    const start = new Date(startDateStr).getTime();
    if (isNaN(start)) return '00:00:00';
    const elapsedSeconds = Math.max(0, Math.floor((currentTime.getTime() - start) / 1000));
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const formatHMS = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const formatReadableMinutes = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0 mins';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} mins`;
  };

  const formatTimeOnly = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Shift & Break Engine Metrics Calculation (Pauses Work Timer on Break, Separate Break Timer)
  const calculateShiftLiveMetrics = () => {
    if (!todayData?.clockIn) {
      return {
        isClockedIn: false,
        isOnBreak: false,
        grossShiftSeconds: 0,
        totalBreakSeconds: 0,
        completedBreakSeconds: 0,
        currentBreakSeconds: 0,
        netWorkSeconds: 0,
        isOvernight: false,
        breaksList: [] as any[],
        activeBreak: null as any,
        hoursWorkedDisplay: '00:00:00',
        currentBreakDisplay: '00:00:00',
        shiftSpanDisplay: '00:00:00',
        totalBreaksDisplay: '0 mins',
        overtimeMinutes: 0,
        statusCheck: 'NOT_CLOCKED_IN',
      };
    }

    const nowMs = currentTime ? currentTime.getTime() : Date.now();
    const clockInMs = new Date(todayData.clockIn).getTime();
    const clockOutMs = todayData.clockOut ? new Date(todayData.clockOut).getTime() : null;

    const endPointMs = clockOutMs || nowMs;
    const grossShiftSeconds = Math.max(0, Math.floor((endPointMs - clockInMs) / 1000));

    // Current session breaks list
    const breaksList: any[] = Array.isArray(todayData.breaks) ? [...todayData.breaks] : [];
    breaksList.sort((a, b) => new Date(a.breakStart).getTime() - new Date(b.breakStart).getTime());

    const activeBreak = breaksList.find((b: any) => !b.breakEnd) || todayData?.todaySummary?.activeBreak || null;
    const isOnBreak = !!activeBreak;

    let completedBreakSeconds = 0;
    breaksList.forEach((b: any) => {
      if (b.breakEnd) {
        const bStartMs = new Date(b.breakStart).getTime();
        const bEndMs = new Date(b.breakEnd).getTime();
        if (!isNaN(bStartMs) && !isNaN(bEndMs) && bEndMs >= bStartMs) {
          completedBreakSeconds += Math.floor((bEndMs - bStartMs) / 1000);
        }
      }
    });

    let currentBreakSeconds = 0;
    if (isOnBreak && activeBreak?.breakStart) {
      const activeStartMs = new Date(activeBreak.breakStart).getTime();
      if (!isNaN(activeStartMs)) {
        currentBreakSeconds = Math.max(0, Math.floor((nowMs - activeStartMs) / 1000));
      }
    }

    const totalBreakSeconds = completedBreakSeconds + currentBreakSeconds;
    const netWorkSeconds = Math.max(0, grossShiftSeconds - totalBreakSeconds);

    const isOvernight = new Date(clockInMs).toDateString() !== new Date(endPointMs).toDateString();
    const overtimeThresholdMins = policy?.overtimeThresholdMinutes || 480;
    const netWorkMins = Math.floor(netWorkSeconds / 60);
    const overtimeMinutes = Math.max(0, netWorkMins - overtimeThresholdMins);

    const fullDayMins = policy?.fullDayMinutes || 480;
    const halfDayMins = policy?.halfDayMinutes || 240;

    let statusCheck = 'IN_PROGRESS';
    if (netWorkMins >= fullDayMins) {
      statusCheck = 'FULL_DAY_MET';
    } else if (netWorkMins >= halfDayMins) {
      statusCheck = 'HALF_DAY_MET';
    } else {
      statusCheck = 'UNDER_MINIMUM';
    }

    return {
      isClockedIn: !todayData.clockOut,
      isOnBreak,
      grossShiftSeconds,
      totalBreakSeconds,
      completedBreakSeconds,
      currentBreakSeconds,
      netWorkSeconds,
      isOvernight,
      breaksList,
      activeBreak,
      hoursWorkedDisplay: formatHMS(netWorkSeconds),
      currentBreakDisplay: formatHMS(currentBreakSeconds),
      shiftSpanDisplay: formatHMS(grossShiftSeconds),
      totalBreaksDisplay: `${Math.round(totalBreakSeconds / 60)} mins`,
      overtimeMinutes,
      statusCheck,
    };
  };

  // Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<any>(null);
  const [requestedClockIn, setRequestedClockIn] = useState('');
  const [requestedClockOut, setRequestedClockOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Shift Modal State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('17:00');
  const [newShiftDays, setNewShiftDays] = useState(['MON', 'TUE', 'WED', 'THU', 'FRI']);

  // Policy Form State
  const [policyForm, setPolicyForm] = useState<any>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  const loadAllData = async () => {
    if (!token || !wsId) return;
    try {
      const headers = { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId };
      const [todayRes, listRes, summaryRes, shiftsRes, correctionsRes, policyRes, wsRes, leaveRes, balanceRes, meRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/time/today`, { headers }),
        fetch(`${BRANDING.apiUrl}/time/attendance${filterDate ? `?date=${filterDate}` : ''}`, { headers }),
        fetch(`${BRANDING.apiUrl}/time/reports/summary`, { headers }),
        fetch(`${BRANDING.apiUrl}/time/shifts`, { headers }),
        fetch(`${BRANDING.apiUrl}/time/corrections`, { headers }),
        fetch(`${BRANDING.apiUrl}/time/policy`, { headers }),
        fetch(`${BRANDING.apiUrl}/workspaces/${wsId}`, { headers }),
        fetch(`${BRANDING.apiUrl}/leave`, { headers }),
        fetch(`${BRANDING.apiUrl}/leave/balances`, { headers }),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers }),
      ]);

      const [rawToday, rawList, rawSummary, rawShifts, rawCorrections, rawPolicy, rawWs, rawLeave, rawBalance, rawMe] = await Promise.all([
        todayRes.json(),
        listRes.json(),
        summaryRes.json(),
        shiftsRes.json(),
        correctionsRes.json(),
        policyRes.json(),
        wsRes.json(),
        leaveRes.json(),
        balanceRes.json(),
        meRes.json(),
      ]);

      const meData = rawMe.data !== undefined ? rawMe.data : rawMe;
      let currentMembershipObj: any = null;
      if (meData?.memberships) {
        const mem = meData.memberships.find((m: any) => m.workspaceId === wsId);
        if (mem) {
          const isHR =
            mem.designation?.title?.toLowerCase().includes('hr') ||
            mem.department?.name?.toLowerCase().includes('hr') ||
            mem.user?.email?.toLowerCase().includes('hr');
          const effectiveRole = isHR && mem.accessRole === 'MEMBER' ? 'MANAGER' : (mem.accessRole || 'MEMBER');
          setCurrentUserRole(effectiveRole);
          setCurrentMembershipId(mem.id);
          setCurrentUserDesignation(mem.designation?.title || '');
          const isOwner = mem.accessRole === 'OWNER';
          setIsPlatformAdmin(isOwner);

          const perms: string[] = (mem.role?.permissions || []).map(
            (rp: any) => rp.permission?.code || rp.code || rp
          );
          setUserPermissions(perms);

          currentMembershipObj = {
            id: mem.id,
            employeeId: mem.employeeId || '',
            user: mem.user || {
              firstName: meData.firstName || '',
              lastName: meData.lastName || '',
              email: meData.email || '',
              avatarUrl: meData.avatarUrl || null,
            },
            department: mem.department || null,
            team: mem.team || null,
            designation: mem.designation || null,
          };
        }
      }

      const tData = rawToday.data !== undefined ? rawToday.data : rawToday;
      setTodayData(tData);

      const lData = rawList.data !== undefined ? rawList.data : rawList;
      let combinedList: any[] = Array.isArray(lData) ? [...lData] : [];

      // Seamlessly merge all sessions from My Shift and Sessions into Workspace Attendance Logs
      const allToday: any[] = Array.isArray(tData?.allSessions)
        ? tData.allSessions
        : tData?.clockIn
        ? [tData]
        : [];

      allToday.forEach((s: any) => {
        if (!s || !s.id) return;
        const idx = combinedList.findIndex((item: any) => item.id === s.id);
        const existingItem = idx >= 0 ? combinedList[idx] : null;
        const membership =
          existingItem?.membership ||
          s.membership ||
          tData?.membership ||
          currentMembershipObj;

        const merged = {
          ...(existingItem || {}),
          ...s,
          membership,
        };

        if (idx >= 0) {
          combinedList[idx] = merged;
        } else {
          const sDateStr = new Date(s.date || s.clockIn).toISOString().slice(0, 10);
          const todayDateStr = new Date().toISOString().slice(0, 10);
          if (!filterDate || filterDate === sDateStr || filterDate === todayDateStr) {
            combinedList.unshift(merged);
          }
        }
      });

      setAttendanceList(combinedList);

      const sData = rawSummary.data !== undefined ? rawSummary.data : rawSummary;
      setSummaryMetrics(sData);

      const shData = rawShifts.data !== undefined ? rawShifts.data : rawShifts;
      setShiftsList(Array.isArray(shData) ? shData : []);

      const cData = rawCorrections.data !== undefined ? rawCorrections.data : rawCorrections;
      setCorrectionsList(Array.isArray(cData) ? cData : []);

      const pData = rawPolicy.data !== undefined ? rawPolicy.data : rawPolicy;
      setPolicy(pData);
      setPolicyForm(pData || {});

      const wsData = rawWs.data !== undefined ? rawWs.data : rawWs;
      let attendanceDisabled = false;
      if (wsData?.settings?.enabledModules && Array.isArray(wsData.settings.enabledModules)) {
        const enabled = wsData.settings.enabledModules.includes('attendance') || wsData.settings.enabledModules.includes('time');
        attendanceDisabled = !enabled;
        setIsAttendanceDisabled(!enabled);
      } else {
        setIsAttendanceDisabled(false);
      }

      const lvData = rawLeave.data !== undefined ? rawLeave.data : rawLeave;
      setLeaveRequests(Array.isArray(lvData) ? lvData : []);

      const bData = rawBalance.data !== undefined ? rawBalance.data : rawBalance;
      setLeaveBalances(Array.isArray(bData) ? bData : []);

      if (attendanceDisabled && typeof window !== 'undefined') {
        const tabParam = new URLSearchParams(window.location.search).get('tab');
        if (!tabParam || tabParam === 'my_attendance') {
          setActiveTab('leave');
        }
      }
    } catch (err: any) {
      console.error('Error loading attendance engine data:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasPerm = (perm: string) => {
    if (isPlatformAdmin) return true;
    const [mod] = perm.split(':');
    return (
      userPermissions.includes(perm) ||
      userPermissions.includes(`${mod}:manage`) ||
      userPermissions.includes(`${mod}:administer`)
    );
  };

  const canAccessShiftTracker = !isAttendanceDisabled && (
    isPlatformAdmin ||
    hasPerm('attendance:clock') ||
    hasPerm('attendance:manage')
  );

  const canViewAttendance = !isAttendanceDisabled && (
    isPlatformAdmin ||
    hasPerm('attendance:view') ||
    hasPerm('attendance:clock') ||
    hasPerm('attendance:manage')
  );

  const canManageShiftsPolicy = !isAttendanceDisabled && (
    isPlatformAdmin ||
    hasPerm('time:manage') ||
    hasPerm('attendance:manage') ||
    currentUserRole === 'OWNER' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'MANAGER'
  );

  const canViewCorrections = !isAttendanceDisabled && (
    isPlatformAdmin ||
    hasPerm('attendance:edit') ||
    hasPerm('attendance:manage') ||
    currentUserRole === 'OWNER' ||
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'MANAGER'
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'leave') {
        setActiveTab('leave');
      }
    }
    loadAllData();

    // Instant cross-component sync listener (e.g. top header navbar Start Break / End Break / Clock Out)
    const handleSyncEvent = () => {
      loadAllData();
    };
    window.addEventListener('attendance-updated', handleSyncEvent);
    window.addEventListener('time-engine-updated', handleSyncEvent);

    // Periodic live sync every 30s
    const syncInterval = setInterval(() => {
      loadAllData();
    }, 30000);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('attendance-updated', handleSyncEvent);
      window.removeEventListener('time-engine-updated', handleSyncEvent);
    };
  }, [filterDate]);

  // Clock Actions
  const handleClockIn = async () => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
      return;
    }
    if (!canAccessShiftTracker) {
      toast.error('You do not have permission to clock in or track shifts. Please request the attendance:clock permission.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ notes: sessionNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock in');
      toast.success(
        data.status === 'LATE'
          ? `Clocked in (Recorded as LATE by ${data.metadata?.lateMinutes || 0} mins)`
          : 'Clocked in successfully!'
      );
      setSessionNotes('');
      await loadAllData();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('time-engine-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Error clocking in');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Clock-out Confirmation and Summary Modal
  const handleOpenClockOutModal = () => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
      return;
    }
    if (!canAccessShiftTracker) {
      toast.error('You do not have permission to clock out. Please request the attendance:clock permission.');
      return;
    }
    setClockOutNotes(sessionNotes || '');
    setShowClockOutModal(true);
  };

  // Final Clock Out Execution
  const executeClockOut = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ notes: clockOutNotes.trim() || sessionNotes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock out');
      toast.success(`Clocked out successfully! ${data.totalWorkMinutes || 0} net productive minutes recorded.`);
      setShowClockOutModal(false);
      setClockOutNotes('');
      setSessionNotes('');
      await loadAllData();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('time-engine-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Error clocking out');
    } finally {
      setActionLoading(false);
    }
  };

  // Neutral Break Engine: Start Break immediately without forcing category choice
  const handleStartBreak = async (overrideCategory?: string) => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
      return;
    }
    if (!canAccessShiftTracker) {
      toast.error('You do not have permission to log breaks.');
      return;
    }
    setActionLoading(true);
    try {
      const categoryToUse = overrideCategory || selectedBreakCategory || 'General Break';
      const typeCode = categoryToUse.toUpperCase().replace(/[\s/]+/g, '_');
      const res = await fetch(`${BRANDING.apiUrl}/time/break/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({
          breakType: typeCode,
          notes: sessionNotes.trim() || categoryToUse,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start break');
      toast.success(`Break started: ${categoryToUse}. Work timer paused, break timer active.`);
      setSessionNotes('');
      await loadAllData();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('time-engine-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Error starting break');
    } finally {
      setActionLoading(false);
    }
  };

  // End Break: Resume work session immediately
  const handleEndBreak = async () => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
      return;
    }
    if (!canAccessShiftTracker) {
      toast.error('You do not have permission to end breaks.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/break/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to end break');
      toast.success('Break ended - Work session resumed!');
      await loadAllData();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('time-engine-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Error ending break');
    } finally {
      setActionLoading(false);
    }
  };

  // Accidental Break Correction Handling
  const handleOpenBreakCorrection = (breakItem: any, index: number) => {
    setBreakCorrectionTarget({ ...breakItem, index });
    const startStr = breakItem.breakStart
      ? new Date(breakItem.breakStart).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);
    const endStr = breakItem.breakEnd
      ? new Date(breakItem.breakEnd).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);
    setRequestedBreakStart(startStr);
    setRequestedBreakEnd(endStr);
    setBreakCorrectionReason('');
    setShowBreakCorrectionModal(true);
  };

  const handleSubmitBreakCorrection = async () => {
    if (!todayData?.id || !breakCorrectionTarget || !requestedBreakStart || !requestedBreakEnd || !breakCorrectionReason.trim()) {
      toast.error('Please provide requested break start, end, and an explanatory reason');
      return;
    }
    setSubmittingBreakCorrection(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({
          attendanceId: todayData.id,
          type: 'BREAK',
          breakId: breakCorrectionTarget.id,
          requestedBreakStart,
          requestedBreakEnd,
          reason: `[BREAK CORRECTION #${breakCorrectionTarget.index}] ${breakCorrectionReason.trim()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit break correction');
      toast.success('Break correction request submitted for manager approval');
      setShowBreakCorrectionModal(false);
      setBreakCorrectionReason('');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting break correction');
    } finally {
      setSubmittingBreakCorrection(false);
    }
  };

  // Correction Submission
  const handleSubmitCorrection = async () => {
    if (!correctionTarget || !requestedClockIn || !requestedClockOut || !correctionReason.trim()) {
      toast.error('Please provide requested clock-in, clock-out and a detailed justification');
      return;
    }
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({
          attendanceId: correctionTarget.id,
          requestedClockIn,
          requestedClockOut,
          reason: correctionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit correction');
      toast.success('Attendance correction submitted for manager approval');
      setShowCorrectionModal(false);
      setCorrectionReason('');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting correction');
    }
  };

  const handleApproveCorrection = async (id: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/corrections/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve correction');
      toast.success('Attendance correction approved and records updated');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error approving correction');
    }
  };

  const handleRejectCorrection = async (id: string) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/corrections/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject correction');
      toast.success('Attendance correction rejected');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error rejecting correction');
    }
  };

  // Shift Creation
  const handleCreateShift = async () => {
    if (!newShiftName.trim()) {
      toast.error('Shift name is required');
      return;
    }
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({
          name: newShiftName,
          startTime: newShiftStart,
          endTime: newShiftEnd,
          workDays: newShiftDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create shift');
      toast.success(`Shift "${data.name}" configured successfully`);
      setShowShiftModal(false);
      setNewShiftName('');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating shift');
    }
  };

  // Policy Save
  const handleSavePolicy = async () => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/policy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify(policyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update policy');
      toast.success('Attendance policy updated successfully');
      setPolicy(data);
    } catch (err: any) {
      toast.error(err.message || 'Error updating policy');
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      if (filteredLogs.length === 0) {
        toast.info('No attendance records available to export.');
        return;
      }

      const rows = filteredLogs.map((a) => {
        const nowMs = currentTime ? currentTime.getTime() : Date.now();
        const clockInMs = new Date(a.clockIn).getTime();
        const endPointMs = a.clockOut ? new Date(a.clockOut).getTime() : nowMs;
        const gross = Math.max(0, Math.round((endPointMs - clockInMs) / 60000));
        let brk = 0;
        (a.breaks || []).forEach((b: any) => {
          if (b.durationMinutes && b.durationMinutes > 0) brk += b.durationMinutes;
          else if (b.breakEnd) brk += Math.max(0, Math.round((new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime()) / 60000));
          else if (b.breakStart) brk += Math.max(0, Math.round((nowMs - new Date(b.breakStart).getTime()) / 60000));
        });
        const effBrk = Math.max(a.totalBreakMinutes || 0, brk);
        const net = (a.clockOut && a.totalWorkMinutes && a.totalWorkMinutes > 0) ? a.totalWorkMinutes : Math.max(0, gross - effBrk);

        return {
          'Employee Name': `${a.membership?.user?.firstName || ''} ${a.membership?.user?.lastName || ''}`.trim() || 'Staff',
          'Email': a.membership?.user?.email || '',
          'Department': a.membership?.department?.name || 'General',
          'Team': a.membership?.team?.name || '',
          'Date': new Date(a.date || a.clockIn).toLocaleDateString(),
          'Clock In': new Date(a.clockIn).toLocaleTimeString(),
          'Clock Out': a.clockOut ? new Date(a.clockOut).toLocaleTimeString() : 'Active',
          'Net Hours': (net < 480 && (net / 60).toFixed(1) === '8.0') ? '7.9' : (net / 60).toFixed(1),
          'Net Minutes': net,
          'Total Break Minutes': effBrk,
          'Breaks Count': (a.breaks || []).length,
          'Status': a.clockOut ? (a.status === 'HALF_DAY' ? 'HALF DAY' : a.status === 'LATE' ? 'LATE' : 'COMPLETED') : 'ON SHIFT',
        };
      });

      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(','),
        ...rows.map((r: any) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attendance records exported successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  // Leave Handlers
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyStartDate || !applyEndDate) {
      toast.error('Please select start and end dates');
      return;
    }
    setSubmittingLeave(true);
    try {
      const activeHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-workspace-id': wsId!,
      };
      const res = await fetch(`${BRANDING.apiUrl}/leave`, {
        method: 'POST',
        headers: activeHeaders,
        body: JSON.stringify({
          leaveType: applyLeaveType,
          startDate: applyStartDate,
          endDate: applyEndDate,
          reason: applyReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit leave request');
      toast.success('Leave request submitted successfully!');
      setShowApplyLeaveModal(false);
      setApplyReason('');
      setApplyStartDate('');
      setApplyEndDate('');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const activeHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-workspace-id': wsId!,
      };
      const res = await fetch(`${BRANDING.apiUrl}/leave/${id}/status`, {
        method: 'PATCH',
        headers: activeHeaders,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${status.toLowerCase()} leave`);
      toast.success(`Leave request ${status.toLowerCase()} successfully`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error updating leave status');
    }
  };

  const liveMetrics = calculateShiftLiveMetrics();
  const isClockedIn = liveMetrics.isClockedIn;
  const isOnBreak = liveMetrics.isOnBreak;
  const activeBreak = liveMetrics.activeBreak;
  const allTodaySessions = todayData?.allSessions || [];
  const sessionsCount = todayData?.todaySummary?.sessionsCount || (allTodaySessions.length > 0 ? allTodaySessions.length : (todayData?.clockIn ? 1 : 0));
  const canClockInAgain = !isClockedIn && (todayData?.todaySummary?.canClockInAgain ?? true);

  // Filter logs
  const filteredLogs = attendanceList.filter((a) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = `${a.membership?.user?.firstName || ''} ${a.membership?.user?.lastName || ''}`.toLowerCase();
      const dept = (a.membership?.department?.name || '').toLowerCase();
      if (!name.includes(q) && !dept.includes(q)) return false;
    }
    return true;
  });

  // Dynamically compute live metrics across filteredLogs so active shifts are included accurately
  const liveComputedTotalWorkMinutes = filteredLogs.reduce((sum, a) => {
    const clockInMs = new Date(a.clockIn).getTime();
    const endPointMs = a.clockOut ? new Date(a.clockOut).getTime() : (currentTime ? currentTime.getTime() : Date.now());
    const grossMins = Math.max(0, Math.round((endPointMs - clockInMs) / 60000));
    let brkMins = 0;
    (a.breaks || []).forEach((b: any) => {
      if (b.durationMinutes && b.durationMinutes > 0) brkMins += b.durationMinutes;
      else if (b.breakEnd) brkMins += Math.max(0, Math.round((new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime()) / 60000));
      else if (b.breakStart) brkMins += Math.max(0, Math.round(((currentTime ? currentTime.getTime() : Date.now()) - new Date(b.breakStart).getTime()) / 60000));
    });
    const effBrk = Math.max(a.totalBreakMinutes || 0, brkMins);
    const netMins = (a.clockOut && a.totalWorkMinutes && a.totalWorkMinutes > 0) ? a.totalWorkMinutes : Math.max(0, grossMins - effBrk);
    return sum + netMins;
  }, 0);

  const displayTotalWorkHours = (liveComputedTotalWorkMinutes / 60).toFixed(1);
  const activeStaffCount = filteredLogs.filter((a) => !a.clockOut).length;
  const uniqueEmployeeCount = new Set(filteredLogs.map((a) => a.membershipId || a.membership?.id || a.id)).size;
  const lateCountDynamic = filteredLogs.filter((a) => a.status === 'LATE').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time & Attendance Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configurable work shifts, multi-session day tracking, break monitoring, and attendance exception management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={loadAllData} className="gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Module Disabled Warning */}
      {isAttendanceDisabled && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Attendance &amp; Shifts Module is Disabled</h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                Attendance tracking and shift monitoring are disabled for this workspace. An administrator can enable <strong>Attendance &amp; Shifts</strong> in Workspace Settings or configure permissions in Roles &amp; Permissions.
              </p>
            </div>
          </div>
          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || isPlatformAdmin) && (
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/app/settings?tab=roles"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Roles &amp; Permissions &rarr;
              </a>
              <a
                href="/app/settings?tab=modules"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-600/50 bg-background/50 hover:bg-background text-amber-800 dark:text-amber-200 text-xs font-semibold transition-colors shadow-sm"
              >
                Modules
              </a>
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-border gap-1 text-sm font-medium">
        {!isAttendanceDisabled && (canAccessShiftTracker || canViewAttendance) && (
          <button
            onClick={() => setActiveTab('my_attendance')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'my_attendance'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" /> My Shift &amp; Sessions
          </button>
        )}
        {!isAttendanceDisabled && canViewAttendance && (
          <button
            onClick={() => setActiveTab('team_logs')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'team_logs'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" /> Workspace Attendance Logs
          </button>
        )}
        {!isAttendanceDisabled && canViewCorrections && (
          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'corrections'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" /> Exceptions &amp; Corrections
            {correctionsList.filter((c) => c.status === 'PENDING').length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {correctionsList.filter((c) => c.status === 'PENDING').length}
              </Badge>
            )}
          </button>
        )}
        {!isAttendanceDisabled && canManageShiftsPolicy && (
          <button
            onClick={() => setActiveTab('shifts_policy')}
            className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'shifts_policy'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" /> Shifts &amp; Policies
          </button>
        )}
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'leave'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" /> Leave &amp; PTO
          {leaveRequests.filter((l) => l.status === 'PENDING').length > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              {leaveRequests.filter((l) => l.status === 'PENDING').length}
            </Badge>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MY SHIFT & SESSIONS
          ========================================================================= */}
      {activeTab === 'my_attendance' && (
        <div className="space-y-6">
          {/* Attendance Disabled Empty State */}
          {isAttendanceDisabled && (
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="py-12 text-center space-y-3">
                <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <h3 className="text-base font-semibold text-foreground">Attendance &amp; Shifts Module is Disabled</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Shift tracking, clock-in/out, and session histories are disabled in workspace settings. You can manage your leave requests and time off under the Leave &amp; PTO tab.
                </p>
                <div className="pt-2">
                  <Button size="sm" onClick={() => setActiveTab('leave')} className="text-xs">
                    Switch to Leave &amp; PTO &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Shift Tracker Access Restricted banner */}
          {!canAccessShiftTracker && !isAttendanceDisabled && (
            <Card className="border-border bg-muted/20">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Shift Tracker Access Restricted</div>
                    <div className="text-[11px] text-muted-foreground">
                      Access to the real-time Shift Tracker and Clock In/Out is controlled by Roles &amp; Permissions. Your current role does not have the <span className="font-mono text-primary font-semibold">attendance:clock</span> permission.
                    </div>
                  </div>
                </div>
                {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || isPlatformAdmin) && (
                  <a
                    href="/app/settings?tab=roles"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shrink-0 transition-colors shadow-sm"
                  >
                    Configure in Roles &amp; Permissions &rarr;
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Real-time Status Card - Only shown if authorized and attendance enabled */}
          {canAccessShiftTracker && (
            <Card className="border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 bg-surface-secondary/20 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      My Today Shift Tracker
                    </CardTitle>
                    {liveMetrics.isOvernight && (
                      <Badge variant="outline" className="border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 gap-1 text-[11px]">
                        <Moon className="h-3 w-3" /> Overnight Shift (Crossed Midnight)
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {todayData?.todaySummary?.assignedShift
                      ? `Assigned Shift: ${todayData.todaySummary.assignedShift.name} (${todayData.todaySummary.assignedShift.startTime} - ${todayData.todaySummary.assignedShift.endTime})`
                      : 'Standard Organization Shift (9:00 AM - 5:00 PM)'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {todayData?.todaySummary?.isOnLeave && (
                    <Badge variant="outline" className="border-indigo-400 text-indigo-700 dark:text-indigo-300">
                      Approved Leave
                    </Badge>
                  )}
                  {todayData?.todaySummary?.isHoliday && (
                    <Badge variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-300">
                      Holiday: {todayData.todaySummary.holidayName}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {/* DUAL LIVE TIMERS DISPLAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Timer 1: Live Work-Session Timer (Net Productive Time) */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    isOnBreak
                      ? 'bg-muted/30 border-dashed border-amber-400/60 dark:border-amber-600/60'
                      : isClockedIn
                      ? 'bg-emerald-500/[0.04] border-emerald-500/30 ring-1 ring-emerald-500/10'
                      : 'bg-surface-secondary/30 border-border'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Timer className="h-4 w-4" />
                        <span>Work Session Timer (Net)</span>
                      </div>
                      {isOnBreak ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Pause className="h-3 w-3" />
                          <span>PAUSED DURING BREAK</span>
                        </span>
                      ) : isClockedIn ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>ACTIVE WORK SESSION</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-medium">Ready to Clock In</span>
                      )}
                    </div>

                    <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                      {liveMetrics.hoursWorkedDisplay}
                    </div>

                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {isClockedIn ? (
                        <>
                          <span>Shift Span (Gross): <strong className="font-mono text-foreground">{liveMetrics.shiftSpanDisplay}</strong></span>
                          <span>&bull;</span>
                          <span>Clocked In: <strong className="text-foreground">{formatTimeOnly(todayData?.clockIn)}</strong></span>
                        </>
                      ) : sessionsCount > 0 ? (
                        <span>Completed {sessionsCount} session(s) today. Ready for next session.</span>
                      ) : (
                        <span>Tap &ldquo;Start Shift (Clock In)&rdquo; to begin tracking productive time.</span>
                      )}
                    </div>
                  </div>

                  {/* Timer 2: Current-Break Timer */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    isOnBreak
                      ? 'bg-amber-500/[0.08] border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-surface-secondary/30 border-border opacity-90'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Coffee className="h-4 w-4" />
                        <span>Current Break Timer</span>
                      </div>
                      {isOnBreak ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                          </span>
                          <span>BREAK IN PROGRESS</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-medium">Inactive &bull; Working</span>
                      )}
                    </div>

                    <div className={`font-mono text-3xl sm:text-4xl font-bold tracking-tight ${
                      isOnBreak ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/60'
                    }`}>
                      {liveMetrics.currentBreakDisplay}
                    </div>

                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {isOnBreak ? (
                        <>
                          <span>Break Category: <strong className="text-foreground">{(activeBreak?.breakType || selectedBreakCategory || 'General Break').replace(/_/g, ' ')}</strong></span>
                          <span>&bull;</span>
                          <span>Started at: <strong className="text-foreground">{formatTimeOnly(activeBreak?.breakStart)}</strong></span>
                        </>
                      ) : (
                        <>
                          <span>Breaks Taken: <strong className="text-foreground">{liveMetrics.breaksList.length}</strong></span>
                          <span>&bull;</span>
                          <span>Total Break Time: <strong className="text-foreground">{liveMetrics.totalBreaksDisplay}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTION CONTROLS WITH NEUTRAL WORDING */}
                <div className="p-4 rounded-xl border border-border bg-surface-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    {isAttendanceDisabled ? (
                      <span>Attendance module is disabled in Workspace Settings.</span>
                    ) : isOnBreak ? (
                      <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                        <Coffee className="h-4 w-4 shrink-0" />
                        Currently on break. Tap <strong>&ldquo;End break&rdquo;</strong> to immediately resume your work session timer.
                      </span>
                    ) : isClockedIn ? (
                      <span className="flex items-center gap-1.5 text-foreground">
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                        Work session is active. Take breaks whenever needed; tracking records actual timestamps.
                      </span>
                    ) : (
                      <span>Clock in to begin your shift session. Supports multiple sessions and breaks.</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {isAttendanceDisabled ? (
                      <Button disabled size="lg" className="opacity-50">Module Disabled</Button>
                    ) : isClockedIn ? (
                      isOnBreak ? (
                        <>
                          {/* ON BREAK: Primary action is "End break" */}
                          <Button
                            size="lg"
                            onClick={handleEndBreak}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm"
                          >
                            <Play className="h-4 w-4" /> End break
                          </Button>
                          <Button
                            size="lg"
                            variant="destructive"
                            onClick={handleOpenClockOutModal}
                            disabled={actionLoading}
                            className="gap-2 shadow-sm font-semibold"
                          >
                            <Square className="h-4 w-4" /> Clock Out
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* WORKING: Primary action is "Start break" with optional neutral category */}
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedBreakCategory}
                              onChange={(e) => setSelectedBreakCategory(e.target.value)}
                              className="h-10 text-xs px-2.5 rounded-lg border border-border bg-background text-foreground"
                              title="Optional break category (not mandatory)"
                            >
                              <option value="General Break">General Break</option>
                              <option value="Short Rest">Short Rest</option>
                              <option value="Lunch Break">Lunch Break</option>
                              <option value="Tea / Coffee">Tea / Coffee</option>
                              <option value="Personal Break">Personal Break</option>
                            </select>
                            <Button
                              size="lg"
                              onClick={() => handleStartBreak()}
                              disabled={actionLoading}
                              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-semibold shadow-sm"
                            >
                              <Coffee className="h-4 w-4" /> Start break
                            </Button>
                          </div>
                          <Button
                            size="lg"
                            variant="destructive"
                            onClick={handleOpenClockOutModal}
                            disabled={actionLoading}
                            className="gap-2 shadow-sm font-semibold"
                          >
                            <Square className="h-4 w-4" /> Clock Out
                          </Button>
                        </>
                      )
                    ) : canClockInAgain ? (
                      <Button size="lg" onClick={handleClockIn} disabled={actionLoading} className="gap-2 shadow-sm font-semibold">
                        <Play className="h-4 w-4" /> {sessionsCount > 0 ? `Clock In Session #${sessionsCount + 1}` : 'Start Shift (Clock In)'}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="py-2.5 px-4 text-xs font-semibold">
                        Daily Session Limit Reached
                      </Badge>
                    )}
                  </div>
                </div>

                {/* OPTIONAL NOTES INPUT */}
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Optional note for current action or shift handoff (e.g. Remote work, client meeting, specific task)..."
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* TODAY'S METRICS BAR */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase">Net Productive Time</div>
                    <div className="text-xl font-bold font-mono text-foreground mt-1">
                      {liveMetrics.hoursWorkedDisplay}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase">Total Break Time</div>
                    <div className="text-xl font-bold font-mono text-foreground mt-1">
                      {liveMetrics.totalBreaksDisplay}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase">Breaks Count</div>
                    <div className="text-xl font-bold text-foreground mt-1">
                      {liveMetrics.breaksList.length} break{liveMetrics.breaksList.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase">Overtime Accrued</div>
                    <div className="text-xl font-bold font-mono text-foreground mt-1">
                      {liveMetrics.overtimeMinutes} mins
                    </div>
                  </div>
                </div>

                {/* CURRENT SHIFT BREAKS BREAKDOWN LIST */}
                {(liveMetrics.breaksList.length > 0 || isOnBreak) && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-3 bg-surface-secondary/30 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Current Shift Breaks Breakdown ({liveMetrics.breaksList.length})
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Timestamps recorded accurately. Auto-calculated durations.
                      </span>
                    </div>

                    <div className="divide-y divide-border">
                      {liveMetrics.breaksList.map((b: any, bIdx: number) => {
                        const isCurrentActive = !b.breakEnd;
                        const durationMins = isCurrentActive
                          ? Math.round(liveMetrics.currentBreakSeconds / 60)
                          : (b.durationMinutes || Math.round((new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime()) / 60000));
                        const categoryName = (b.breakType || 'General Break').replace(/_/g, ' ');

                        return (
                          <div key={b.id || bIdx} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-foreground min-w-[65px]">
                                Break #{bIdx + 1}
                              </span>
                              <Badge variant="outline" className="text-[11px] border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                                {categoryName}
                              </Badge>
                              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2">
                                <span>Start: <strong className="text-foreground">{formatTimeOnly(b.breakStart)}</strong></span>
                                <span>&rarr;</span>
                                <span>End: {isCurrentActive ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold animate-pulse">In Progress...</span>
                                ) : (
                                  <strong className="text-foreground">{formatTimeOnly(b.breakEnd)}</strong>
                                )}</span>
                                <span>&bull;</span>
                                <span>Duration: <strong className="font-mono text-foreground">{durationMins} mins</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenBreakCorrection(b, bIdx + 1)}
                                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground gap-1 border border-border/60"
                              >
                                <FileText className="h-3 w-3" /> Request Correction
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

          {/* Today's Multi-Session Timeline */}
          {!isAttendanceDisabled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Today&apos;s Work Sessions History</CardTitle>
                  <CardDescription>Each work segment recorded today is preserved independently</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {allTodaySessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No attendance sessions recorded for today. Clock in to start your first session.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {allTodaySessions.map((s: any, idx: number) => {
                      const grossMins = s.clockOut
                        ? Math.round((new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000)
                        : Math.round((Date.now() - new Date(s.clockIn).getTime()) / 60000);
                      return (
                        <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">Session #{idx + 1}</span>
                              {s.clockOut ? (
                                s.status === 'HALF_DAY' ? (
                                  <Badge variant="outline" className="border-purple-300 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px]">HALF DAY</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">COMPLETED</Badge>
                                )
                              ) : (
                                <Badge variant="success" className="text-[10px]">IN PROGRESS</Badge>
                              )}
                              {s.status === 'LATE' && (
                                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">LATE</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span>Clock In: <strong>{new Date(s.clockIn).toLocaleTimeString()}</strong></span>
                              {s.clockOut && (
                                <span> • Clock Out: <strong>{new Date(s.clockOut).toLocaleTimeString()}</strong></span>
                              )}
                              <span> • Worked: <strong>{s.totalWorkMinutes || grossMins} mins</strong></span>
                              <span> • Breaks: <strong>{s.totalBreakMinutes || 0} mins ({s.breaks?.length || 0})</strong></span>
                            </div>
                            {s.notes && <div className="text-[11px] text-muted-foreground italic">&ldquo;{s.notes}&rdquo;</div>}
                          </div>
                          <div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCorrectionTarget(s);
                                setRequestedClockIn(new Date(s.clockIn).toISOString().slice(0, 16));
                                setRequestedClockOut(s.clockOut ? new Date(s.clockOut).toISOString().slice(0, 16) : '');
                                setShowCorrectionModal(true);
                              }}
                              className="text-xs gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5" /> Request Correction
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: WORKSPACE ATTENDANCE LOGS
          ========================================================================= */}
      {activeTab === 'team_logs' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Total Work Hours</div>
              <div className="text-2xl font-bold text-foreground mt-1">{displayTotalWorkHours} hrs</div>
              <div className="text-xs text-muted-foreground mt-0.5">{filteredLogs.length} session{filteredLogs.length === 1 ? '' : 's'} logged</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Staff Presence</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {activeStaffCount > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    {activeStaffCount} on shift
                  </span>
                ) : (
                  `${uniqueEmployeeCount} recorded`
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{uniqueEmployeeCount} employee{uniqueEmployeeCount === 1 ? '' : 's'} recorded</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Attendance Rate</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {summaryMetrics?.attendanceComplianceRate || (filteredLogs.length > 0 ? '100%' : 'N/A')}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{filteredLogs.filter((r) => r.status === 'PRESENT' || !r.clockOut).length} present</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Late Arrivals</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {lateCountDynamic}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{filteredLogs.filter((r) => r.notes?.includes('[AUTO_CLOSED_MISSED_CHECKOUT]')).length} missed checkouts</div>
            </Card>
          </div>

          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employee or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground w-56"
                  />
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
                {filterDate ? (
                  <Button variant="ghost" size="sm" onClick={() => setFilterDate('')} className="text-xs">
                    Clear Date (Show All)
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setFilterDate(getTodayDateString())} className="text-xs">
                    Today
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Showing <strong>{filteredLogs.length}</strong> record(s)
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                      <th className="py-3.5 px-4">Employee & Session</th>
                      <th className="py-3.5 px-4">Department / Shift</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Clock In</th>
                      <th className="py-3.5 px-4">Clock Out</th>
                      <th className="py-3.5 px-4">Net Hours</th>
                      <th className="py-3.5 px-4">Breaks</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((a, rowIdx) => {
                      const nowMs = currentTime ? currentTime.getTime() : Date.now();
                      const clockInMs = new Date(a.clockIn).getTime();
                      const endPointMs = a.clockOut ? new Date(a.clockOut).getTime() : nowMs;
                      const grossMinutes = Math.max(0, Math.round((endPointMs - clockInMs) / 60000));

                      // Dynamic breaks calculation
                      let computedBreakMinutes = 0;
                      const breaksList: any[] = Array.isArray(a.breaks) ? a.breaks : [];
                      const openBreak = breaksList.find((b: any) => !b.breakEnd);
                      const hasOpenBreak = !!openBreak;

                      breaksList.forEach((b: any) => {
                        if (b.breakEnd) {
                          if (b.durationMinutes && b.durationMinutes > 0) {
                            computedBreakMinutes += b.durationMinutes;
                          } else {
                            const bStart = new Date(b.breakStart).getTime();
                            const bEnd = new Date(b.breakEnd).getTime();
                            if (!isNaN(bStart) && !isNaN(bEnd) && bEnd >= bStart) {
                              computedBreakMinutes += Math.max(0, Math.round((bEnd - bStart) / 60000));
                            }
                          }
                        } else if (b.breakStart) {
                          const bStart = new Date(b.breakStart).getTime();
                          if (!isNaN(bStart)) {
                            computedBreakMinutes += Math.max(0, Math.round((nowMs - bStart) / 60000));
                          }
                        }
                      });

                      const totalBreakMinutes = Math.max(a.totalBreakMinutes || 0, computedBreakMinutes);

                      // Dynamic net work minutes calculation
                      let netWorkMinutes = 0;
                      if (a.clockOut && a.totalWorkMinutes && a.totalWorkMinutes > 0) {
                        netWorkMinutes = a.totalWorkMinutes;
                      } else {
                        netWorkMinutes = Math.max(0, grossMinutes - totalBreakMinutes);
                      }
                      const rawNetHours = (netWorkMinutes / 60).toFixed(1);
                      const netHours = (netWorkMinutes < 480 && rawNetHours === '8.0') ? '7.9' : rawNetHours;

                      // Extract session metadata
                      let sessionIndex: number | null = null;
                      let shiftName = '';
                      if (a.notes) {
                        const metaMatch = a.notes.match(/\[META:(\{.*?\})\]/);
                        if (metaMatch) {
                          try {
                            const parsed = JSON.parse(metaMatch[1]);
                            if (parsed.sessionIndex) sessionIndex = parsed.sessionIndex;
                            if (parsed.shiftName) shiftName = parsed.shiftName;
                          } catch (e) {}
                        }
                      }

                      // Fallback session index calculation per employee per day
                      if (!sessionIndex) {
                        const memberKey = a.membershipId || a.membership?.id || a.membership?.user?.email || 'unknown';
                        const aDateStr = new Date(a.date || a.clockIn).toDateString();
                        const sameDaySessions = filteredLogs
                          .filter((x) => {
                            const xKey = x.membershipId || x.membership?.id || x.membership?.user?.email || 'unknown';
                            const xDateStr = new Date(x.date || x.clockIn).toDateString();
                            return xKey === memberKey && xDateStr === aDateStr;
                          })
                          .sort((x, y) => new Date(x.clockIn).getTime() - new Date(y.clockIn).getTime());
                        const seq = sameDaySessions.findIndex((x) => x.id === a.id) + 1;
                        sessionIndex = seq > 0 ? seq : 1;
                      }

                      // Clean user notes
                      const displayNotes = (a.notes || '')
                        .replace(/\[META:\{.*?\}\]/g, '')
                        .replace(/\[AUTO_CLOSED_MISSED_CHECKOUT\]/g, 'Auto-closed (missed checkout)')
                        .replace(/\[OUT:\s*(.*?)\]/g, 'Handoff: $1')
                        .trim();

                      const isExpanded = expandedSessionId === a.id;

                      return (
                        <React.Fragment key={a.id || rowIdx}>
                          <tr className="hover:bg-surface-secondary/20 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    {a.membership?.user?.firstName || 'Staff'} {a.membership?.user?.lastName || 'Member'}
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono font-medium border-muted-foreground/30">
                                      Session #{sessionIndex}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">{a.membership?.user?.email || a.membership?.employeeId || ''}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-foreground text-xs font-medium">{a.membership?.department?.name || 'General'}</div>
                              <div className="text-[11px] text-muted-foreground">{shiftName || a.membership?.team?.name || 'Standard Shift'}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                              {new Date(a.date || a.clockIn).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs font-medium">
                              {new Date(a.clockIn).toLocaleTimeString()}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs">
                              {a.clockOut ? (
                                new Date(a.clockOut).toLocaleTimeString()
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-foreground text-xs">
                              <div className="flex items-center gap-1.5">
                                <span>{netHours} hrs ({netWorkMinutes}m)</span>
                                {!a.clockOut && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 font-mono">
                                    Live
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-foreground font-semibold">{totalBreakMinutes}m</span>
                                <span className="text-muted-foreground text-[11px]">({breaksList.length} break{breaksList.length === 1 ? '' : 's'})</span>
                                {hasOpenBreak && (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-[9px] px-1 py-0">
                                    On Break
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1">
                                  {hasOpenBreak ? (
                                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-[10px]">
                                      ON BREAK
                                    </Badge>
                                  ) : !a.clockOut ? (
                                    <Badge variant="success" className="text-[10px]">IN PROGRESS</Badge>
                                  ) : a.status === 'HALF_DAY' ? (
                                    <Badge variant="outline" className="border-purple-300 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px]">
                                      HALF DAY
                                    </Badge>
                                  ) : a.status === 'LATE' ? (
                                    <>
                                      <Badge variant="secondary" className="text-[10px]">COMPLETED</Badge>
                                      <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-[10px]">
                                        LATE
                                      </Badge>
                                    </>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">COMPLETED</Badge>
                                  )}
                                </div>
                                {displayNotes && (
                                  <div className="text-[10px] text-muted-foreground italic truncate max-w-[200px]" title={displayNotes}>
                                    &ldquo;{displayNotes}&rdquo;
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {breaksList.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setExpandedSessionId(isExpanded ? null : a.id)}
                                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                                    title={isExpanded ? 'Hide break timeline' : 'View break breakdown'}
                                  >
                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    <span className="text-[11px]">{breaksList.length} break{breaksList.length === 1 ? '' : 's'}</span>
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCorrectionTarget(a);
                                    setRequestedClockIn(new Date(a.clockIn).toISOString().slice(0, 16));
                                    setRequestedClockOut(a.clockOut ? new Date(a.clockOut).toISOString().slice(0, 16) : '');
                                    setShowCorrectionModal(true);
                                  }}
                                  className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                                  title="Request Attendance Correction"
                                >
                                  <FileText className="h-3 w-3" /> Correct
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/30">
                              <td colSpan={9} className="py-3 px-6">
                                <div className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-2">
                                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    <Coffee className="h-3.5 w-3.5 text-amber-600" /> Breaks Breakdown for Session #{sessionIndex}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {breaksList.map((b: any, bIdx: number) => {
                                      const bStart = new Date(b.breakStart).toLocaleTimeString();
                                      const bEnd = b.breakEnd ? new Date(b.breakEnd).toLocaleTimeString() : 'In Progress';
                                      let bDur = b.durationMinutes;
                                      if (!bDur) {
                                        const bEndMs = b.breakEnd ? new Date(b.breakEnd).getTime() : nowMs;
                                        bDur = Math.max(1, Math.round((bEndMs - new Date(b.breakStart).getTime()) / 60000));
                                      }
                                      return (
                                        <div key={b.id || bIdx} className="text-xs p-2 rounded border border-border bg-card flex items-center justify-between">
                                          <div>
                                            <div className="font-medium text-foreground">{b.breakType?.replace(/_/g, ' ') || 'General Break'}</div>
                                            <div className="text-[11px] text-muted-foreground">{bStart} - {bEnd}</div>
                                          </div>
                                          <Badge variant={b.breakEnd ? 'secondary' : 'default'} className="text-[10px]">
                                            {bDur}m
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {displayNotes && (
                                    <div className="text-xs text-muted-foreground border-t border-border/50 pt-2">
                                      <strong>Notes / Handoff:</strong> {displayNotes}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                          No matching attendance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 3: EXCEPTIONS & CORRECTIONS
          ========================================================================= */}
      {activeTab === 'corrections' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Attendance Correction Requests</CardTitle>
                <CardDescription>
                  Review and audit requests submitted by employees to rectify forgotten clock-ins, missed checkouts, or break times
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {correctionsList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  No attendance correction requests filed.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {correctionsList.map((c) => {
                    const isBreakCorr = c.type === 'BREAK' || c.reason?.includes('BREAK CORRECTION');
                    return (
                      <div key={c.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{c.employeeName}</span>
                            {isBreakCorr && (
                              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 gap-1">
                                <Coffee className="h-3 w-3" /> Break Correction
                              </Badge>
                            )}
                            {c.status === 'PENDING' ? (
                              <Badge variant="outline" className="border-amber-400 text-amber-700">PENDING APPROVAL</Badge>
                            ) : c.status === 'APPROVED' ? (
                              <Badge variant="success">APPROVED</Badge>
                            ) : (
                              <Badge variant="destructive">REJECTED</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isBreakCorr ? (
                              <>
                                <span>Original Break: {c.originalBreakStart ? new Date(c.originalBreakStart).toLocaleTimeString() : 'Start'} &rarr; {c.originalBreakEnd ? new Date(c.originalBreakEnd).toLocaleTimeString() : 'In Progress'}</span>
                                <span className="mx-2 font-bold text-foreground">&bull;</span>
                                <span className="text-foreground font-semibold">
                                  Requested Break: {c.requestedBreakStart ? new Date(c.requestedBreakStart).toLocaleTimeString() : (c.requestedClockIn ? new Date(c.requestedClockIn).toLocaleTimeString() : '--')} &rarr; {c.requestedBreakEnd ? new Date(c.requestedBreakEnd).toLocaleTimeString() : (c.requestedClockOut ? new Date(c.requestedClockOut).toLocaleTimeString() : '--')}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>Original: {new Date(c.originalClockIn).toLocaleTimeString()} &rarr; {c.originalClockOut ? new Date(c.originalClockOut).toLocaleTimeString() : 'Missing'}</span>
                                <span className="mx-2 font-bold text-foreground">&bull;</span>
                                <span className="text-foreground font-semibold">
                                  Requested: {new Date(c.requestedClockIn).toLocaleTimeString()} &rarr; {new Date(c.requestedClockOut).toLocaleTimeString()}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Justification: &ldquo;<span className="text-foreground">{c.reason}</span>&rdquo;
                          </div>
                        </div>
                        {c.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleApproveCorrection(c.id)} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectCorrection(c.id)} className="gap-1 text-xs">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SHIFTS & POLICIES
          ========================================================================= */}
      {activeTab === 'shifts_policy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Configured Shifts Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Configured Workspace Shifts</CardTitle>
                <CardDescription>Define organization shifts, overnight working hours and grace periods</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowShiftModal(true)} className="gap-1.5 text-xs">
                <Plus className="h-4 w-4" /> Add Shift
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {shiftsList.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                        {s.name}
                        {s.isOvernight && (
                          <Badge variant="outline" className="border-indigo-400 text-indigo-700 text-[10px] gap-1">
                            <Moon className="h-3 w-3" /> Overnight Shift
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Timing: <strong>{s.startTime} &rarr; {s.endTime}</strong>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {Array.isArray(s.workDays) ? s.workDays.join(', ') : 'MON - FRI'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Policy Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance &amp; Session Policy</CardTitle>
              <CardDescription>Global rules governing multi-session days, breaks, grace period &amp; overtime</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-secondary/20">
                <div>
                  <div className="text-xs font-semibold text-foreground">Allow Multiple Sessions Per Day</div>
                  <div className="text-[11px] text-muted-foreground">Permit employee to clock in again after clocking out on the same day</div>
                </div>
                <input
                  type="checkbox"
                  checked={policyForm.allowMultipleSessionsPerDay ?? true}
                  onChange={(e) => setPolicyForm({ ...policyForm, allowMultipleSessionsPerDay: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Max Daily Sessions</label>
                  <input
                    type="number"
                    value={policyForm.maxDailySessions || 5}
                    onChange={(e) => setPolicyForm({ ...policyForm, maxDailySessions: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Grace Period (Mins)</label>
                  <input
                    type="number"
                    value={policyForm.gracePeriodMinutes || 15}
                    onChange={(e) => setPolicyForm({ ...policyForm, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Half Day Threshold (Mins)</label>
                  <input
                    type="number"
                    value={policyForm.halfDayMinutes || 240}
                    onChange={(e) => setPolicyForm({ ...policyForm, halfDayMinutes: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Full Day Threshold (Mins)</label>
                  <input
                    type="number"
                    value={policyForm.fullDayMinutes || 480}
                    onChange={(e) => setPolicyForm({ ...policyForm, fullDayMinutes: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
              </div>

              <Button onClick={handleSavePolicy} className="w-full text-xs mt-2">
                Save Policy Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 5: LEAVE & PTO MANAGEMENT
          ========================================================================= */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-xl shadow-xs">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Leave &amp; Paid Time Off (PTO)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Apply for leave, check personal balances, and review team approval requests
              </p>
            </div>
            <Button size="sm" onClick={() => setShowApplyLeaveModal(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Apply for Leave
            </Button>
          </div>

          {/* Leave Balances Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['CASUAL', 'SICK', 'ANNUAL', 'UNPAID'].map((typeKey) => {
              const bal = leaveBalances.find((b) => b.leaveType === typeKey);
              const allocated = bal?.allocated ?? (typeKey === 'CASUAL' ? 7 : typeKey === 'SICK' ? 10 : typeKey === 'ANNUAL' ? 15 : 30);
              const used = bal?.used ?? 0;
              const pending = bal?.pending ?? 0;
              const available = Math.max(0, allocated - used - pending);

              const titles: Record<string, string> = {
                CASUAL: 'Casual Leave',
                SICK: 'Sick Leave',
                ANNUAL: 'Annual Paid Leave',
                UNPAID: 'Unpaid Leave (LOP)',
              };

              return (
                <Card key={typeKey} className="border-border bg-card shadow-xs">
                  <CardContent className="p-4 space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {titles[typeKey]}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {typeKey === 'UNPAID' ? used : available}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {typeKey === 'UNPAID' ? 'days used' : `/ ${allocated} total`}
                      </span>
                    </div>
                    {pending > 0 && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        {pending} day(s) pending approval
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Team Approvals Inbox (Visible for Managers, Admins & Owner) */}
          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER') && (
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Team Leave Approvals {currentUserRole === 'MANAGER' ? '(Team Lead — View Only)' : currentUserRole === 'ADMIN' ? '(Admin Approvals)' : '(Owner Approvals)'}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {currentUserRole === 'MANAGER'
                        ? 'View pending and approved leave applications submitted by your team (Approvals handled by HR / Owner)'
                        : 'Review, approve, or reject leave applications submitted by team members'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {leaveRequests.filter((r) => r.status === 'PENDING').length} Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                        <th className="py-3 px-4 font-semibold">Employee</th>
                        <th className="py-3 px-4 font-semibold">Leave Type</th>
                        <th className="py-3 px-4 font-semibold">Dates &amp; Duration</th>
                        <th className="py-3 px-4 font-semibold">Reason</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leaveRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            No leave requests found for this organization.
                          </td>
                        </tr>
                      ) : (
                        leaveRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">
                                {req.membership?.user?.firstName} {req.membership?.user?.lastName}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {req.membership?.department?.name || 'Engineering'} • {req.membership?.designation?.title || 'Member'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {req.leaveType}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">
                                {new Date(req.startDate).toLocaleDateString()} &rarr; {new Date(req.endDate).toLocaleDateString()}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-semibold">
                                {req.totalDays} day{req.totalDays > 1 ? 's' : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                              {req.reason || 'No justification provided'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  req.status === 'APPROVED'
                                    ? 'default'
                                    : req.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="text-[10px]"
                              >
                                {req.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {req.status === 'PENDING' ? (
                                (() => {
                                  // 1. Strict self-approval restriction
                                  const isSelf = req.membershipId === currentMembershipId;
                                  if (isSelf) {
                                    return (
                                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                                        Your Application (Awaiting Review)
                                      </Badge>
                                    );
                                  }

                                  // 2. Team Lead / Manager: "team lead cant acces the leave approve, they will see only"
                                  const isTeamLeadOrManager =
                                    currentUserRole === 'MANAGER' ||
                                    (currentUserDesignation && /lead/i.test(currentUserDesignation) && currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN');
                                  if (isTeamLeadOrManager) {
                                    return (
                                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                                        View Only (Team Lead)
                                      </Badge>
                                    );
                                  }

                                  // 3. HR Leave: "if hr wants to apply leave the owner will be approve or disapprove"
                                  const isApplicantHR =
                                    req.membership?.accessRole === 'ADMIN' ||
                                    req.membership?.designation?.title?.toLowerCase().includes('hr') ||
                                    req.membership?.user?.email?.toLowerCase().includes('hr');

                                  if (isApplicantHR && currentUserRole !== 'OWNER') {
                                    return (
                                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                                        Owner Approval Required
                                      </Badge>
                                    );
                                  }

                                  // Authorized Approver: Owner (for anyone) or HR Executive (for non-HR members)
                                  return (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateLeaveStatus(req.id, 'APPROVED')}
                                        className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                      >
                                        <Check className="h-3 w-3" /> Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleUpdateLeaveStatus(req.id, 'REJECTED')}
                                        className="h-7 text-xs px-2.5 gap-1"
                                      >
                                        <XCircle className="h-3 w-3" /> Reject
                                      </Button>
                                    </>
                                  );
                                })()
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  {req.approvedBy?.user?.firstName ? `Processed by ${req.approvedBy.user.firstName}` : 'Reviewed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* My Personal Leave Applications History */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                My Leave History
              </CardTitle>
              <CardDescription className="text-xs">
                Review all personal leave applications and their current approval status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Leave Type</th>
                      <th className="py-3 px-4 font-semibold">Start &amp; End Dates</th>
                      <th className="py-3 px-4 font-semibold">Total Days</th>
                      <th className="py-3 px-4 font-semibold">Reason</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaveRequests.filter((r) => r.membershipId === currentMembershipId).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          You haven't submitted any leave applications yet.
                        </td>
                      </tr>
                    ) : (
                      leaveRequests
                        .filter((r) => r.membershipId === currentMembershipId)
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-semibold">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {req.leaveType}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {new Date(req.startDate).toLocaleDateString()} &rarr; {new Date(req.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {req.totalDays} day{req.totalDays > 1 ? 's' : ''}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                              {req.reason || 'Personal leave'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  req.status === 'APPROVED'
                                    ? 'default'
                                    : req.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="text-[10px]"
                              >
                                {req.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL: APPLY FOR LEAVE
          ========================================================================= */}
      {showApplyLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Apply for Leave
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApplyLeaveModal(false)}
                className="h-7 w-7 p-0 text-muted-foreground"
              >
                &times;
              </Button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Leave Type *</label>
                <select
                  value={applyLeaveType}
                  onChange={(e) => setApplyLeaveType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="CASUAL">Casual Leave (Short Notice)</option>
                  <option value="SICK">Sick Leave (Medical/Health)</option>
                  <option value="ANNUAL">Annual Paid Leave (Planned Vacation)</option>
                  <option value="UNPAID">Unpaid Leave (Loss of Pay)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">End Date *</label>
                  <input
                    type="date"
                    required
                    value={applyEndDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Reason / Handover Note</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Attending family function, medical appointment, semester exam..."
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApplyLeaveModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submittingLeave}>
                  {submittingLeave ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CLOCK-OUT SUMMARY & POLICY EXCEPTION CHECKS
          ========================================================================= */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <Square className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Clock-Out Shift Summary</h3>
                  <p className="text-xs text-muted-foreground">Reconciliation &amp; policy exception checks</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClockOutModal(false)}
                className="h-8 w-8 p-0 text-muted-foreground"
              >
                &times;
              </Button>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border">
                <div className="text-[11px] font-medium text-muted-foreground uppercase">Shift Span (Gross)</div>
                <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                  {liveMetrics.shiftSpanDisplay}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatReadableMinutes(liveMetrics.grossShiftSeconds)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border">
                <div className="text-[11px] font-medium text-muted-foreground uppercase">Total Break Time</div>
                <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                  {liveMetrics.totalBreaksDisplay}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {liveMetrics.breaksList.length} break{liveMetrics.breaksList.length === 1 ? '' : 's'} logged
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border col-span-2 sm:col-span-1">
                <div className="text-[11px] font-medium text-muted-foreground uppercase">Net Worked Time</div>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {liveMetrics.hoursWorkedDisplay}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatReadableMinutes(liveMetrics.netWorkSeconds)}
                </div>
              </div>
            </div>

            {/* Policy & Exception Checks */}
            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-2">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Shift Policy &amp; Exception Checks</span>
              </div>

              <div className="space-y-1.5 text-xs">
                {liveMetrics.statusCheck === 'FULL_DAY_MET' ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Full-Day Target Achieved (&ge; {(policy?.fullDayMinutes || 480) / 60} hours net)</span>
                  </div>
                ) : liveMetrics.statusCheck === 'HALF_DAY_MET' ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Half-Day Target Achieved (&ge; {(policy?.halfDayMinutes || 240) / 60} hours net)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Under standard threshold (&lt; {(policy?.halfDayMinutes || 240) / 60} hours net). Early departure may be recorded.</span>
                  </div>
                )}

                {liveMetrics.overtimeMinutes > 0 ? (
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Timer className="h-3.5 w-3.5 shrink-0" />
                    <span>Overtime accrued: <strong>+{liveMetrics.overtimeMinutes} mins</strong> beyond {(policy?.overtimeThresholdMinutes || 480) / 60}h standard</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                    <Timer className="h-3.5 w-3.5 shrink-0" />
                    <span>No overtime threshold exceeded</span>
                  </div>
                )}

                {liveMetrics.isOvernight && (
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Moon className="h-3.5 w-3.5 shrink-0" />
                    <span>Overnight Shift: Span successfully crossed midnight</span>
                  </div>
                )}

                {isOnBreak && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                    <Coffee className="h-3.5 w-3.5 shrink-0" />
                    <span>An active break is currently in progress. Clocking out will automatically finalize this break at the current timestamp without data loss.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Checkout Handover Notes */}
            <div>
              <label className="text-xs font-semibold text-foreground">Checkout Remarks / Handover Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Completed client presentation, handed over daily tickets to night team..."
                value={clockOutNotes}
                onChange={(e) => setClockOutNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClockOutModal(false)}
                disabled={actionLoading}
              >
                Keep Working
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={executeClockOut}
                disabled={actionLoading}
                className="gap-1.5 font-semibold"
              >
                {actionLoading ? 'Clocking Out...' : 'Confirm & Complete Clock Out'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ACCIDENTAL BREAK START/END CORRECTION REQUEST
          ========================================================================= */}
      {showBreakCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-foreground">Request Break Correction</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBreakCorrectionModal(false)}
                className="h-7 w-7 p-0 text-muted-foreground"
              >
                &times;
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Rectify accidental break clicks, missed end-break taps, or timestamp discrepancies for manager approval.
            </p>

            {breakCorrectionTarget && (
              <div className="p-3 rounded-lg bg-surface-secondary/40 border border-border text-xs space-y-1">
                <div className="font-semibold text-foreground">
                  Break #{breakCorrectionTarget.index} &bull; {(breakCorrectionTarget.breakType || 'General Break').replace(/_/g, ' ')}
                </div>
                <div className="text-muted-foreground">
                  Original: {formatTimeOnly(breakCorrectionTarget.breakStart)} &rarr; {breakCorrectionTarget.breakEnd ? formatTimeOnly(breakCorrectionTarget.breakEnd) : 'In Progress'}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Requested Break Start *</label>
                <input
                  type="datetime-local"
                  required
                  value={requestedBreakStart}
                  onChange={(e) => setRequestedBreakStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Requested Break End *</label>
                <input
                  type="datetime-local"
                  required
                  value={requestedBreakEnd}
                  onChange={(e) => setRequestedBreakEnd(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Justification Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Accidentally hit Start break 10 minutes early, or forgot to end break when returning from lunch..."
                  value={breakCorrectionReason}
                  onChange={(e) => setBreakCorrectionReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBreakCorrectionModal(false)}
                disabled={submittingBreakCorrection}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitBreakCorrection}
                disabled={submittingBreakCorrection}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {submittingBreakCorrection ? 'Submitting...' : 'Submit Break Correction'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SUBMIT CORRECTION
          ========================================================================= */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Submit Attendance Correction</h3>
            <p className="text-xs text-muted-foreground">
              Provide the exact correct clock-in and clock-out timestamps for manager verification
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Requested Clock In</label>
                <input
                  type="datetime-local"
                  value={requestedClockIn}
                  onChange={(e) => setRequestedClockIn(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Requested Clock Out</label>
                <input
                  type="datetime-local"
                  value={requestedClockOut}
                  onChange={(e) => setRequestedClockOut(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Justification Reason</label>
                <textarea
                  rows={3}
                  placeholder="e.g. System network interruption during clock-out, forgot to end break..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCorrectionModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitCorrection}>
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW SHIFT
          ========================================================================= */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Configure New Shift</h3>
            <p className="text-xs text-muted-foreground">
              Add a regular or overnight work schedule for your organization
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Shift Name</label>
                <input
                  type="text"
                  placeholder="e.g. Night Ops Shift, Morning Dispatch"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Start Time</label>
                  <input
                    type="time"
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">End Time</label>
                  <input
                    type="time"
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
              </div>
              {newShiftEnd < newShiftStart && (
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 p-2 rounded bg-indigo-50 dark:bg-indigo-950/30">
                  <Moon className="h-3.5 w-3.5" /> This shift crosses midnight and will be treated as an Overnight Shift.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowShiftModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateShift}>
                Save Shift
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
