import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    getDashboard(@Request() req) {
        return this.analyticsService.getDashboardSummary(req.user.admin_id);
    }

    @Get('survey/:id')
    getSurveyAnalytics(@Param('id') id: string) {
        return this.analyticsService.getSurveyAnalytics(id);
    }

    @Get('survey/:id/location')
    getLocationAnalytics(@Param('id') id: string) {
        return this.analyticsService.getLocationAnalytics(id);
    }

    @Get('question/:id')
    getQuestionAnalytics(@Param('id') id: string) {
        return this.analyticsService.getQuestionAnalytics(id);
    }
}
