'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { showMessageNotification } from '@/lib/notifications';

interface ConversationMeta {
  id: string;
  name?: string;
  displayName?: string;
  type: 'DIRECT' | 'GROUP';
  lastMessageSnippet?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderMembershipId?: string;
  unreadCount?: number;
  participantMembershipIds: string[];
}

export function TeamNotificationListener() {
  const pathname = usePathname();
  const router = useRouter();
  const lastKnownMessageAtRef = useRef<Record<string, string>>({});
  const isInitializedRef = useRef<boolean>(false);
  const currentMembershipIdRef = useRef<string>('');
  const currentUserIdRef = useRef<string>('');
  const contextKeyRef = useRef<string>('');

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!token || !wsId) return;

    const fetchMembership = async () => {
      try {
        const res = await fetch(`${BRANDING.apiUrl}/auth/me`, { headers: getHeaders() });
        const raw = await res.json();
        const profile = raw?.data !== undefined ? raw.data : raw;
        if (profile) {
          const nextUserId = profile.id || '';
          const currentMem = profile.memberships?.find((m: any) => m.workspaceId === wsId);
          const nextMemId = currentMem?.id || '';
          const nextKey = `${nextUserId}:${wsId}:${nextMemId}`;
          if (contextKeyRef.current !== nextKey) {
            contextKeyRef.current = nextKey;
            lastKnownMessageAtRef.current = {};
            isInitializedRef.current = false;
          }
          currentUserIdRef.current = nextUserId;
          currentMembershipIdRef.current = nextMemId;
        }
      } catch {}
    };
    fetchMembership();
  }, [pathname]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!token || !wsId) return;

    const pollConversations = async () => {
      try {
        const res = await fetch(`${BRANDING.apiUrl}/communication/conversations`, {
          headers: getHeaders(),
        });
        if (!res.ok) return;
        const json = await res.json();
        const convs: ConversationMeta[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : [];

        const totalUnread = convs.reduce(
          (sum, c) => sum + (typeof c.unreadCount === 'number' ? c.unreadCount : 0),
          0,
        );
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('chat-unread-updated', { detail: { totalUnread } }),
          );
        }

        // First run initializes baseline without alerting old history
        if (!isInitializedRef.current) {
          convs.forEach((c) => {
            if (c.lastMessageAt) {
              lastKnownMessageAtRef.current[c.id] = c.lastMessageAt;
            }
          });
          isInitializedRef.current = true;
          return;
        }

        // Communication page manages active chat view notifications itself
        if (pathname === '/app/communication') {
          convs.forEach((c) => {
            if (c.lastMessageAt) {
              lastKnownMessageAtRef.current[c.id] = c.lastMessageAt;
            }
          });
          return;
        }

        // Detect new incoming messages sent by OTHER participants (never self)
        for (const c of convs) {
          const prevLastAt = lastKnownMessageAtRef.current[c.id];
          const isFromOtherUser =
            !c.lastMessageSenderMembershipId ||
            !currentMembershipIdRef.current ||
            c.lastMessageSenderMembershipId !== currentMembershipIdRef.current;
          const hasUnread = c.unreadCount === undefined || c.unreadCount > 0;

          if (
            c.lastMessageAt &&
            prevLastAt &&
            c.lastMessageAt !== prevLastAt &&
            isFromOtherUser &&
            hasUnread
          ) {
            const title =
              c.displayName || c.name || (c.type === 'DIRECT' ? 'Direct Message' : 'Group Message');
            const messageText = c.lastMessageSnippet || c.lastMessage || 'New message received';

            showMessageNotification({
              title,
              senderName: title,
              message: messageText,
              conversationId: c.id,
              userId: currentUserIdRef.current || undefined,
              onOpen: () => {
                router.push(`/app/communication?conversationId=${c.id}`);
              },
            });
          }
          if (c.lastMessageAt) {
            lastKnownMessageAtRef.current[c.id] = c.lastMessageAt;
          }
        }
      } catch {}
    };

    pollConversations();
    const pollInterval = setInterval(pollConversations, 6000);
    const onFocus = () => pollConversations();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
    };
  }, [pathname, router]);

  return null;
}
