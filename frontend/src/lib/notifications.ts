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

export type NotificationSoundType = 'chime' | 'bell' | 'pop' | 'subtle';

export interface NotificationPrefs {
  desktopNotificationsEnabled: boolean;
  soundEnabled: boolean;
  soundType: NotificationSoundType;
  soundVolume: number;
  taskSoundEnabled: boolean;
  chatSoundEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  desktopNotificationsEnabled: true,
  soundEnabled: true,
  soundType: 'chime',
  soundVolume: 0.7,
  taskSoundEnabled: true,
  chatSoundEnabled: true,
};

function resolveCurrentUserId(explicitUserId?: string | null): string {
  if (explicitUserId) return explicitUserId;
  if (typeof window === 'undefined') return 'default';
  try {
    const rawUser =
      localStorage.getItem('user') || localStorage.getItem('orvexa_cached_profile');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {}
  return 'default';
}

export function getNotificationPrefs(userId?: string | null): NotificationPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIFICATION_PREFS };
  const uid = resolveCurrentUserId(userId);
  try {
    const raw =
      localStorage.getItem(`orvexa_notif_prefs_${uid}`) ||
      (uid !== 'default' ? null : localStorage.getItem('orvexa_notif_prefs_default'));
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...parsed,
      soundVolume:
        typeof parsed?.soundVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.soundVolume))
          : DEFAULT_NOTIFICATION_PREFS.soundVolume,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function saveNotificationPrefs(
  prefs: Partial<NotificationPrefs>,
  userId?: string | null,
): NotificationPrefs {
  const uid = resolveCurrentUserId(userId);
  const current = getNotificationPrefs(uid);
  const next: NotificationPrefs = {
    ...current,
    ...prefs,
    soundVolume:
      typeof prefs.soundVolume === 'number'
        ? Math.max(0, Math.min(1, prefs.soundVolume))
        : current.soundVolume,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`orvexa_notif_prefs_${uid}`, JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent('notification-prefs-updated', { detail: { userId: uid, prefs: next } }),
      );
    } catch {}
  }
  return next;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => null);
  }
  return sharedAudioCtx;
}

function playToneSequence(
  ctx: AudioContext,
  notes: Array<{ freq: number; delay: number; duration: number; type?: OscillatorType }>,
  volume: number,
) {
  const now = ctx.currentTime;
  const clampedVol = Math.max(0.02, Math.min(1, volume)) * 0.25;
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type || 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.delay);
    gain.gain.setValueAtTime(0.0001, now + note.delay);
    gain.gain.exponentialRampToValueAtTime(clampedVol, now + note.delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + note.delay);
    osc.stop(now + note.delay + note.duration + 0.02);
  }
}

export function testNotificationSound(
  soundType: NotificationSoundType = 'chime',
  soundVolume: number = 0.7,
) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (soundType === 'chime') {
      playToneSequence(
        ctx,
        [
          { freq: 880, delay: 0, duration: 0.16, type: 'sine' },
          { freq: 1174.66, delay: 0.11, duration: 0.24, type: 'sine' },
        ],
        soundVolume,
      );
    } else if (soundType === 'bell') {
      playToneSequence(
        ctx,
        [
          { freq: 1046.5, delay: 0, duration: 0.35, type: 'triangle' },
          { freq: 1567.98, delay: 0.02, duration: 0.28, type: 'sine' },
        ],
        soundVolume,
      );
    } else if (soundType === 'pop') {
      playToneSequence(
        ctx,
        [{ freq: 740, delay: 0, duration: 0.09, type: 'sine' }],
        soundVolume,
      );
    } else {
      playToneSequence(
        ctx,
        [{ freq: 587.33, delay: 0, duration: 0.18, type: 'sine' }],
        soundVolume * 0.65,
      );
    }
  } catch {
    // Ignore Web Audio blocks when no user gesture occurred yet
  }
}

export function playNotificationSound(
  kind: 'task' | 'chat' | 'general' = 'general',
  userId?: string | null,
  overridePrefs?: Partial<NotificationPrefs>,
) {
  const prefs = { ...getNotificationPrefs(userId), ...(overridePrefs || {}) };
  if (!prefs.soundEnabled) return;
  if (kind === 'task' && !prefs.taskSoundEnabled) return;
  if (kind === 'chat' && !prefs.chatSoundEnabled) return;
  testNotificationSound(prefs.soundType, prefs.soundVolume);
}

export interface ChromeNotificationOptions {
  body?: string;
  tag?: string;
  icon?: string;
  data?: any;
  userId?: string | null;
  soundKind?: 'task' | 'chat' | 'general';
  skipSound?: boolean;
  onClick?: () => void;
}

/**
 * Shows native Chrome / Web desktop notification and plays configured user alert tone.
 */
export function showChromeNotification(
  title: string,
  options?: ChromeNotificationOptions,
): Notification | null {
  const prefs = getNotificationPrefs(options?.userId);

  if (!options?.skipSound) {
    playNotificationSound(options?.soundKind || 'general', options?.userId, prefs);
  }

  if (!prefs.desktopNotificationsEnabled) {
    return null;
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body || '',
      icon: options?.icon || '/favicon.ico',
      silent: true, // Sound is handled cleanly with user's configured tone & volume above
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
  userId?: string | null;
  onOpen?: () => void;
}

export function showWorkNotification({
  title,
  message,
  type = 'TASK',
  link,
  userId,
  onOpen,
}: WorkNotificationParams) {
  const preview = message.length > 100 ? `${message.slice(0, 100)}...` : message;

  // 1. Chrome Web Notification + configured sound
  showChromeNotification(title, {
    body: preview,
    tag: `work-${type.toLowerCase()}-${Date.now()}`,
    userId,
    soundKind: 'task',
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
  userId?: string | null;
  onOpen?: () => void;
}

export function showMessageNotification({
  title,
  senderName,
  message,
  conversationTitle,
  conversationId,
  userId,
  onOpen,
}: MessageNotificationParams) {
  const notifTitle = title || (conversationTitle ? `${conversationTitle} • ${senderName}` : senderName);
  const preview = message.length > 90 ? `${message.slice(0, 90)}...` : message;

  showChromeNotification(notifTitle, {
    body: preview || 'Sent an attachment',
    tag: `team-msg-${conversationId || 'chat'}-${Date.now()}`,
    userId,
    soundKind: 'chat',
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
