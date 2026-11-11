import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(
    workspaceId: string,
    membershipId: string,
    options?: { unreadOnly?: boolean; limit?: number },
  ) {
    const where: any = {
      workspaceId,
      recipientMembershipId: membershipId,
    };

    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [items, unreadItems, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
      }),
      this.prisma.notification.findMany({
        where: {
          workspaceId,
          recipientMembershipId: membershipId,
          isRead: false,
        },
        select: { id: true, type: true, link: true, title: true },
      }),
      this.prisma.notification.count({
        where: {
          workspaceId,
          recipientMembershipId: membershipId,
        },
      }),
    ]);

    const unreadCount = unreadItems.length;
    const calendarUnreadCount = unreadItems.filter(
      (n: any) =>
        (typeof n.link === 'string' && n.link.startsWith('/app/calendar')) ||
        (typeof n.type === 'string' && (n.type.includes('CALENDAR') || n.type.includes('MEETING'))),
    ).length;
    const chatUnreadCount = unreadItems.filter(
      (n: any) =>
        (typeof n.link === 'string' && n.link.startsWith('/app/communication')) ||
        (typeof n.type === 'string' && (n.type.includes('CHAT') || n.type.includes('MESSAGE'))),
    ).length;

    return {
      notifications: items,
      unreadCount,
      calendarUnreadCount,
      chatUnreadCount,
      totalCount,
    };
  }

  async markReadByContext(
    workspaceId: string,
    membershipId: string,
    filter: { prefix?: string; link?: string; type?: string },
  ) {
    const unread = await this.prisma.notification.findMany({
      where: {
        workspaceId,
        recipientMembershipId: membershipId,
        isRead: false,
      },
      select: { id: true, link: true, type: true },
    });

    const idsToMark = unread
      .filter((n: any) => {
        if (filter.prefix && typeof n.link === 'string' && n.link.startsWith(filter.prefix)) return true;
        if (filter.link && n.link === filter.link) return true;
        if (filter.type && typeof n.type === 'string' && n.type.includes(filter.type)) return true;
        return false;
      })
      .map((n: any) => n.id);

    if (idsToMark.length > 0) {
      await this.prisma.notification.updateMany({
        where: {
          id: { in: idsToMark },
          workspaceId,
          recipientMembershipId: membershipId,
        },
        data: { isRead: true },
      });
    }

    return { success: true, clearedCount: idsToMark.length };
  }

  async markAsRead(
    workspaceId: string,
    membershipId: string,
    notificationId: string,
  ) {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        workspaceId,
        recipientMembershipId: membershipId,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markAllAsRead(workspaceId: string, membershipId: string) {
    await this.prisma.notification.updateMany({
      where: {
        workspaceId,
        recipientMembershipId: membershipId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async delete(
    workspaceId: string,
    membershipId: string,
    notificationId: string,
  ) {
    await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        workspaceId,
        recipientMembershipId: membershipId,
      },
    });

    return { success: true };
  }

  async savePushSubscription(
    workspaceId: string,
    membershipId: string,
    subscription: any,
  ) {
    if (!subscription || !subscription.endpoint) {
      return { success: false, message: 'Invalid subscription' };
    }

    try {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      });

      const settings = (ws?.settings as Record<string, any>) || {};
      const pushSubscriptions: Record<string, any[]> = settings.pushSubscriptions || {};
      const userSubs: any[] = pushSubscriptions[membershipId] || [];

      // Avoid duplicates
      const filtered = userSubs.filter((s: any) => s.endpoint !== subscription.endpoint);
      filtered.push({
        ...subscription,
        subscribedAt: new Date().toISOString(),
      });
      pushSubscriptions[membershipId] = filtered;

      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          settings: {
            ...settings,
            pushSubscriptions,
          },
        },
      });

      return { success: true, count: filtered.length };
    } catch (err: any) {
      this.logger.error(`Error saving push subscription: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async removePushSubscription(
    workspaceId: string,
    membershipId: string,
    endpoint?: string,
  ) {
    try {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      });

      const settings = (ws?.settings as Record<string, any>) || {};
      const pushSubscriptions: Record<string, any[]> = settings.pushSubscriptions || {};

      if (endpoint && pushSubscriptions[membershipId]) {
        pushSubscriptions[membershipId] = pushSubscriptions[membershipId].filter(
          (s: any) => s.endpoint !== endpoint,
        );
      } else {
        delete pushSubscriptions[membershipId];
      }

      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          settings: {
            ...settings,
            pushSubscriptions,
          },
        },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getPreferences(workspaceId: string, membershipId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });

    const settings = (ws?.settings as Record<string, any>) || {};
    const notifPrefs = settings.notificationPreferences || {};
    const defaults = {
      emailNotifications: true,
      inAppNotifications: true,
      browserPushNotifications: true,
      deadlineReminders: true,
      taskAssignmentAlerts: true,
      reviewAlerts: true,
      chatAlerts: true,
      soundEnabled: true,
      soundType: 'chime',
      soundVolume: 0.7,
      taskSoundEnabled: true,
      chatSoundEnabled: true,
    };

    return {
      ...defaults,
      ...(notifPrefs[membershipId] || {}),
    };
  }

  async updatePreferences(
    workspaceId: string,
    membershipId: string,
    preferences: any,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });

    const settings = (ws?.settings as Record<string, any>) || {};
    const notifPrefs = settings.notificationPreferences || {};
    notifPrefs[membershipId] = {
      ...(notifPrefs[membershipId] || {}),
      ...preferences,
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          notificationPreferences: notifPrefs,
        },
      },
    });

    return notifPrefs[membershipId];
  }

  async createNotification(data: {
    workspaceId: string;
    recipientMembershipId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }) {
    try {
      const notif = await this.prisma.notification.create({
        data: {
          workspaceId: data.workspaceId,
          recipientMembershipId: data.recipientMembershipId,
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          link: data.link || null,
          isRead: false,
        },
      });

      return notif;
    } catch (err: any) {
      this.logger.warn(`Failed to create notification: ${err.message}`);
      return null;
    }
  }
}
