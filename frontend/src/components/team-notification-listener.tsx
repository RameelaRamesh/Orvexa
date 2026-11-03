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
  participantMembershipIds: string[];
}

export function TeamNotificationListener() {
  const pathname = usePathname();
  const router = useRouter();
  const lastKnownMessageAtRef = useRef<Record<string, string>>({});
  const isInitializedRef = useRef<boolean>(false);
  const currentMembershipIdRef = useRef<string>('');

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

    // Fetch current membership id once
    const fetchMembership = async () => {
      try {
        const res = await fetch(`${BRANDING.apiUrl}/auth/me`, { headers: getHeaders() });
        const data = await res.json();
        if (data.success && data.data) {
          const currentMem = data.data.memberships?.find((m: any) => m.workspaceId === wsId);
          if (currentMem) {
            currentMembershipIdRef.current = currentMem.id;
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchMembership();
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!token || !wsId) return;

    const pollInterval = setInterval(async () => {
      // If user is currently on the communication page, that page handles its own live notifications
      if (pathname === '/app/communication') return;

      try {
        const res = await fetch(`${BRANDING.apiUrl}/communication/conversations`, {
          headers: getHeaders(),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;

        const convs: ConversationMeta[] = json.data;

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

        // Subsequent runs detect new messages across all conversations
        for (const c of convs) {
          const prevLastAt = lastKnownMessageAtRef.current[c.id];
          if (c.lastMessageAt && prevLastAt && c.lastMessageAt !== prevLastAt) {
            const title = c.displayName || c.name || (c.type === 'DIRECT' ? 'Direct Message' : 'Group Message');
            const messageText = c.lastMessageSnippet || c.lastMessage || 'New message received';

            showMessageNotification({
              title,
              senderName: title,
              message: messageText,
              conversationId: c.id,
              onOpen: () => {
                router.push('/app/communication');
              },
            });
          }
          if (c.lastMessageAt) {
            lastKnownMessageAtRef.current[c.id] = c.lastMessageAt;
          }
        }
      } catch (err) {
        // silent polling catch
      }
    }, 6000);

    return () => clearInterval(pollInterval);
  }, [pathname, router]);

  return null;
}
