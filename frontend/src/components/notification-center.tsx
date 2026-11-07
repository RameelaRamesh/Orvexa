'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Trash2,
  X,
  AlertCircle,
  Calendar,
  CheckSquare,
  Briefcase,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  syncPushSubscription,
  showWorkNotification,
  NotificationStatus,
} from '@/lib/notifications';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationStatus>('default');
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const lastFetchedIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' && wsId !== 'null' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  useEffect(() => {
    const perm = getNotificationPermission();
    setPermission(perm);
    const dismissed = localStorage.getItem('orvexa_chrome_notif_dismissed');
    if (perm === 'default' && !dismissed) {
      setShowPermissionBanner(true);
    }
  }, []);

  const fetchNotifications = async (quiet = true) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!token || !wsId) return;

    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/notifications?limit=40`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        const newItems: NotificationItem[] = data.notifications;
        setNotifications(newItems);
        setUnreadCount(data.unreadCount || 0);

        // Check for new incoming notifications to trigger Chrome notification
        if (!isInitialLoadRef.current) {
          for (const item of newItems) {
            if (!item.isRead && !lastFetchedIdsRef.current.has(item.id)) {
              showWorkNotification({
                title: item.title,
                message: item.message,
                link: item.link,
                onOpen: () => handleNotificationClick(item),
              });
            }
          }
        }

        lastFetchedIdsRef.current = new Set(newItems.map((n) => n.id));
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      // quiet poll failure
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (token && wsId && permission === 'granted') {
      syncPushSubscription(BRANDING.apiUrl, token, wsId);
    }

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    const handleFocus = () => fetchNotifications(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [permission]);

  // Handle clicking outside of dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    setShowPermissionBanner(false);
    if (res === 'granted') {
      toast.success('Chrome browser notifications enabled!');
      const token = localStorage.getItem('accessToken');
      const wsId = localStorage.getItem('activeWorkspaceId');
      if (token && wsId) {
        syncPushSubscription(BRANDING.apiUrl, token, wsId);
      }
    } else if (res === 'denied') {
      toast.error('Notification permission was blocked in Chrome settings.');
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    localStorage.setItem('orvexa_chrome_notif_dismissed', 'true');
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${BRANDING.apiUrl}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${BRANDING.apiUrl}/notifications/read-all`, {
        method: 'POST',
        headers: getHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${BRANDING.apiUrl}/notifications/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setNotifications((prev) => {
        const item = prev.find((n) => n.id === id);
        if (item && !item.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (err) {}
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    setIsOpen(false);
    setHistoryModalOpen(false);

    if (item.link) {
      router.push(item.link);
    } else {
      router.push('/app/projects');
    }
  };

  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type?: string, title = '') => {
    const t = (type || '').toUpperCase();
    const tit = title.toLowerCase();
    if (t.includes('TASK') || tit.includes('task') || tit.includes('work item')) {
      return <CheckSquare className="h-4 w-4 text-blue-500" />;
    }
    if (t.includes('CALENDAR') || t.includes('MEETING') || tit.includes('meeting') || tit.includes('calendar')) {
      return <Calendar className="h-4 w-4 text-purple-500" />;
    }
    if (t.includes('PROJECT') || tit.includes('project')) {
      return <Briefcase className="h-4 w-4 text-emerald-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col max-h-[520px] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Chrome Browser Notification Banner Prompt */}
          {showPermissionBanner && permission === 'default' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-start justify-between gap-2.5">
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-tight">
                  Enable Chrome Desktop Alerts
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300/90 mt-0.5 leading-snug">
                  Get real-time alerts for task assignments, deadline reminders and team meetings.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    Allow Notifications
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissBanner}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissBanner}
                className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Tabs Filter */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-3 pt-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-2 font-medium border-b-2 cursor-pointer transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`pb-2 font-medium border-b-2 cursor-pointer transition-colors ${
                activeTab === 'unread'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-medium">No {activeTab === 'unread' ? 'unread ' : ''}notifications</p>
                <p className="text-[11px] text-slate-400/80 mt-0.5">You are all caught up with your workspace!</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group relative ${
                    !notif.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {getNotificationIcon(notif.type, notif.title)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${!notif.isRead ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All History */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setHistoryModalOpen(true);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 mx-auto cursor-pointer"
            >
              View Full Notification History
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Full Notification History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Notification History & Audit Log
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological activity log of work assignments, deadlines, reviews and reminders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-30 stroke-[1.5]" />
                  <p className="text-sm font-semibold">No notification history recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Activity and reminders will appear here when projects, tasks, or calendar items update.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`py-3.5 px-3 rounded-xl flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                      !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="mt-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getNotificationIcon(n.type, n.title)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${!n.isRead ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {formatTimestamp(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      {n.link && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-2">
                          <span>Open related item</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 self-center">
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(n.id, e)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
              <span>Total records: {notifications.length}</span>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors"
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
