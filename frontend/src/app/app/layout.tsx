'use client';

import '@/lib/session-isolation';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
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
} from 'lucide-react';
import { toast } from 'sonner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${BRANDING.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setProfile(data.data);
        const memberships = data.data.memberships || [];
        const savedWsId = localStorage.getItem('activeWorkspaceId');

        let activeMem = memberships.find((m: any) => m.workspaceId === savedWsId);
        if (!activeMem && memberships.length > 0) {
          activeMem = memberships[0];
          localStorage.setItem('activeWorkspaceId', activeMem.workspaceId);
        }

        setActiveWorkspace(activeMem);
      } catch (err: any) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('activeWorkspaceId');
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('activeWorkspaceId');
    toast.info('Logged out successfully');
    router.push('/login');
  };

  const handleSwitchWorkspace = (newWsId: string) => {
    const newMem = profile?.memberships?.find((m: any) => m.workspaceId === newWsId);
    if (newMem) {
      localStorage.setItem('activeWorkspaceId', newWsId);
      setActiveWorkspace(newMem);
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
  const rolePermissions: string[] = activeWorkspace?.role?.permissions?.map(
    (rp: any) => rp.permission?.code || rp.code || rp,
  ) || [];

  const hasPerm = (perm: string) => {
    if (isPlatformAdmin) return true;
    const [mod] = perm.split(':');
    return (
      rolePermissions.includes(perm) ||
      rolePermissions.includes(`${mod}:manage`) ||
      rolePermissions.includes(`${mod}:administer`)
    );
  };

  const enabledModules: string[] = activeWorkspace?.workspace?.settings?.enabledModules || [
    'people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'quality', 'sla', 'settings'
  ];

  const allNavItems = [
    { name: 'Home / My Work', href: '/app/home', icon: Home, visible: true },
    {
      name: 'Operations Calendar',
      href: '/app/calendar',
      icon: Calendar,
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
      visible: (hasPerm('projects:view') || hasPerm('tasks:view')) && (enabledModules.includes('projects') || enabledModules.includes('tasks')),
    },
    {
      name: 'Operations Queue',
      href: '/app/work-queue',
      icon: Layers,
      visible: hasPerm('work_items:view') && enabledModules.includes('work_queue'),
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
      visible: (hasPerm('time:view') || hasPerm('attendance:view')) && (enabledModules.includes('time') || enabledModules.includes('attendance')),
    },
    {
      name: 'Leave & PTO',
      href: '/app/time?tab=leave',
      icon: Calendar,
      visible: true,
    },
    {
      name: 'Quality Scorecards',
      href: '/app/quality',
      icon: Award,
      visible: hasPerm('quality:view') && enabledModules.includes('quality'),
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
      visible: accessRole !== 'MEMBER',
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

  if (loading) {
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
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Profile Section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-foreground">
                {profile?.firstName?.charAt(0)}
                {profile?.lastName?.charAt(0)}
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate text-xs font-semibold text-foreground">
                  {profile?.firstName} {profile?.lastName}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">{profile?.email}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Log Out"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 text-muted-foreground"
              onClick={() => setMobileMenuOpen(true)}
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Multi-Organization Switcher */}
            {profile?.memberships && profile.memberships.length > 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Workspace:</span>
                <select
                  value={activeWorkspace?.workspaceId}
                  onChange={(e) => handleSwitchWorkspace(e.target.value)}
                  className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {profile.memberships.map((m: any) => (
                    <option key={m.workspaceId} value={m.workspaceId}>
                      {m.workspace?.name} ({getPortalRoleLabel(m.accessRole)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Workspace:</span>
                <Badge variant="outline" className="font-mono text-xs">{activeWorkspace?.workspace?.slug}</Badge>
                <Badge variant="default" className="text-xs">{activeWorkspace?.workspace?.businessType || 'GENERAL'}</Badge>
                <Badge variant="outline" className="text-xs font-semibold border-primary/40 bg-primary/10 text-primary">
                  {getPortalRoleLabel(accessRole)} PORTAL
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => router.push('/app/communication')}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
