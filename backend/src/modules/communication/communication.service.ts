import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface Conversation {
  id: string;
  workspaceId: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  participantMembershipIds: string[];
  createdByMembershipId: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderMembershipId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  attachments?: Array<{ id: string; name: string; url: string; sizeBytes?: number }>;
  mentions?: string[];
  readByMembershipIds: string[];
  createdAt: Date;
}

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CONVERSATIONS MANAGEMENT & PARTICIPANT CONTROL
  // ---------------------------------------------------------------------------

  async listConversations(workspaceId: string, membershipId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const conversations: Conversation[] = settings.conversations || [];

    // Privacy Guard: Return only conversations where the requesting user is a member
    const userConvs = conversations.filter((c) =>
      c.participantMembershipIds.includes(membershipId),
    );

    // Fetch participant profiles for display
    const allParticipantIds = Array.from(
      new Set(userConvs.flatMap((c) => c.participantMembershipIds)),
    );

    const members = await this.prisma.membership.findMany({
      where: { id: { in: allParticipantIds }, workspaceId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      },
    });

    const memberMap = new Map(members.map((m) => [m.id, m]));

    return userConvs.map((conv) => {
      const participantDetails = conv.participantMembershipIds
        .map((pid) => memberMap.get(pid))
        .filter(Boolean);

      let displayName = conv.name;
      if (conv.type === 'DIRECT') {
        const otherParticipant = participantDetails.find((p: any) => p.id !== membershipId);
        displayName = otherParticipant
          ? `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`
          : 'Direct Message';
      }

      return {
        ...conv,
        displayName,
        participants: participantDetails,
      };
    });
  }

  async createDirectConversation(
    workspaceId: string,
    senderMembershipId: string,
    recipientMembershipId: string,
  ) {
    if (senderMembershipId === recipientMembershipId) {
      throw new BadRequestException('Cannot start a direct conversation with yourself');
    }

    const [sender, recipient] = await Promise.all([
      this.prisma.membership.findFirst({ where: { id: senderMembershipId, workspaceId } }),
      this.prisma.membership.findFirst({ where: { id: recipientMembershipId, workspaceId } }),
    ]);

    if (!sender || !recipient) {
      throw new NotFoundException('Participant not found in workspace');
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const conversations: Conversation[] = settings.conversations || [];

    // Check if direct conversation already exists between these two
    const existing = conversations.find(
      (c) =>
        c.type === 'DIRECT' &&
        c.participantMembershipIds.includes(senderMembershipId) &&
        c.participantMembershipIds.includes(recipientMembershipId),
    );

    if (existing) {
      return existing;
    }

    const newConv: Conversation = {
      id: `conv_dm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspaceId,
      type: 'DIRECT',
      participantMembershipIds: [senderMembershipId, recipientMembershipId],
      createdByMembershipId: senderMembershipId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          conversations: [newConv, ...conversations],
        },
      },
    });

    return newConv;
  }

  async createGroupConversation(
    workspaceId: string,
    creatorMembershipId: string,
    name: string,
    participantMembershipIds: string[],
  ) {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new BadRequestException('Group conversation name is required');
    }

    const allParticipants = Array.from(new Set([creatorMembershipId, ...participantMembershipIds]));

    const validCount = await this.prisma.membership.count({
      where: { id: { in: allParticipants }, workspaceId, status: 'ACTIVE' },
    });

    if (validCount !== allParticipants.length) {
      throw new BadRequestException('One or more participant IDs are invalid or inactive in this workspace');
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const conversations: Conversation[] = settings.conversations || [];

    const newGroup: Conversation = {
      id: `conv_grp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspaceId,
      type: 'GROUP',
      name: cleanName,
      participantMembershipIds: allParticipants,
      createdByMembershipId: creatorMembershipId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          conversations: [newGroup, ...conversations],
        },
      },
    });

    return newGroup;
  }

  async addParticipants(
    workspaceId: string,
    conversationId: string,
    actorMembershipId: string,
    newParticipantIds: string[],
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const conversations: Conversation[] = settings.conversations || [];

    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) throw new NotFoundException('Conversation not found');

    const conv = conversations[convIndex];
    if (!conv.participantMembershipIds.includes(actorMembershipId)) {
      throw new ForbiddenException('Only active group participants can invite new members');
    }

    const updatedParticipants = Array.from(
      new Set([...conv.participantMembershipIds, ...newParticipantIds]),
    );

    conversations[convIndex] = {
      ...conv,
      participantMembershipIds: updatedParticipants,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          conversations,
        },
      },
    });

    return conversations[convIndex];
  }

  async removeParticipant(
    workspaceId: string,
    conversationId: string,
    actorMembershipId: string,
    targetMembershipId: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const conversations: Conversation[] = settings.conversations || [];

    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) throw new NotFoundException('Conversation not found');

    const conv = conversations[convIndex];
    const isOwner = conv.createdByMembershipId === actorMembershipId;
    const isSelfLeaving = actorMembershipId === targetMembershipId;

    if (!isOwner && !isSelfLeaving) {
      throw new ForbiddenException('Only the group creator can remove other members');
    }

    // Access Revocation: Immediately remove target from conversation membership
    const updatedParticipants = conv.participantMembershipIds.filter((id) => id !== targetMembershipId);

    conversations[convIndex] = {
      ...conv,
      participantMembershipIds: updatedParticipants,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          conversations,
        },
      },
    });

    return {
      message: 'Participant removed. Access immediately revoked.',
      conversation: conversations[convIndex],
    };
  }

  // ---------------------------------------------------------------------------
  // MESSAGES, MENTIONS, ATTACHMENTS & READ STATE
  // ---------------------------------------------------------------------------

  async getMessages(
    workspaceId: string,
    conversationId: string,
    membershipId: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const conversations: Conversation[] = settings.conversations || [];
    const messages: Message[] = settings.messages || [];

    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    // PRIVACY ENFORCEMENT: Unauthorised users cannot read private conversations
    if (!conv.participantMembershipIds.includes(membershipId)) {
      throw new ForbiddenException('Access denied: You are not a participant in this conversation.');
    }

    const convMessages = messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return convMessages.map((m) => ({
      ...m,
      isReadByMe: m.readByMembershipIds.includes(membershipId),
    }));
  }

  async sendMessage(
    workspaceId: string,
    conversationId: string,
    senderMembershipId: string,
    content: string,
    attachments?: Array<{ id: string; name: string; url: string; sizeBytes?: number }>,
  ) {
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      throw new BadRequestException('Message content or attachment is required');
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const conversations: Conversation[] = settings.conversations || [];
    const messages: Message[] = settings.messages || [];

    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) throw new NotFoundException('Conversation not found');

    const conv = conversations[convIndex];

    // Verify sender is active participant
    if (!conv.participantMembershipIds.includes(senderMembershipId)) {
      throw new ForbiddenException('You cannot send messages to a conversation you are not a member of.');
    }

    const sender = await this.prisma.membership.findUnique({
      where: { id: senderMembershipId },
      include: { user: true },
    });
    const senderName = sender ? `${sender.user.firstName} ${sender.user.lastName}` : 'Team Member';
    const senderAvatar = sender?.user.avatarUrl || undefined;

    // Detect @mentions (e.g. @Name or @id)
    const mentionRegex = /@([a-zA-Z0-9_\-]+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      conversationId,
      senderMembershipId,
      senderName,
      senderAvatar,
      content: content.trim(),
      attachments: attachments || [],
      mentions,
      readByMembershipIds: [senderMembershipId],
      createdAt: new Date(),
    };

    // Update conversation metadata
    conversations[convIndex] = {
      ...conv,
      lastMessage: content.trim().slice(0, 80) || '[Attachment]',
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          conversations,
          messages: [...messages, newMessage],
        },
      },
    });

    // Notify other participants
    const otherParticipants = conv.participantMembershipIds.filter((id) => id !== senderMembershipId);
    for (const recipientId of otherParticipants) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId: recipientId,
          title: conv.type === 'DIRECT' ? `Message from ${senderName}` : `${conv.name || 'Group'}: ${senderName}`,
          message: content.trim().slice(0, 100),
          link: '/app/communication',
        },
      }).catch(() => null);
    }

    return newMessage;
  }

  async markAsRead(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    membershipId: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const messages: Message[] = settings.messages || [];

    const msgIndex = messages.findIndex((m) => m.id === messageId && m.conversationId === conversationId);
    if (msgIndex !== -1) {
      const msg = messages[msgIndex];
      if (!msg.readByMembershipIds.includes(membershipId)) {
        messages[msgIndex] = {
          ...msg,
          readByMembershipIds: [...msg.readByMembershipIds, membershipId],
        };
        await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: { settings: { ...settings, messages } },
        });
      }
      return { success: true, message: messages[msgIndex] };
    }
    return { success: true, message: undefined };
  }
}
