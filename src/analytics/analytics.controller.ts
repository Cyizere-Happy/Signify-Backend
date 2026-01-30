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

    @Get('location-stats')
    @UseGuards(JwtAuthGuard)
    async getLocationStats() {
        return this.analyticsService.getLocationStats();
    }

    @Get('district/:districtName')
    getDistrictDetails(@Param('districtName') districtName: string) {
        return this.analyticsService.getDistrictDetails(districtName);
    }

    @Get('trend-data')
    getTrendData() {
        return this.analyticsService.getTrendData();
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

// Public controller for debugging
@Controller('analytics-debug')
export class AnalyticsDebugController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('location-stats')
    async getLocationStatsDebug() {
        // Public endpoint for debugging
        return this.analyticsService.getLocationStats();
    }

    @Get('questions')
    async getQuestionsDebug() {
        // Check what questions exist
        const questions = await this.analyticsService['prisma'].question.findMany({
            include: {
                answers: {
                    take: 5,
                    include: {
                        response: true
                    }
                }
            }
        });
        return questions;
    }

    @Get('responses')
    async getResponsesDebug() {
        // Check what responses exist
        const responses = await this.analyticsService['prisma'].response.findMany({
            take: 10,
            include: {
                answers: {
                    include: {
                        question: true
                    }
                }
            }
        });
        return responses;
    }
}
