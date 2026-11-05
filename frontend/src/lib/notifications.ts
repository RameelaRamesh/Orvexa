import { toast } from 'sonner';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationStatus;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';

  try {
    const res = await Notification.requestPermission();
    return res as NotificationStatus;
  } catch (err) {
    return new Promise((resolve) => {
      Notification.requestPermission((res) => resolve(res as NotificationStatus));
    });
  }
}

export interface ChromeNotificationOptions {
  body?: string;
  tag?: string;
  icon?: string;
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
      silent: true, // (no sound) - explicitly silent notification
      tag: options?.tag,
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

export interface MessageNotificationParams {
  title?: string;
  senderName: string;
  message: string;
  conversationTitle?: string;
  conversationId?: string;
  onOpen?: () => void;
}

/**
 * Triggers both:
 * 1. Chrome Web Notification (silent: true, right corner of OS, no sound)
 * 2. In-app right corner toast (Sonner top-right, no sound)
 */
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

  // 1. Chrome Desktop Notification (Silent, no sound)
  showChromeNotification(notifTitle, {
    body: preview || 'Sent an attachment',
    tag: `team-msg-${conversationId || 'chat'}-${Date.now()}`,
    onClick: onOpen,
  });

  // 2. In-App Right Corner Toast Notification (Silent, no sound)
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
