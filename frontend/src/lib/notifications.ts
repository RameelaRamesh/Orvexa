import { toast } from 'sonner';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationStatus;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Service Worker registration skipped or failed:', err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';

  try {
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      await registerServiceWorker();
    }
    return res as NotificationStatus;
  } catch (err) {
    return new Promise((resolve) => {
      Notification.requestPermission((res) => {
        if (res === 'granted') registerServiceWorker();
        resolve(res as NotificationStatus);
      });
    });
  }
}

export async function syncPushSubscription(apiUrl: string, token: string, workspaceId: string) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  if (!token || !workspaceId) return;

  try {
    const reg = await registerServiceWorker();
    let subscriptionData: any = {
      endpoint: `browser_client_${navigator.userAgent.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
    };

    if (reg && reg.pushManager) {
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          subscriptionData = sub.toJSON();
        }
      } catch {}
    }

    await fetch(`${apiUrl}/notifications/push-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify(subscriptionData),
    });
  } catch (err) {
    console.warn('Failed to sync browser push subscription with backend:', err);
  }
}

export interface ChromeNotificationOptions {
  body?: string;
  tag?: string;
  icon?: string;
  data?: any;
  onClick?: () => void;
}

/**
 * Shows native Chrome / Web desktop notification.
 * Explicitly sets `silent: true` so the notification makes NO sound.
 */
export function showChromeNotification(
  title: string,
  options?: ChromeNotificationOptions,
): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body || '',
      icon: options?.icon || '/favicon.ico',
      silent: true,
      tag: options?.tag,
      data: options?.data,
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick!();
        notification.close();
      };
    }

    return notification;
  } catch (err) {
    console.warn('Failed to display Chrome notification:', err);
    return null;
  }
}

export interface WorkNotificationParams {
  title: string;
  message: string;
  type?: 'TASK' | 'PROJECT' | 'CALENDAR' | 'MEETING' | 'SYSTEM';
  link?: string;
  onOpen?: () => void;
}

export function showWorkNotification({
  title,
  message,
  type = 'TASK',
  link,
  onOpen,
}: WorkNotificationParams) {
  const preview = message.length > 100 ? `${message.slice(0, 100)}...` : message;

  // 1. Chrome Web Notification
  showChromeNotification(title, {
    body: preview,
    tag: `work-${type.toLowerCase()}-${Date.now()}`,
    onClick: onOpen,
  });

  // 2. In-App Sonner Toast
  toast(title, {
    description: preview,
    action: onOpen
      ? {
          label: 'View',
          onClick: onOpen,
        }
      : undefined,
    duration: 6000,
  });
}

export interface MessageNotificationParams {
  title?: string;
  senderName: string;
  message: string;
  conversationTitle?: string;
  conversationId?: string;
  onOpen?: () => void;
}

export function showMessageNotification({
  title,
  senderName,
  message,
  conversationTitle,
  conversationId,
  onOpen,
}: MessageNotificationParams) {
  const notifTitle = title || (conversationTitle ? `${conversationTitle} • ${senderName}` : senderName);
  const preview = message.length > 90 ? `${message.slice(0, 90)}...` : message;

  showChromeNotification(notifTitle, {
    body: preview || 'Sent an attachment',
    tag: `team-msg-${conversationId || 'chat'}-${Date.now()}`,
    onClick: onOpen,
  });

  toast(notifTitle, {
    description: preview || 'Sent an attachment',
    action: onOpen
      ? {
          label: 'Open Chat',
          onClick: onOpen,
        }
      : undefined,
    duration: 6000,
  });
}
