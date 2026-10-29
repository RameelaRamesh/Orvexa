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
  const [currentMembershipId, setCurrentMembershipId] = useState<string>('');
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [applyLeaveType, setApplyLeaveType] = useState('CASUAL');
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Filters & State
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAttendanceDisabled, setIsAttendanceDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Interactive Inputs
  const [sessionNotes, setSessionNotes] = useState('');
  const [selectedBreakType, setSelectedBreakType] = useState('SHORT_BREAK');

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

      const tData = rawToday.data !== undefined ? rawToday.data : rawToday;
      setTodayData(tData);

      const lData = rawList.data !== undefined ? rawList.data : rawList;
      setAttendanceList(Array.isArray(lData) ? lData : []);

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
      if (wsData?.settings?.enabledModules && Array.isArray(wsData.settings.enabledModules)) {
        const enabled = wsData.settings.enabledModules.includes('attendance') || wsData.settings.enabledModules.includes('time');
        setIsAttendanceDisabled(!enabled);
      } else {
        setIsAttendanceDisabled(false);
      }

      const lvData = rawLeave.data !== undefined ? rawLeave.data : rawLeave;
      setLeaveRequests(Array.isArray(lvData) ? lvData : []);

      const bData = rawBalance.data !== undefined ? rawBalance.data : rawBalance;
      setLeaveBalances(Array.isArray(bData) ? bData : []);

      const meData = rawMe.data !== undefined ? rawMe.data : rawMe;
      if (meData?.memberships) {
        const mem = meData.memberships.find((m: any) => m.workspaceId === wsId);
        if (mem) {
          setCurrentUserRole(mem.accessRole || 'MEMBER');
          setCurrentMembershipId(mem.id);
        }
      }
    } catch (err: any) {
      console.error('Error loading attendance engine data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [filterDate]);

  // Clock Actions
  const handleClockIn = async () => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
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
    } catch (err: any) {
      toast.error(err.message || 'Error clocking in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ notes: sessionNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock out');
      toast.success(`Clocked out! Work Session completed: ${data.totalWorkMinutes || 0} mins worked.`);
      setSessionNotes('');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error clocking out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/break/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ breakType: selectedBreakType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start break');
      toast.success(`Break started: ${selectedBreakType}`);
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error starting break');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (isAttendanceDisabled) {
      toast.error('Attendance & Shifts module is disabled in Workspace Settings.');
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
      toast.success('Break ended - Welcome back to shift!');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error ending break');
    } finally {
      setActionLoading(false);
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
      const res = await fetch(`${BRANDING.apiUrl}/time/export`, {
        headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId! },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Export failed');

      if (!Array.isArray(data) || data.length === 0) {
        toast.info('No attendance records available to export.');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((h) => {
              const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
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

  const isClockedIn = !!todayData?.todaySummary?.isClockedIn;
  const isOnBreak = !!todayData?.todaySummary?.isOnBreak;
  const activeBreak = todayData?.todaySummary?.activeBreak;
  const allTodaySessions = todayData?.allSessions || [];
  const sessionsCount = todayData?.todaySummary?.sessionsCount || 0;
  const canClockInAgain = !!todayData?.todaySummary?.canClockInAgain;

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
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Attendance &amp; Shifts Module is Disabled</h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              Attendance tracking is disabled for this organization. An administrator can enable <strong>Attendance &amp; Shifts</strong> in Workspace Settings &rarr; Modules &amp; Features.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-border gap-1 text-sm font-medium">
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
          {/* Real-time Status Card */}
          <Card className={`border-border bg-card shadow-sm ${isAttendanceDisabled ? 'opacity-70' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">My Today Shift Tracker</CardTitle>
                <CardDescription>
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
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-xl bg-surface-secondary/40 border border-border">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-colors ${
                      isAttendanceDisabled
                        ? 'bg-muted text-muted-foreground'
                        : isOnBreak
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : isClockedIn
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : sessionsCount > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isOnBreak ? (
                      <Coffee className="h-8 w-8 animate-pulse" />
                    ) : isClockedIn ? (
                      <Clock className="h-8 w-8" />
                    ) : (
                      <Sunrise className="h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Current Shift State
                    </div>
                    <div className="text-xl font-bold text-foreground mt-0.5">
                      {isAttendanceDisabled ? (
                        'Attendance Disabled'
                      ) : isOnBreak ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          On Break ({activeBreak?.breakType || 'Break'})
                        </span>
                      ) : isClockedIn ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Active On Shift (Session #{sessionsCount})
                        </span>
                      ) : sessionsCount > 0 ? (
                        <span>
                          Shift Completed ({sessionsCount} session{sessionsCount > 1 ? 's' : ''} logged)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not Clocked In Today</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isClockedIn ? (
                        <span>
                          Clocked In at {new Date(todayData.clockIn).toLocaleTimeString()} • Today&apos;s Total Work: {todayData.todaySummary?.totalWorkHours || '0'} hrs
                        </span>
                      ) : sessionsCount > 0 ? (
                        <span>
                          Total Today: {todayData.todaySummary?.totalWorkHours || '0'} hrs worked across {sessionsCount} session(s)
                        </span>
                      ) : (
                        <span>Ready to start work. Multiple sessions per day permitted.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {isAttendanceDisabled ? (
                    <Button disabled size="lg" className="opacity-50">
                      Module Disabled
                    </Button>
                  ) : isClockedIn ? (
                    isOnBreak ? (
                      <>
                        <Button
                          size="lg"
                          onClick={handleEndBreak}
                          disabled={actionLoading}
                          className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm"
                        >
                          <Play className="h-4 w-4" /> End Break &amp; Resume
                        </Button>
                        <Button
                          size="lg"
                          variant="destructive"
                          onClick={handleClockOut}
                          disabled={actionLoading}
                          className="gap-2 shadow-sm"
                        >
                          <Square className="h-4 w-4" /> End Shift (Clock Out)
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={selectedBreakType}
                            onChange={(e) => setSelectedBreakType(e.target.value)}
                            className="h-10 text-xs px-2.5 rounded-lg border border-border bg-background text-foreground"
                          >
                            <option value="SHORT_BREAK">Short Break</option>
                            <option value="LUNCH">Lunch Break</option>
                            <option value="TEA_COFFEE">Tea/Coffee Break</option>
                            <option value="PERSONAL">Personal Break</option>
                          </select>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={handleStartBreak}
                            disabled={actionLoading}
                            className="gap-2 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          >
                            <Coffee className="h-4 w-4" /> Take Break
                          </Button>
                        </div>
                        <Button
                          size="lg"
                          variant="destructive"
                          onClick={handleClockOut}
                          disabled={actionLoading}
                          className="gap-2 shadow-sm"
                        >
                          <Square className="h-4 w-4" /> End Shift (Clock Out)
                        </Button>
                      </>
                    )
                  ) : canClockInAgain ? (
                    <Button size="lg" onClick={handleClockIn} disabled={actionLoading} className="gap-2 shadow-sm">
                      <Play className="h-4 w-4" /> {sessionsCount > 0 ? `Clock In Session #${sessionsCount + 1}` : 'Start Shift (Clock In)'}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="py-2.5 px-4 text-xs font-semibold">
                      Daily Session Limit Reached
                    </Badge>
                  )}
                </div>
              </div>

              {/* Optional Notes Input */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Optional note for current action (e.g. Remote work, field visit, project assignment)..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Today's Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase">Work Hours Today</div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {todayData?.todaySummary?.totalWorkHours || '0'} hrs
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase">Breaks Taken</div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {todayData?.todaySummary?.totalBreakMinutes || 0} mins
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase">Sessions Count</div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {sessionsCount} / {todayData?.todaySummary?.policy?.maxDailySessions || 5}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase">Overtime</div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {todayData?.todaySummary?.overtimeMinutes || 0} mins
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Multi-Session Timeline */}
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
                              <Badge variant="secondary" className="text-[10px]">COMPLETED</Badge>
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
        </div>
      )}

      {/* =========================================================================
          TAB 2: WORKSPACE ATTENDANCE LOGS
          ========================================================================= */}
      {activeTab === 'team_logs' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          {summaryMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Total Work Hours</div>
                <div className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.totalWorkHours} hrs</div>
                <div className="text-xs text-muted-foreground mt-0.5">{summaryMetrics.totalRecords} sessions logged</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Active Staff</div>
                <div className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.uniqueEmployees}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Employees recorded</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Attendance Rate</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {summaryMetrics.attendanceComplianceRate}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{summaryMetrics.presentCount} present</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Late Arrivals</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {summaryMetrics.lateCount}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{summaryMetrics.missedCheckoutCount} missed checkouts</div>
              </Card>
            </div>
          )}

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
                {filterDate && (
                  <Button variant="ghost" size="sm" onClick={() => setFilterDate('')} className="text-xs">
                    Clear Date
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
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">Department / Team</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Clock In</th>
                      <th className="py-3.5 px-4">Clock Out</th>
                      <th className="py-3.5 px-4">Net Hours</th>
                      <th className="py-3.5 px-4">Breaks</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((a) => {
                      const hasOpenBreak = a.breaks?.some((b: any) => !b.breakEnd);
                      return (
                        <tr key={a.id} className="hover:bg-surface-secondary/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">
                              {a.membership?.user?.firstName} {a.membership?.user?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">{a.membership?.user?.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-foreground text-xs">{a.membership?.department?.name || 'General'}</div>
                            <div className="text-[11px] text-muted-foreground">{a.membership?.team?.name || 'Team'}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                            {new Date(a.date).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            {new Date(a.clockIn).toLocaleTimeString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            {a.clockOut ? (
                              new Date(a.clockOut).toLocaleTimeString()
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground text-xs">
                            {a.netHours || (a.totalWorkMinutes / 60).toFixed(1)} hrs ({a.totalWorkMinutes}m)
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground">
                            {a.totalBreakMinutes || 0}m ({a.breaks?.length || 0})
                          </td>
                          <td className="py-3.5 px-4">
                            {a.status === 'LATE' ? (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300">
                                LATE
                              </Badge>
                            ) : a.status === 'HALF_DAY' ? (
                              <Badge variant="outline" className="border-purple-300 text-purple-700">
                                HALF DAY
                              </Badge>
                            ) : hasOpenBreak ? (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300">
                                ON BREAK
                              </Badge>
                            ) : a.clockOut ? (
                              <Badge variant="secondary">COMPLETED</Badge>
                            ) : (
                              <Badge variant="success">ON SHIFT</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
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
                  {correctionsList.map((c) => (
                    <div key={c.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{c.employeeName}</span>
                          {c.status === 'PENDING' ? (
                            <Badge variant="outline" className="border-amber-400 text-amber-700">PENDING APPROVAL</Badge>
                          ) : c.status === 'APPROVED' ? (
                            <Badge variant="success">APPROVED</Badge>
                          ) : (
                            <Badge variant="destructive">REJECTED</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span>Original: {new Date(c.originalClockIn).toLocaleTimeString()} &rarr; {c.originalClockOut ? new Date(c.originalClockOut).toLocaleTimeString() : 'Missing'}</span>
                          <span className="mx-2 font-bold text-foreground">&bull;</span>
                          <span className="text-foreground font-semibold">
                            Requested: {new Date(c.requestedClockIn).toLocaleTimeString()} &rarr; {new Date(c.requestedClockOut).toLocaleTimeString()}
                          </span>
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
                  ))}
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
                      Team Leave Approvals (Manager / HR Inbox)
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Review, approve, or reject leave applications submitted by team members
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
