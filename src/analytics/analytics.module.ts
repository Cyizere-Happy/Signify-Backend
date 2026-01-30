import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController, AnalyticsDebugController } from './analytics.controller';

@Module({
    controllers: [AnalyticsController, AnalyticsDebugController],
    providers: [AnalyticsService],
})
export class AnalyticsModule { }
