import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import type { CreateNotificationDto, Notification, NotificationStats } from './notification.service';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(): Promise<Notification[]> {
    return this.notificationService.findAll();
  }

  @Get('stats')
  async getStats(): Promise<NotificationStats> {
    return this.notificationService.getStats();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Get('user/:userId')
  async getUserNotifications(@Param('userId') userId: string): Promise<any[]> {
    return this.notificationService.getUserNotifications(userId);
  }

  @Post('user/:userNotificationId/read')
  @HttpCode(HttpStatus.OK)
  async markNotificationAsRead(@Param('userNotificationId') userNotificationId: string): Promise<{ success: boolean; message: string }> {
    await this.notificationService.markNotificationAsRead(userNotificationId);
    return { success: true, message: 'Notification marked as read' };
  }

  @Post('survey/:surveyId')
  @HttpCode(HttpStatus.CREATED)
  async createSurveyNotification(
    @Param('surveyId') surveyId: string,
    @Body('surveyTitle') surveyTitle: string,
  ): Promise<void> {
    return this.notificationService.createSurveyNotification(surveyId, surveyTitle);
  }

  @Post('response/:responseId')
  @HttpCode(HttpStatus.CREATED)
  async createResponseNotification(
    @Param('responseId') responseId: string,
    @Body('surveyTitle') surveyTitle: string,
  ): Promise<void> {
    return this.notificationService.createResponseNotification(responseId, surveyTitle);
  }
}
