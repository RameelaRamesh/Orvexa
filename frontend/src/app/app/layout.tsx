'use client';

import '@/lib/session-isolation';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { checkPermission } from '@/lib/permissions';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  CheckSquare,
  Layers,
  Users,
  Clock,
  Award,
  ShieldAlert,
  Settings,
  LogOut,
  Building,
  CreditCard,
  Briefcase,
  ChevronDown,
  Bell,
  MessageSquare,
  Inbox,
  Package,
  Calendar,
  BarChart3,
  Menu,
  X,
  Pause,
  Play,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { TeamNotificationListener } from '@/components/team-notification-listener';
import { CommonSearchBar } from '@/components/common-search-bar';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ProfileSetupModal } from '@/components/profile-setup-modal';

const cleanWorkspaceMemberships = (raw: any[]) => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((m: any) => {
    const wsName = (m.workspace?.name || '').trim().toLowerCase();
    const wsSlug = (m.workspace?.slug || '').trim().toLowerCase();
    return !wsName.includes('kb construction') && !wsSlug.includes('kb-construction');
  });
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('orvexa_cached_profile');
      let p = cached ? JSON.parse(cached) : null;
      if (!p) {
        const userCached = localStorage.getItem('user');
        p = userCached ? JSON.parse(userCached) : null;
      }
      if (p && p.memberships) {
        p.memberships = cleanWorkspaceMemberships(p.memberships);
      }
      return p;
    } catch {
      return null;
    }
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('orvexa_user_avatar');
      if (stored) return stored;
      const cached = localStorage.getItem('orvexa_cached_profile');
      if (cached) {
        const p = JSON.parse(cached);
        return p.avatarUrl || p.avatar || null;
      }
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.avatar || null;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [activeWorkspace, setActiveWorkspace] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('orvexa_cached_workspace');
      const ws = cached ? JSON.parse(cached) : null;
      if (ws) {
        const name = (ws.workspace?.name || '').trim().toLowerCase();
        const slug = (ws.workspace?.slug || '').trim().toLowerCase();
        if (name.includes('kb construction') || slug.includes('kb-construction')) {
          return null;
        }
      }
      return ws;
    } catch {
      return null;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
    let token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const cachedProf = localStorage.getItem('orvexa_cached_profile');
      if (cachedProf) {
        setProfile(JSON.parse(cachedProf));
        setLoading(false);
      }
      const cachedWs = localStorage.getItem('orvexa_cached_workspace');
      if (cachedWs) {
        setActiveWorkspace(JSON.parse(cachedWs));
      }
    } catch {}

    let isMounted = true;

    const handleAvatarUpdate = (e: any) => {
      const newAvatar = e.detail || (typeof window !== 'undefined' ? localStorage.getItem('orvexa_user_avatar') : null);
      if (newAvatar) {
        setAvatarUrl(newAvatar);
      }
    };

    window.addEventListener('orvexa_avatar_updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);

    const fetchProfile = async (retryCount = 0) => {
      try {
        const res = await fetch(`${BRANDING.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // If explicitly unauthorized, attempt silent token renewal before logging out
        if (res.status === 401) {
          try {
            const refreshRes = await fetch(`${BRANDING.apiUrl}/auth/refresh`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newToken = refreshData.data?.accessToken || refreshData.accessToken;
              if (newToken) {
                token = newToken;
                localStorage.setItem('accessToken', newToken);
                return fetchProfile(retryCount);
              }
            }
          } catch {}

          // Refresh failed and session is genuinely invalid
          toast.error('Session expired. Please log in again.');
          try {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('activeWorkspaceId');
            sessionStorage.removeItem('orvexa_cached_profile');
            sessionStorage.removeItem('orvexa_cached_workspace');
          } catch {}
          localStorage.removeItem('accessToken');
          localStorage.removeItem('activeWorkspaceId');
          localStorage.removeItem('orvexa_cached_profile');
          localStorage.removeItem('orvexa_cached_workspace');
          router.push('/login');
          return;
        }

        // If backend returned 502/503/504 (cold start / waking up from idle) or transient server errors:
        if (!res.ok && res.status >= 500 && retryCount < 3) {
          console.warn(`[Orvexa Auth] Backend server warming up (${res.status}). Retrying in ${(retryCount + 1) * 1500}ms...`);
          setTimeout(() => {
            if (isMounted) fetchProfile(retryCount + 1);
          }, (retryCount + 1) * 1500);
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Authentication error');

        if (!isMounted) return;

        const profileData = data.data !== undefined ? data.data : data;
        const validMemberships = cleanWorkspaceMemberships(profileData.memberships);
        profileData.memberships = validMemberships;
        setProfile(profileData);
        try {
          localStorage.setItem('orvexa_cached_profile', JSON.stringify(profileData));
        } catch {}

        // Ensure avatar is strictly kept and synced
        const storedAvatar = typeof window !== 'undefined' ? localStorage.getItem('orvexa_user_avatar') : null;
        if (profileData.avatarUrl) {
          setAvatarUrl(profileData.avatarUrl);
          try {
            localStorage.setItem('orvexa_user_avatar', profileData.avatarUrl);
          } catch {}
        } else if (storedAvatar) {
          setAvatarUrl(storedAvatar);
          // If backend didn't have it yet, quietly sync it
          fetch(`${BRANDING.apiUrl}/auth/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ avatarUrl: storedAvatar }),
          }).catch(() => {});
        }

        const memberships = validMemberships;
        const savedWsId = localStorage.getItem('activeWorkspaceId');

        let activeMem = memberships.find((m: any) => m.workspaceId === savedWsId);
        if (!activeMem && memberships.length > 0) {
          activeMem = memberships[0];
          localStorage.setItem('activeWorkspaceId', activeMem.workspaceId);
        }

        setActiveWorkspace(activeMem);
        try {
          if (activeMem) {
            localStorage.setItem('orvexa_cached_workspace', JSON.stringify(activeMem));
          }
        } catch {}
      } catch (err: any) {
        console.error('[Orvexa Auth] Profile fetch error:', err);

        // Transient network error (e.g. waking up backend, network reconnecting):
        if (retryCount < 3) {
          console.warn(`[Orvexa Auth] Network error / server warming up. Retrying in ${(retryCount + 1) * 1500}ms...`);
          setTimeout(() => {
            if (isMounted) fetchProfile(retryCount + 1);
          }, (retryCount + 1) * 1500);
          return;
        }

        // If retries failed due to backend sleeping or connection hiccup, DO NOT logout!
        const cached = localStorage.getItem('orvexa_cached_profile');
        if (!cached) {
          toast.error('Unable to reach server. Please check your connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    // Keep-alive heartbeat: ping backend every 4 minutes while tab is open
    // Keeps cloud instances warm and prevents idle container sleep
    const heartbeatInterval = setInterval(() => {
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken) {
        fetch(`${BRANDING.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        }).catch(() => {});
      }
    }, 4 * 60 * 1000);

    // Revalidate when user returns to tab after idle
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentToken = localStorage.getItem('accessToken');
        if (currentToken) {
          fetchProfile(0);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('orvexa_avatar_updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, [router]);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const reloadAttendance = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!token || !wsId) return;

    try {
      const attRes = await fetch(`${BRANDING.apiUrl}/time/today`, {
        headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId },
      });
      const attData = await attRes.json();
      if (attData.success) {
        setTodayAttendance(attData.data);
      }
    } catch {}
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const tickInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    reloadAttendance();

    const handleProfileUpdateEvent = (e: any) => {
      if (e.detail) setProfile(e.detail);
    };
    const handleAttendanceUpdateEvent = () => {
      reloadAttendance();
    };

    window.addEventListener('profile-updated', handleProfileUpdateEvent);
    window.addEventListener('attendance-updated', handleAttendanceUpdateEvent);

    return () => {
      clearInterval(tickInterval);
      window.removeEventListener('profile-updated', handleProfileUpdateEvent);
      window.removeEventListener('attendance-updated', handleAttendanceUpdateEvent);
    };
  }, []);

  const isClockedIn = !!(todayAttendance?.todaySummary?.isClockedIn ?? (todayAttendance?.clockIn && !todayAttendance?.clockOut));
  const isOnBreak = !!todayAttendance?.todaySummary?.isOnBreak;

  const formatClockInTime = (dateStr?: string | null) => {
    if (!dateStr) return '09:24 AM';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '09:24 AM' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatElapsed = (startDateStr: string | null | undefined) => {
    if (!startDateStr || !currentTime) return '2h 18m';
    const start = new Date(startDateStr).getTime();
    if (isNaN(start)) return '2h 18m';
    const elapsedSeconds = Math.max(0, Math.floor((currentTime.getTime() - start) / 1000));
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleStartBreak = async () => {
    const token = localStorage.getItem('accessToken');
    const wsId = localStorage.getItem('activeWorkspaceId');
    if (!token || !wsId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/break/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
        body: JSON.stringify({ breakType: 'TEA_COFFEE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start break');
      toast.success('Break started');
      await reloadAttendance();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to start break');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    const token = localStorage.getItem('accessToken');
    const wsId = localStorage.getItem('activeWorkspaceId');
    if (!token || !wsId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/break/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to end break');
      toast.success('Break ended');
      await reloadAttendance();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to end break');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockIn = async () => {
    const token = localStorage.getItem('accessToken');
    const wsId = localStorage.getItem('activeWorkspaceId');
    if (!token || !wsId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock in');
      toast.success('Clocked in successfully');
      await reloadAttendance();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    const token = localStorage.getItem('accessToken');
    const wsId = localStorage.getItem('activeWorkspaceId');
    if (!token || !wsId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/time/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to clock out');
      toast.success('Clocked out successfully');
      await reloadAttendance();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('activeWorkspaceId');
      sessionStorage.removeItem('orvexa_cached_profile');
      sessionStorage.removeItem('orvexa_cached_workspace');
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('activeWorkspaceId');
    localStorage.removeItem('orvexa_cached_profile');
    localStorage.removeItem('orvexa_cached_workspace');
    toast.info('Logged out successfully');
    router.push('/login');
  };

  const handleSwitchWorkspace = (newWsId: string) => {
    const newMem = profile?.memberships?.find((m: any) => m.workspaceId === newWsId);
    if (newMem) {
      localStorage.setItem('activeWorkspaceId', newWsId);
      setActiveWorkspace(newMem);
      try {
        localStorage.setItem('orvexa_cached_workspace', JSON.stringify(newMem));
      } catch {}
      toast.success(`Switched to workspace: ${newMem.workspace?.name}`);
      window.location.reload();
    }
  };

  const accessRole = activeWorkspace?.accessRole || 'MEMBER';
  const getPortalRoleLabel = (r: string) => {
    if (r === 'ADMIN') return 'HR EXECUTIVE';
    if (r === 'OWNER') return 'OWNER';
    if (r === 'MANAGER') return 'MANAGER';
    if (r === 'MEMBER') return 'MEMBER';
    return r;
  };
  const isPlatformAdmin = accessRole === 'OWNER';

  const [calendarBadgeCount, setCalendarBadgeCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 3;
    try {
      const b = localStorage.getItem('orvexa_calendar_badge_count');
      return b !== null ? parseInt(b, 10) : 3;
    } catch {
      return 3;
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const b = localStorage.getItem('orvexa_calendar_badge_count');
        if (b !== null) setCalendarBadgeCount(parseInt(b, 10));
      } catch {}
    };
    window.addEventListener('calendar_badge_updated', handleUpdate);
    return () => window.removeEventListener('calendar_badge_updated', handleUpdate);
  }, []);

  const hasPerm = (perm: string) => checkPermission(activeWorkspace, perm);

  const enabledModules: string[] = activeWorkspace?.workspace?.settings?.enabledModules || [
    'people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'quality', 'sla', 'settings'
  ];

  const allNavItems = [
    { name: 'Home / My Work', href: '/app/home', icon: Home, visible: true },
    {
      name: 'Operations Calendar',
      href: '/app/calendar',
      icon: Calendar,
      badge: calendarBadgeCount,
      visible: true,
    },
    {
      name: 'Analytics & Reports',
      href: '/app/analytics',
      icon: BarChart3,
      visible: true,
    },
    {
      name: 'Projects & Tasks',
      href: '/app/projects',
      icon: CheckSquare,
      visible: true,
    },
    {
      name: 'People Directory',
      href: '/app/people',
      icon: Users,
      visible: hasPerm('people:view') && enabledModules.includes('people'),
    },
    {
      name: 'Time & Attendance',
      href: '/app/time',
      icon: Clock,
      visible: (hasPerm('time:view') || hasPerm('attendance:view') || hasPerm('attendance:clock')) && (enabledModules.includes('time') || enabledModules.includes('attendance')),
    },
    {
      name: 'Team Communication',
      href: '/app/communication',
      icon: MessageSquare,
      visible: true,
    },
    {
      name: 'Internal Requests & Tickets',
      href: '/app/requests',
      icon: Inbox,
      visible: true,
    },
    {
      name: 'Assets, Inventory & Docs',
      href: '/app/assets',
      icon: Package,
      visible:
        hasPerm('assets:view') ||
        hasPerm('inventory:view') ||
        hasPerm('ledger:view') ||
        hasPerm('documents:view'),
    },
    {
      name: 'Payroll & Compensation',
      href: '/app/payroll',
      icon: CreditCard,
      visible: isPlatformAdmin || hasPerm('payroll:view'),
    },
    {
      name: 'Workspace Settings',
      href: '/app/settings',
      icon: Settings,
      visible: isPlatformAdmin || hasPerm('settings:manage') || hasPerm('roles:manage') || hasPerm('org:manage'),
    },
  ];

  const navItems = allNavItems.filter((i) => i.visible);

  if (!mounted || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-sm font-medium text-muted-foreground">Loading {BRANDING.name} Workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Responsive) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Switcher Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              {activeWorkspace?.workspace?.name?.charAt(0) || 'O'}
            </div>
            <div className="flex flex-col truncate">
              <span className="truncate text-sm font-semibold text-foreground">
                {activeWorkspace?.workspace?.name || 'Workspace'}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                {getPortalRoleLabel(accessRole)} • {activeWorkspace?.designation?.title || 'Member'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-7 w-7 text-muted-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-surface-secondary hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                <span className="flex-1 truncate">{item.name}</span>
                {(item as any).badge !== undefined && (item as any).badge > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-blue-600 text-white shadow-2xs">
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Profile Section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between">
<Link
              href="/app/settings?tab=personal"
              className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-85 transition-opacity flex-1 min-w-0 group"
              title="View & Edit Personal Details"
            >
              <UserAvatar
                avatarUrl={avatarUrl || profile?.avatarUrl || profile?.avatar}
                firstName={profile?.firstName}
                lastName={profile?.lastName}
                seed={profile?.id || profile?.email}
                size="sm"
              />
              <div className="flex flex-col truncate">
                <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {profile?.firstName ? `${profile.firstName} ${profile?.lastName || ''}`.trim() : 'User'}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">{profile?.email || ''}</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Log Out"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 md:px-6 backdrop-blur-md gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 text-muted-foreground shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

{/* Common Search Bar */}
            <CommonSearchBar className="w-full" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Clock In / Status Pill */}
            {isClockedIn && (
              <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {isOnBreak ? 'On Break' : 'Clocked In'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {formatClockInTime(todayAttendance?.clockIn)} • {formatElapsed(todayAttendance?.clockIn)}
                  </span>
                </div>
              </div>
            )}

            {/* Break Action */}
            {isOnBreak ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEndBreak}
                disabled={actionLoading}
                className="h-9 px-3 text-xs gap-1.5 rounded-xl border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-medium shadow-xs"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">End Break</span>
              </Button>
            ) : isClockedIn ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartBreak}
                disabled={actionLoading}
                className="h-9 px-3 text-xs gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium shadow-xs"
              >
                <Pause className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Start Break</span>
              </Button>
            ) : null}

            {/* Clock Out / Clock In Button */}
            {isClockedIn ? (
              <Button
                size="sm"
                onClick={handleClockOut}
                disabled={actionLoading}
                className="h-9 px-3.5 text-xs gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Clock Out</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleClockIn}
                disabled={actionLoading}
                className="h-9 px-3.5 text-xs gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Clock In</span>
              </Button>
            )}

            {/* Notification Bell with Red Badge 3 */}
            <button
              type="button"
              onClick={() => router.push('/app/communication')}
              className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                3
              </span>
            </button>

            <ThemeToggle />

            {/* User Profile Avatar with Pastel / Image */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="relative rounded-full focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-transform active:scale-95"
              title="Profile Setup & Settings"
            >
              <UserAvatar
                avatarUrl={profile?.avatarUrl}
                firstName={profile?.firstName}
                lastName={profile?.lastName}
                seed={profile?.id || profile?.email}
                size="sm"
              />
            </button>
          </div>
        </header>

        <ProfileSetupModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          profile={profile}
          onProfileUpdated={(updated) => setProfile(updated)}
        />

        <TeamNotificationListener />
        {/* Page View Body */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
