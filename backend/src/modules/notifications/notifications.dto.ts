export class PushSubscriptionDto {
  endpoint!: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export class NotificationPreferencesDto {
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  browserPushNotifications?: boolean;
  deadlineReminders?: boolean;
  taskAssignmentAlerts?: boolean;
  reviewAlerts?: boolean;
}
