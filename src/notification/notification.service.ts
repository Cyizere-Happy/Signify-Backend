import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface CreateNotificationDto {
  title: string;
  message: string;
  type: 'survey' | 'alert' | 'info' | 'reminder';
  target_audience: 'all' | 'volunteers' | 'health_officers' | 'district_managers';
  delivery_method: 'sms' | 'push' | 'email' | 'in_app';
  scheduled_at?: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'survey' | 'alert' | 'info' | 'reminder';
  target_audience: 'all' | 'volunteers' | 'health_officers' | 'district_managers';
  delivery_method: 'sms' | 'push' | 'email' | 'in_app';
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  delivery_rate: number | null;
  created_at: Date;
  scheduled_at?: Date;
  sent_at?: Date;
}

export interface NotificationStats {
  total_sent: number;
  total_pending: number;
  total_failed: number;
  delivery_rate: number;
  gateway_status: 'online' | 'offline';
  credits_remaining: number;
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto, adminId?: string): Promise<Notification> {
    // If no adminId provided, get or create a default admin
    if (!adminId) {
      adminId = await this.getOrCreateDefaultAdmin();
    }

    const notification = await this.prisma.notification.create({
      data: {
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        type: createNotificationDto.type,
        target_audience: createNotificationDto.target_audience,
        delivery_method: createNotificationDto.delivery_method,
        scheduled_at: createNotificationDto.scheduled_at,
        adminId: adminId,
      },
    });

    return this.mapToNotificationInterface(notification);
  }

  async findAll(): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      orderBy: { created_at: 'desc' },
      take: 50, // Limit to last 50 notifications
    });

    return notifications.map(this.mapToNotificationInterface);
  }

  async findOne(id: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { notification_id: id },
    });

    return notification ? this.mapToNotificationInterface(notification) : null;
  }

  async getStats(): Promise<NotificationStats> {
    const [totalSent, totalPending, totalFailed] = await Promise.all([
      this.prisma.notification.count({ where: { status: 'sent' } }),
      this.prisma.notification.count({ where: { status: 'pending' } }),
      this.prisma.notification.count({ where: { status: 'failed' } }),
    ]);

    const totalNotifications = totalSent + totalPending + totalFailed;
    const deliveryRate = totalNotifications > 0 ? totalSent / totalNotifications : 0;

    return {
      total_sent: totalSent,
      total_pending: totalPending,
      total_failed: totalFailed,
      delivery_rate: deliveryRate,
      gateway_status: 'online', // Mock value - in real app would check actual gateway
      credits_remaining: 42500, // Mock value - in real app would check actual credits
    };
  }

  async createSurveyNotification(surveyId: string, surveyTitle: string, surveyLocations?: Array<{ country: string; district: string; sector: string }>): Promise<void> {
    const adminId = await this.getOrCreateDefaultAdmin();

    // Create the main notification
    const notification = await this.create({
      title: 'New Health Survey',
      message: `A new health survey "${surveyTitle}" is available in your area. Takes less than 2 minutes.`,
      type: 'survey',
      target_audience: 'all',
      delivery_method: 'in_app',
    }, adminId);

    // If survey locations are provided, create user-specific notifications
    if (surveyLocations && surveyLocations.length > 0) {
      await this.createUserNotificationsForSurvey(notification.id, surveyLocations);
    }
  }

  private async createUserNotificationsForSurvey(notificationId: string, surveyLocations: Array<{ country: string; district: string; sector: string }>): Promise<void> {
    // Find users in the survey locations
    const locationConditions = surveyLocations.map(location => ({
      country: location.country,
      district: location.district,
      sector: location.sector,
    }));

    const users = await this.prisma.user.findMany({
      where: {
        is_active: true,
        OR: locationConditions,
      },
      select: {
        user_id: true,
      },
    });

    // Create user notifications for each user in the survey locations
    if (users.length > 0) {
      // First get the notification details to include in user notifications
      const notification = await this.prisma.notification.findUnique({
        where: { notification_id: notificationId },
        select: { title: true, message: true, type: true }
      });

      if (!notification) {
        console.error('Notification not found:', notificationId);
        return;
      }

      const userNotifications = users.map(user => ({
        user_id: user.user_id,
        notification_id: notificationId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        is_read: false,
      }));

      await this.prisma.userNotification.createMany({
        data: userNotifications,
      });

      console.log(`Created ${userNotifications.length} user notifications for survey in locations: ${JSON.stringify(surveyLocations)}`);
    } else {
      console.log(`No users found in survey locations: ${JSON.stringify(surveyLocations)}`);
    }
  }

  async createResponseNotification(responseId: string, surveyTitle: string): Promise<void> {
    const adminId = await this.getOrCreateDefaultAdmin();

    await this.create({
      title: 'Thank You',
      message: `Your response for "${surveyTitle}" was received. Thank you for helping your community.`,
      type: 'info',
      target_audience: 'volunteers',
      delivery_method: 'in_app',
    }, adminId);
  }

  private async getOrCreateDefaultAdmin(): Promise<string> {
    let admin = await this.prisma.admin.findFirst();
    
    if (!admin) {
      admin = await this.prisma.admin.create({
        data: {
          name: 'System Admin',
          email: 'admin@signify.com',
          password_hash: 'hashed_password', // In real app, this would be properly hashed
        },
      });
    }
    
    return admin.admin_id;
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    const userNotifications = await this.prisma.userNotification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return userNotifications.map(un => ({
      user_notification_id: un.user_notification_id,
      user_id: un.user_id,
      notification_id: un.notification_id,
      title: un.title,
      message: un.message,
      type: un.type,
      is_read: un.is_read,
      created_at: un.created_at.toISOString(),
      read_at: un.read_at?.toISOString(),
    }));
  }

  async markNotificationAsRead(userNotificationId: string): Promise<void> {
    await this.prisma.userNotification.update({
      where: { user_notification_id: userNotificationId },
      data: { 
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  private mapToNotificationInterface(notification: any): Notification {
    return {
      id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      type: notification.type as any,
      target_audience: notification.target_audience as any,
      delivery_method: notification.delivery_method as any,
      status: notification.status as any,
      delivery_rate: notification.delivery_rate,
      created_at: notification.created_at,
      scheduled_at: notification.scheduled_at || undefined,
      sent_at: notification.sent_at || undefined,
    };
  }
}
