import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SurveyModule } from './survey/survey.module';
import { ResponseModule } from './response/response.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CommonModule } from './common/common.module';
import { NotificationModule } from './notification/notification.module';
import { UserModule } from './user/user.module';
import { SmsModule } from './sms/sms.module';
import { IvrModule } from './ivr/ivr.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AuthModule, AdminModule, SurveyModule, ResponseModule, AnalyticsModule, CommonModule, NotificationModule, UserModule, SmsModule, IvrModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
