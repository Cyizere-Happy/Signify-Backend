import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SurveyModule } from './survey/survey.module';
import { ResponseModule } from './response/response.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [AuthModule, AdminModule, SurveyModule, ResponseModule, AnalyticsModule, CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
