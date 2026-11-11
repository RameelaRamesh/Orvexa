'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Users,
  User,
  UserPlus,
  UserMinus,
  Send,
  Plus,
  Paperclip,
  Search,
  CheckCheck,
  Check,
  ShieldAlert,
  Hash,
  AtSign,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  Clock,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  showMessageNotification,
} from '@/lib/notifications';

interface Message {
  id: string;
  conversationId: string;
  senderMembershipId: string;
  senderName: string;
  senderEmail?: string;
  content: string;
  attachments?: Array<{ name: string; url: string; type?: string }>;
  readBy: Array<{ membershipId: string; readAt: string }>;
  createdAt: string;
}

interface Conversation {
  id: string;
  workspaceId: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  createdById: string;
  participantMembershipIds: string[];
  lastMessageSnippet?: string;
  lastMessageAt?: string;
  lastMessageSenderMembershipId?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function CommunicationPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMembershipId, setCurrentMembershipId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  // Filters & search
  const [tabFilter, setTabFilter] = useState<'ALL' | 'DIRECT' | 'GROUP' | 'PEOPLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInputs, setShowAttachmentInputs] = useState(false);

  // Modals
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);

  // Form states
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);

  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedConvIdsRef = useRef<Set<string>>(new Set());
  const lastKnownMessageAtRef = useRef<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' && wsId !== 'null' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0 });
    }
    loadInitialData();
  }, []);

  const emitChatUnread = (list: Conversation[]) => {
    if (typeof window === 'undefined') return;
    const totalUnread = list.reduce(
      (sum, c) => sum + (typeof c.unreadCount === 'number' ? c.unreadCount : 0),
      0,
    );
    window.dispatchEvent(new CustomEvent('chat-unread-updated', { detail: { totalUnread } }));
  };

  const markConversationRead = async (convId: string) => {
    try {
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c));
        emitChatUnread(next);
        return next;
      });
      const headers = getHeaders();
      await fetch(`${BRANDING.apiUrl}/communication/conversations/${convId}/read`, {
        method: 'POST',
        headers,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-refresh'));
      }
    } catch {}
  };

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
      markConversationRead(activeConversation.id);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  // Real-time polling for active conversation messages (every 3.5s)
  useEffect(() => {
    if (!activeConversation) return;

    const interval = setInterval(() => {
      loadMessages(activeConversation.id, true);
    }, 3500);

    return () => clearInterval(interval);
  }, [activeConversation?.id, currentMembershipId]);

  // Real-time polling for conversations list to detect messages in other chats (every 4s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const headers = getHeaders();
        const res = await fetch(`${BRANDING.apiUrl}/communication/conversations`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) return;

        const updatedConvs: Conversation[] = data.data;

        for (const conv of updatedConvs) {
          const prevLastAt = lastKnownMessageAtRef.current[conv.id];
          const isFromOtherUser =
            !conv.lastMessageSenderMembershipId ||
            !currentMembershipId ||
            conv.lastMessageSenderMembershipId !== currentMembershipId;

          if (conv.lastMessageAt && prevLastAt && conv.lastMessageAt !== prevLastAt && isFromOtherUser) {
            // New message in another conversation from another user
            if (conv.id !== activeConversation?.id) {
              const title = getConversationTitle(conv);
              const snippet = conv.lastMessageSnippet || (conv as any).lastMessage || 'New message';
              showMessageNotification({
                title,
                senderName: title,
                message: snippet,
                conversationId: conv.id,
                userId: currentUserId || undefined,
                onOpen: () => {
                  setActiveConversation(conv);
                  markConversationRead(conv.id);
                },
              });
            }
          }
          if (conv.lastMessageAt) {
            lastKnownMessageAtRef.current[conv.id] = conv.lastMessageAt;
          }
        }

        const normalizedConvs = updatedConvs.map((c) =>
          c.id === activeConversation?.id ? { ...c, unreadCount: 0 } : c,
        );
        setConversations(normalizedConvs);
        emitChatUnread(normalizedConvs);
      } catch (err) {
        // silent polling catch
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeConversation?.id, currentMembershipId, currentUserId]);

  const loadInitialData = async () => {
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!wsId) return;

    setLoading(true);
    try {
      const headers = getHeaders();
      const [meRes, convRes, peopleRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers }),
        fetch(`${BRANDING.apiUrl}/communication/conversations`, { headers }),
        fetch(`${BRANDING.apiUrl}/people`, { headers }),
      ]);

      const meData = await meRes.json();
      const convData = await convRes.json();
      const peopleData = await peopleRes.json();

      if (meData.success && meData.data) {
        if (meData.data.id) setCurrentUserId(meData.data.id);
        const currentMem = meData.data.memberships?.find((m: any) => m.workspaceId === wsId);
        if (currentMem) {
          setCurrentMembershipId(currentMem.id);
        }
      }

      if (convData.success) {
        const convList: Conversation[] = convData.data || [];
        setConversations(convList);
        emitChatUnread(convList);
        convList.forEach((c) => {
          if (c.lastMessageAt) {
            lastKnownMessageAtRef.current[c.id] = c.lastMessageAt;
          }
        });
        const targetConvId =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('conversationId')
            : null;
        const requestedConv = targetConvId ? convList.find((c) => c.id === targetConvId) : null;
        if (requestedConv) {
          setActiveConversation(requestedConv);
        } else if (convList.length > 0 && !activeConversation) {
          setActiveConversation(convList[0]);
        }
      }

      if (peopleData.success) {
        setPeople(peopleData.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load communication data:', err);
      toast.error('Failed to load chats and conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string, isSilent = false) => {
    if (!isSilent) setMessagesLoading(true);
    setAccessDenied(false);
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/communication/conversations/${convId}/messages`, {
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied(true);
          setMessages([]);
          return;
        }
        throw new Error(data.message || 'Error loading messages');
      }

      if (data.success && Array.isArray(data.data)) {
        const msgs: Message[] = data.data;
        const isFirstLoadForThisConv = !initialLoadedConvIdsRef.current.has(convId);

        if (isFirstLoadForThisConv) {
          msgs.forEach((m) => seenMessageIdsRef.current.add(m.id));
          initialLoadedConvIdsRef.current.add(convId);
        } else {
          // Identify newly arrived incoming messages
          const newArrivals = msgs.filter((m) => !seenMessageIdsRef.current.has(m.id));
          for (const newMsg of newArrivals) {
            seenMessageIdsRef.current.add(newMsg.id);
            if (newMsg.senderMembershipId !== currentMembershipId) {
              showMessageNotification({
                senderName: newMsg.senderName || 'Team Member',
                message: newMsg.content || 'Sent an attachment',
                conversationTitle: activeConversation ? getConversationTitle(activeConversation) : undefined,
                conversationId: convId,
                userId: currentUserId || undefined,
                onOpen: () => {
                  window.focus();
                },
              });
            }
          }
          if (newArrivals.some((m) => m.senderMembershipId !== currentMembershipId)) {
            markConversationRead(convId);
          }
        }

        // Filter dummy/test messages, deleted messages, and messages sent prior to clear timestamp
        let activeMsgs = msgs;
        try {
          const deletedMsgIds: string[] = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('orvexa_deleted_msg_ids') || '[]')
            : [];
          const clearedAt = getConversationClearedAt(convId);

          activeMsgs = msgs.filter((m) => {
            if (deletedMsgIds.includes(m.id)) return false;
            if (isDummyMessage(m.content)) return false;
            if (clearedAt && new Date(m.createdAt).getTime() <= new Date(clearedAt).getTime()) {
              return false;
            }
            return true;
          });
        } catch {}

        setMessages(activeMsgs);

        // Automatically mark the last unread message as read
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          const hasRead = lastMsg.readBy?.some((r: any) => r.membershipId === currentMembershipId);
          if (!hasRead && lastMsg.senderMembershipId !== currentMembershipId) {
            markMessageRead(convId, lastMsg.id);
          }
        }
      }
    } catch (err: any) {
      if (!isSilent) toast.error(err.message || 'Error loading messages');
    } finally {
      if (!isSilent) setMessagesLoading(false);
    }
  };

  const isDummyMessage = (c?: string) => {
    if (!c) return false;
    const trimmed = c.trim().toLowerCase();
    return trimmed === 'hi' || trimmed === 'hello' || trimmed === 'test' || trimmed === 'testing' || trimmed === 'dummy';
  };

  const getConversationClearedAt = (convId: string): string | null => {
    try {
      const clearedTimestamps: Record<string, string> = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('orvexa_cleared_timestamps') || '{}')
        : {};
      return clearedTimestamps[convId] || null;
    } catch {
      return null;
    }
  };

  const getConversationSnippet = (conv: Conversation) => {
    const clearedAt = getConversationClearedAt(conv.id);
    if (clearedAt && conv.lastMessageAt && new Date(conv.lastMessageAt).getTime() <= new Date(clearedAt).getTime()) {
      return 'No messages yet';
    }
    const snippet = conv.lastMessageSnippet || (conv as any).lastMessage;
    if (!snippet || isDummyMessage(snippet)) return 'No messages yet';
    return snippet;
  };

  const handleClearChat = async (convId: string) => {
    if (confirm('Clear message history for this chat?')) {
      const nowIso = new Date().toISOString();
      try {
        const clearedTimestamps: Record<string, string> = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('orvexa_cleared_timestamps') || '{}')
          : {};
        clearedTimestamps[convId] = nowIso;
        localStorage.setItem('orvexa_cleared_timestamps', JSON.stringify(clearedTimestamps));

        const clearedConvIds: string[] = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('orvexa_cleared_conv_ids') || '[]')
          : [];
        if (!clearedConvIds.includes(convId)) {
          clearedConvIds.push(convId);
          localStorage.setItem('orvexa_cleared_conv_ids', JSON.stringify(clearedConvIds));
        }
      } catch {}

      setMessages([]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, lastMessageSnippet: '', lastMessage: '', lastMessageAt: undefined }
            : c,
        ),
      );

      // Call backend to permanently delete conversation messages
      try {
        const headers = getHeaders();
        await fetch(`${BRANDING.apiUrl}/communication/conversations/${convId}/messages`, {
          method: 'DELETE',
          headers,
        });
      } catch (err) {
        console.error('Failed to clear messages on backend:', err);
      }

      toast.success('Chat history cleared');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const deletedMsgIds: string[] = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('orvexa_deleted_msg_ids') || '[]')
        : [];
      if (!deletedMsgIds.includes(msgId)) {
        deletedMsgIds.push(msgId);
        localStorage.setItem('orvexa_deleted_msg_ids', JSON.stringify(deletedMsgIds));
      }
    } catch {}
    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    if (activeConversation) {
      try {
        const headers = getHeaders();
        await fetch(
          `${BRANDING.apiUrl}/communication/conversations/${activeConversation.id}/messages/${msgId}`,
          {
            method: 'DELETE',
            headers,
          },
        );
      } catch (err) {
        console.error('Failed to delete message on backend:', err);
      }
    }
    toast.success('Message deleted');
  };

  const markMessageRead = async (convId: string, messageId: string) => {
    try {
      const headers = getHeaders();
      await fetch(`${BRANDING.apiUrl}/communication/conversations/${convId}/messages/${messageId}/read`, {
        method: 'POST',
        headers,
      });
    } catch (e) {
      // ignore silent read failures
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !attachmentUrl) return;
    if (!activeConversation) return;

    setSending(true);
    try {
      const headers = getHeaders();
      const attachments = attachmentUrl.trim()
        ? [{ name: attachmentName.trim() || 'Attachment', url: attachmentUrl.trim(), type: 'link' }]
        : [];

      const res = await fetch(
        `${BRANDING.apiUrl}/communication/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: messageInput.trim(),
            attachments,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send message');

      setMessageInput('');
      setAttachmentName('');
      setAttachmentUrl('');
      setShowAttachmentInputs(false);

      // Record our own message ID so we never trigger a notification for our own message
      if (data.data?.id) {
        seenMessageIdsRef.current.add(data.data.id);
      }
      if (data.data?.createdAt) {
        lastKnownMessageAtRef.current[activeConversation.id] = data.data.createdAt;
      }

      // Append new message (cleared timestamps remain active so older cleared messages are never resurrected)
      setMessages((prev) => [...prev, data.data]);

      // Update conversations preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessageSnippet: data.data.content, lastMessageAt: data.data.createdAt }
            : c,
        ),
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCreateDirectChat = async () => {
    if (!selectedRecipientId) {
      toast.error('Please select a team member');
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/communication/conversations/direct`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipientMembershipId: selectedRecipientId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create chat');

      toast.success('Conversation ready');
      setShowDirectModal(false);
      setSelectedRecipientId('');

      // Add to list if not present, and select it
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === data.data.id);
        if (exists) return prev;
        return [data.data, ...prev];
      });
      setActiveConversation(data.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start direct conversation');
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim()) {
      toast.error('Please provide a group name');
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/communication/conversations/group`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: groupName.trim(),
          participantMembershipIds: selectedGroupMemberIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create group');

      toast.success('Group conversation created');
      setShowGroupModal(false);
      setGroupName('');
      setSelectedGroupMemberIds([]);

      setConversations((prev) => [data.data, ...prev]);
      setActiveConversation(data.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create group conversation');
    }
  };

  const handleAddParticipants = async () => {
    if (!activeConversation || addMemberIds.length === 0) return;

    try {
      const headers = getHeaders();
      const res = await fetch(
        `${BRANDING.apiUrl}/communication/conversations/${activeConversation.id}/participants`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ participantMembershipIds: addMemberIds }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add members');

      toast.success('Members added successfully');
      setAddMemberIds([]);
      setActiveConversation(data.data);
      setConversations((prev) => prev.map((c) => (c.id === data.data.id ? data.data : c)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to add members');
    }
  };

  const handleRemoveParticipant = async (targetId: string) => {
    if (!activeConversation) return;

    try {
      const headers = getHeaders();
      const res = await fetch(
        `${BRANDING.apiUrl}/communication/conversations/${activeConversation.id}/participants/${targetId}`,
        {
          method: 'DELETE',
          headers,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove member');

      toast.success('Participant removed. Access immediately revoked.');
      setActiveConversation(data.data);
      setConversations((prev) => prev.map((c) => (c.id === data.data.id ? data.data : c)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const startOrOpenDirectChat = async (recipientMembershipId: string) => {
    // 1. Check if direct chat already exists in conversations
    const existing = conversations.find(
      (c) =>
        c.type === 'DIRECT' &&
        c.participantMembershipIds.includes(recipientMembershipId) &&
        (c.participantMembershipIds.includes(currentMembershipId) || c.participantMembershipIds.length === 2),
    );
    if (existing) {
      setActiveConversation(existing);
      return;
    }

    // 2. Otherwise create it via backend
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/communication/conversations/direct`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipientMembershipId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start chat');
      const conv = data.data;
      setConversations((prev) => {
        const found = prev.find((c) => c.id === conv.id);
        if (found) return prev;
        return [conv, ...prev];
      });
      setActiveConversation(conv);
      toast.success('Direct conversation ready');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start direct conversation');
    }
  };

  const getMemberRoleAndDept = (mem: any) => {
    if (!mem) return '';
    const designation =
      typeof mem.designation === 'string'
        ? mem.designation
        : mem.designation?.title || mem.role?.name || mem.accessRole || '';
    const dept = typeof mem.department === 'string' ? mem.department : mem.department?.name || '';
    if (designation && dept) return `${designation} • ${dept}`;
    return designation || dept || '';
  };

  const getMemberName = (membershipId: string) => {
    const mem = people.find((p) => p.id === membershipId);
    if (!mem) return 'Member';
    const first = mem.user?.firstName || mem.firstName || '';
    const last = mem.user?.lastName || mem.lastName || '';
    const name = `${first} ${last}`.trim();
    return name || mem.user?.email || 'Member';
  };

  const getConversationTitle = (c: Conversation) => {
    if (c.type === 'GROUP') return c.name || 'Group Chat';
    // Direct chat: show other person's name
    const otherId = c.participantMembershipIds.find((id) => id !== currentMembershipId);
    return otherId ? getMemberName(otherId) : 'Direct Message';
  };

  const filteredConversations = conversations.filter((c) => {
    if (tabFilter === 'DIRECT' && c.type !== 'DIRECT') return false;
    if (tabFilter === 'GROUP' && c.type !== 'GROUP') return false;
    if (tabFilter === 'PEOPLE') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = getConversationTitle(c).toLowerCase();
      if (title.includes(q)) return true;
      if (c.lastMessageSnippet && c.lastMessageSnippet.toLowerCase().includes(q)) return true;
      const hasMatchingParticipant = c.participantMembershipIds.some((pid) => {
        const mem = people.find((p) => p.id === pid);
        const name = getMemberName(pid).toLowerCase();
        const email = (mem?.user?.email || mem?.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
      return hasMatchingParticipant;
    }
    return true;
  });

  const filteredPeople = people.filter((p) => {
    if (!p) return false;
    if (p.id === currentMembershipId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const first = p.user?.firstName || p.firstName || '';
      const last = p.user?.lastName || p.lastName || '';
      const name = `${first} ${last}`.trim().toLowerCase();
      const email = (p.user?.email || p.email || '').toLowerCase();
      const roleAndDept = getMemberRoleAndDept(p).toLowerCase();
      return name.includes(q) || email.includes(q) || roleAndDept.includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[460px] max-h-[calc(100vh-7.5rem)] gap-2">
      {/* Header Actions Row */}
      <div className="flex items-center justify-between pb-1 shrink-0">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Direct Messages &amp; Group Chats
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDirectModal(true)} className="h-8 text-xs font-medium rounded-lg">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New Direct Chat
          </Button>
          <Button size="sm" onClick={() => setShowGroupModal(true)} className="h-8 text-xs font-medium rounded-lg">
            <Users className="mr-1 h-3.5 w-3.5" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Main Container - Laptop Friendly Flex Layout */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden rounded-xl border border-border bg-card shadow-xs min-h-0">
        {/* Sidebar: Conversation List */}
        <div className="w-full md:w-80 lg:w-88 flex flex-col border-r border-border bg-muted/20 shrink-0 min-h-0">
          {/* Search & Tabs */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations or people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                onClick={() => setTabFilter('ALL')}
                className={`flex-1 rounded-md py-1 text-center transition-colors ${
                  tabFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTabFilter('DIRECT')}
                className={`flex-1 rounded-md py-1 text-center transition-colors ${
                  tabFilter === 'DIRECT'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Direct
              </button>
              <button
                onClick={() => setTabFilter('GROUP')}
                className={`flex-1 rounded-md py-1 text-center transition-colors ${
                  tabFilter === 'GROUP'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Groups
              </button>
              <button
                onClick={() => setTabFilter('PEOPLE')}
                className={`flex-1 rounded-md py-1 text-center transition-colors flex items-center justify-center gap-1 ${
                  tabFilter === 'PEOPLE'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Search and chat with team members"
              >
                <Users className="h-3 w-3" />
                <span>People</span>
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading conversations...</div>
            ) : tabFilter === 'PEOPLE' ? (
              /* People View */
              filteredPeople.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No team members found{searchQuery ? ` matching "${searchQuery}"` : ''}.
                </div>
              ) : (
                filteredPeople.map((person) => {
                  const first = person.user?.firstName || person.firstName || '';
                  const last = person.user?.lastName || person.lastName || '';
                  const name = `${first} ${last}`.trim() || person.user?.email || person.email || 'Team Member';
                  const roleAndDept = getMemberRoleAndDept(person);
                  const email = person.user?.email || person.email || '';
                  const existingConv = conversations.find(
                    (c) =>
                      c.type === 'DIRECT' &&
                      c.participantMembershipIds.includes(person.id) &&
                      (c.participantMembershipIds.includes(currentMembershipId) || c.participantMembershipIds.length === 2),
                  );
                  const isSelected = activeConversation?.id === existingConv?.id;

                  return (
                    <button
                      key={person.id}
                      onClick={() => startOrOpenDirectChat(person.id)}
                      className={`w-full text-left rounded-lg p-2.5 transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/20 shadow-xs'
                          : 'hover:bg-muted/60 border border-transparent'
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/25">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">{name}</span>
                          {existingConv ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0 font-normal"
                            >
                              Active Chat
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-primary hover:underline font-semibold shrink-0">
                              + Message
                            </span>
                          )}
                        </div>
                        {roleAndDept && (
                          <p className="text-[11px] text-muted-foreground truncate">{roleAndDept}</p>
                        )}
                        {email && (
                          <p className="text-[10px] text-muted-foreground/80 truncate">{email}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )
            ) : searchQuery.trim() && tabFilter !== 'GROUP' ? (
              /* Search across conversations AND people */
              filteredConversations.length === 0 && filteredPeople.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No conversations or team members found matching &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Matching Conversations */}
                  {filteredConversations.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Conversations</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                          {filteredConversations.length}
                        </span>
                      </div>
                      {filteredConversations.map((conv) => {
                        const isSelected = activeConversation?.id === conv.id;
                        const title = getConversationTitle(conv);
                        return (
                          <button
                            key={conv.id}
                            onClick={() => setActiveConversation(conv)}
                            className={`w-full text-left rounded-lg p-2 transition-all flex items-start gap-2.5 ${
                              isSelected
                                ? 'bg-primary/10 border border-primary/20 shadow-xs'
                                : 'hover:bg-muted/60 border border-transparent'
                            }`}
                          >
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                conv.type === 'GROUP'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                            >
                              {conv.type === 'GROUP' ? <Hash className="h-4 w-4" /> : title.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs truncate ${(conv.unreadCount || 0) > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{title}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {(conv.unreadCount || 0) > 0 && (
                                    <span className="inline-flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                                      {conv.unreadCount}
                                    </span>
                                  )}
                                  {conv.lastMessageAt && (!getConversationClearedAt(conv.id) || new Date(conv.lastMessageAt).getTime() > new Date(getConversationClearedAt(conv.id)!).getTime()) && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {getConversationSnippet(conv)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching People */}
                  {filteredPeople.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-primary inline" /> People ({filteredPeople.length})
                        </span>
                        <span className="text-[9px] text-muted-foreground font-normal">Click to message</span>
                      </div>
                      {filteredPeople.map((person) => {
                        const first = person.user?.firstName || person.firstName || '';
                        const last = person.user?.lastName || person.lastName || '';
                        const name = `${first} ${last}`.trim() || person.user?.email || person.email || 'Team Member';
                        const roleAndDept = getMemberRoleAndDept(person);
                        const existingConv = conversations.find(
                          (c) =>
                            c.type === 'DIRECT' &&
                            c.participantMembershipIds.includes(person.id) &&
                            (c.participantMembershipIds.includes(currentMembershipId) || c.participantMembershipIds.length === 2),
                        );
                        const isSelected = activeConversation?.id === existingConv?.id;

                        return (
                          <button
                            key={person.id}
                            onClick={() => startOrOpenDirectChat(person.id)}
                            className={`w-full text-left rounded-lg p-2 transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-primary/10 border border-primary/20 shadow-xs'
                                : 'hover:bg-muted/60 border border-transparent'
                            }`}
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/25">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-foreground truncate">{name}</span>
                                {existingConv ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0 font-normal"
                                  >
                                    Active Chat
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-primary hover:underline font-semibold shrink-0">
                                    + Message
                                  </span>
                                )}
                              </div>
                              {roleAndDept && (
                                <p className="text-[10px] text-muted-foreground truncate">{roleAndDept}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No conversations found. Start a new direct chat or group!
              </div>
            ) : (
              /* Regular conversation list */
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const title = getConversationTitle(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`w-full text-left rounded-lg p-2.5 transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/20 shadow-xs'
                        : 'hover:bg-muted/60 border border-transparent'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        conv.type === 'GROUP'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {conv.type === 'GROUP' ? <Hash className="h-4 w-4" /> : title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs truncate ${(conv.unreadCount || 0) > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(conv.unreadCount || 0) > 0 && (
                            <span className="inline-flex min-w-5 h-4 px-1.5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                          {conv.lastMessageAt && (!getConversationClearedAt(conv.id) || new Date(conv.lastMessageAt).getTime() > new Date(getConversationClearedAt(conv.id)!).getTime()) && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {getConversationSnippet(conv)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">
                          {conv.type === 'GROUP'
                            ? `${conv.participantMembershipIds.length} members`
                            : 'Direct'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-background min-w-0 min-h-0">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      activeConversation.type === 'GROUP'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {activeConversation.type === 'GROUP' ? (
                      <Hash className="h-5 w-5" />
                    ) : (
                      getConversationTitle(activeConversation).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {getConversationTitle(activeConversation)}
                      {activeConversation.type === 'GROUP' && (
                        <Badge variant="secondary" className="text-[10px]">
                          Group
                        </Badge>
                      )}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {activeConversation.type === 'GROUP'
                        ? `${activeConversation.participantMembershipIds.length} participants`
                        : 'Direct Message'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearChat(activeConversation.id)}
                    title="Clear chat messages"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive gap-1 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Clear Chat</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadMessages(activeConversation.id)}
                    title="Refresh messages"
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {activeConversation.type === 'GROUP' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowManageMembersModal(true)}
                      className="text-xs"
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      Manage Members
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages Content */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {accessDenied ? (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-3">
                      <ShieldAlert className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Access Restricted</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      You are no longer a participant in this conversation. Your access to this discussion and
                      its message history has been revoked.
                    </p>
                  </div>
                ) : messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">No messages yet. Send a message to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderMembershipId === currentMembershipId;
                    const hasRead = msg.readBy && msg.readBy.length > 0;
                    return (
                      <div
                        key={msg.id}
                        className={`group flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-medium text-foreground">
                            {isOwn ? 'You' : msg.senderName}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 ml-1"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs shadow-xs ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-xs'
                              : 'bg-muted/80 text-foreground rounded-bl-xs border border-border'
                          }`}
                        >
                          {/* Message Content with highlights */}
                          <div className="whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </div>

                          {/* Attachments if any */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1 pt-1.5 border-t border-border/20">
                              {msg.attachments.map((att, i) => (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-1.5 text-[11px] underline hover:opacity-80 ${
                                    isOwn ? 'text-primary-foreground font-medium' : 'text-primary'
                                  }`}
                                >
                                  <Paperclip className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Read receipts indicator for own messages */}
                        {isOwn && (
                          <div className="flex items-center gap-1 mt-0.5 px-1 text-[9px] text-muted-foreground">
                            {hasRead ? (
                              <>
                                <CheckCheck className="h-3 w-3 text-primary" />
                                <span>Read by {msg.readBy.length}</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Sent</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              {!accessDenied && (
                <div className="border-t border-border p-3 bg-card">
                  {showAttachmentInputs && (
                    <div className="mb-2 p-2 rounded-lg bg-muted/40 border border-border flex items-center gap-2 text-xs">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="File / Link title (e.g. quarterly_report.pdf)"
                        value={attachmentName}
                        onChange={(e) => setAttachmentName(e.target.value)}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                      />
                      <input
                        type="url"
                        placeholder="URL (e.g. https://...)"
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => setShowAttachmentInputs(false)}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentInputs(!showAttachmentInputs)}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Attach file or link"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      placeholder="Type a message... (type @name to mention team members)"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button type="submit" size="sm" disabled={sending || (!messageInput.trim() && !attachmentUrl)}>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Send
                    </Button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
              <h3 className="text-base font-semibold text-foreground">Select a conversation</h3>
              <p className="text-xs max-w-sm mt-1">
                Choose a direct message or group conversation on the left, or create a new one to start collaborating.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Direct Chat */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Start Direct Conversation
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select any team member in your organization to start a private 1-to-1 conversation.
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-medium text-foreground">Select Member</label>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose recipient --</option>
                {people
                  .filter((p) => p.id !== currentMembershipId)
                  .map((p) => {
                    const first = p.user?.firstName || p.firstName || '';
                    const last = p.user?.lastName || p.lastName || '';
                    const name = `${first} ${last}`.trim() || p.user?.email || 'Member';
                    const role = p.role?.name || p.accessRole || '';
                    return (
                      <option key={p.id} value={p.id}>
                        {name} ({role})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDirectModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateDirectChat} disabled={!selectedRecipientId}>
                Open Conversation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Group Chat */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Create Group Conversation
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Create a collaboration group for a team, squad, or project topic.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Operations Squad, Product Launch, Facilities Team"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Add Members</label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-input p-2 space-y-1">
                  {people
                    .filter((p) => p.id !== currentMembershipId)
                    .map((p) => {
                      const first = p.user?.firstName || p.firstName || '';
                      const last = p.user?.lastName || p.lastName || '';
                      const name = `${first} ${last}`.trim() || p.user?.email || 'Member';
                      const isChecked = selectedGroupMemberIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGroupMemberIds([...selectedGroupMemberIds, p.id]);
                              } else {
                                setSelectedGroupMemberIds(selectedGroupMemberIds.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded border-input text-primary"
                          />
                          <span className="text-foreground">{name}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{p.role?.name || p.accessRole}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowGroupModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateGroupChat} disabled={!groupName.trim()}>
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage Group Members */}
      {showManageMembersModal && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Manage Group Members
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeConversation.name} ({activeConversation.participantMembershipIds.length} members)
                </p>
              </div>
              <button
                onClick={() => setShowManageMembersModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current members list */}
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-foreground mb-2">Current Participants</h3>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {activeConversation.participantMembershipIds.map((memId) => {
                  const name = getMemberName(memId);
                  const isCreator = memId === activeConversation.createdById;
                  const isMe = memId === currentMembershipId;
                  return (
                    <div key={memId} className="flex items-center justify-between p-2.5 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{name}</span>
                        {isCreator && (
                          <Badge variant="outline" className="ml-2 text-[9px] py-0">
                            Creator
                          </Badge>
                        )}
                        {isMe && (
                          <Badge variant="secondary" className="ml-2 text-[9px] py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      {!isCreator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(memId)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                          title="Remove participant and revoke access"
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add new members */}
            <div className="mt-4 pt-3 border-t border-border">
              <h3 className="text-xs font-semibold text-foreground mb-2">Add New Members</h3>
              <div className="max-h-36 overflow-y-auto rounded-md border border-input p-2 space-y-1">
                {people
                  .filter((p) => !activeConversation.participantMembershipIds.includes(p.id))
                  .map((p) => {
                    const first = p.user?.firstName || p.firstName || '';
                    const last = p.user?.lastName || p.lastName || '';
                    const name = `${first} ${last}`.trim() || p.user?.email || 'Member';
                    const isChecked = addMemberIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddMemberIds([...addMemberIds, p.id]);
                            } else {
                              setAddMemberIds(addMemberIds.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded border-input text-primary"
                        />
                        <span className="text-foreground">{name}</span>
                      </label>
                    );
                  })}
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddParticipants}
                  disabled={addMemberIds.length === 0}
                  className="text-xs"
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add Selected to Group
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Removing a participant immediately revokes their access to this conversation, message history,
                and notifications.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
