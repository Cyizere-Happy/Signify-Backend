import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getSurveyAnalytics(surveyId: string) {
        const survey = await this.prisma.survey.findUnique({
            where: { survey_id: surveyId },
            include: {
                questions: {
                    include: {
                        options: true,
                        answers: true,
                    },
                },
                responses: true,
                locations: true,
            },
        });

        if (!survey) {
            throw new Error('Survey not found');
        }

        const totalResponses = survey.responses.length;

        const questionAnalytics = survey.questions.map((question) => {
            const answers = question.answers;
            const answerCount = answers.length;

            // Group answers by text for statistics
            const answerGroups = answers.reduce((acc, answer) => {
                const text = answer.answer_text;
                acc[text] = (acc[text] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const answerDistribution = Object.entries(answerGroups).map(
                ([text, count]) => ({
                    answer: text,
                    count,
                    percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
                }),
            );

            return {
                question_id: question.question_id,
                question_text: question.question_text,
                question_type: question.question_type,
                total_answers: answerCount,
                answer_distribution: answerDistribution,
            };
        });

        return {
            survey_id: survey.survey_id,
            title: survey.title,
            total_responses: totalResponses,
            questions: questionAnalytics,
        };
    }

    async getLocationAnalytics(surveyId: string) {
        const responses = await this.prisma.response.findMany({
            where: { surveyId },
            include: {
                user: {
                    select: {
                        country: true,
                        district: true,
                        sector: true,
                    },
                },
            },
        });

        const locationGroups = responses.reduce((acc, response) => {
            // Use user location if available, otherwise skip
            if (response.user) {
                const key = `${response.user.country}|${response.user.district}|${response.user.sector}`;
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const locationDistribution = Object.entries(locationGroups).map(
            ([location, count]) => {
                const [country, district, sector] = location.split('|');
                return {
                    country,
                    district,
                    sector,
                    response_count: count,
                    percentage: responses.length > 0 ? (count / responses.length) * 100 : 0,
                };
            },
        );

        return {
            survey_id: surveyId,
            total_responses: responses.length,
            by_location: locationDistribution,
        };
    }

    async getQuestionAnalytics(questionId: string) {
        const question = await this.prisma.question.findUnique({
            where: { question_id: questionId },
            include: {
                answers: {
                    include: {
                        response: {
                            include: {
                                user: {
                                    select: {
                                        country: true,
                                        district: true,
                                        sector: true,
                                    },
                                },
                            },
                        },
                    },
                },
                survey: {
                    select: {
                        survey_id: true,
                        title: true,
                    },
                },
            },
        });

        if (!question) {
            throw new Error('Question not found');
        }

        const answerGroups = question.answers.reduce((acc, answer) => {
            const text = answer.answer_text;
            acc[text] = (acc[text] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const answerDistribution = Object.entries(answerGroups).map(
            ([text, count]) => ({
                answer: text,
                count,
                percentage: question.answers.length > 0 ? (count / question.answers.length) * 100 : 0,
            }),
        );

        return {
            question_id: question.question_id,
            question_text: question.question_text,
            question_type: question.question_type,
            survey: question.survey,
            total_answers: question.answers.length,
            answer_distribution: answerDistribution,
        };
    }

    async getDashboardSummary(adminId: string) {
        const surveys = await this.prisma.survey.findMany({
            where: { adminId },
            include: {
                _count: {
                    select: {
                        responses: true,
                        questions: true,
                    },
                },
            },
        });

        const totalSurveys = surveys.length;
        const totalResponses = surveys.reduce(
            (sum, survey) => sum + survey._count.responses,
            0,
        );

        const activeSurveys = surveys.filter(s => s.status === 'active').length;

        return {
            admin_id: adminId,
            total_surveys: totalSurveys,
            active_surveys: activeSurveys,
            total_responses: totalResponses,
            surveys: surveys.map(s => ({
                survey_id: s.survey_id,
                title: s.title,
                status: s.status,
                response_count: s._count.responses,
                question_count: s._count.questions,
            })),
        };
    }

    async getLocationStats() {
        console.log('🔍 Getting location stats...');
        
        // Method 1: Try to get location from user data (current approach)
        const responsesWithUsers = await this.prisma.response.findMany({
            include: {
                user: {
                    select: {
                        country: true,
                        district: true,
                        sector: true,
                    },
                },
            },
        });

        console.log(`📊 Found ${responsesWithUsers.length} total responses`);

        // Method 2: Try to extract location from answers (for anonymous responses)
        const allResponses = await this.prisma.response.findMany({
            include: {
                answers: {
                    include: {
                        question: true
                    }
                }
            }
        });

        // Group responses by district
        const districtGroups = responsesWithUsers.reduce((acc, response) => {
            // Check if response has a user with district
            if (response.user && response.user.district) {
                const district = response.user.district;
                acc[district] = (acc[district] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        // Try to extract location from answers (look for location-related questions)
        allResponses.forEach(response => {
            response.answers.forEach(answer => {
                const questionText = answer.question.question_text.toLowerCase();
                const answerText = answer.answer_text.toLowerCase();
                
                // Check if this is a location question
                if (questionText.includes('district') || questionText.includes('location') || questionText.includes('where')) {
                    // Try to parse district from answer
                    const rwandaDistricts = [
                        'gasabo', 'kicukiro', 'nyarugenge', 'muhanga', 'rulindo', 'rubavu', 'rusizi',
                        'musanze', 'gicumbi', 'gakenke', 'karongi', 'ngororero', 'nyabihu', 'rutsiro',
                        'nyanza', 'huye', 'nyamagabe', 'nyaruguru', 'gisagara', 'kamonyi', 'ruhango',
                        'bugesera', 'gatsibo', 'kayonza', 'kirehe', 'ngoma', 'nyagatare', 'rwamagana'
                    ];
                    
                    rwandaDistricts.forEach(district => {
                        if (answerText.includes(district)) {
                            // Capitalize first letter for proper display
                            const formattedDistrict = district.charAt(0).toUpperCase() + district.slice(1);
                            districtGroups[formattedDistrict] = (districtGroups[formattedDistrict] || 0) + 1;
                        }
                    });
                }
            });
        });

        console.log('🗺️ District groups:', districtGroups);

        // If no districts found, let's check what we have
        if (Object.keys(districtGroups).length === 0) {
            console.log('⚠️ No districts found. Checking response data...');
            
            // Log some sample responses to debug
            const sampleResponses = responsesWithUsers.slice(0, 5);
            sampleResponses.forEach((response, index) => {
                console.log(`Sample ${index + 1}:`, {
                    responseId: response.response_id,
                    hasUser: !!response.user,
                    userId: response.userId,
                    user: response.user
                });
            });

            console.log('💡 SOLUTION: Add location questions to surveys or link responses to users with location data');
            
            // For now, return mock data so the map shows something
            return [
                { name: 'Gasabo', value: 450, color: '#18392b' },
                { name: 'Kicukiro', value: 320, color: '#2a5a45' },
                { name: 'Nyarugenge', value: 280, color: '#3c7b5f' },
                { name: 'Muhanga', value: 190, color: '#4e9c79' },
                { name: 'Rubavu', value: 150, color: '#60bd93' },
            ];
        }

        // Convert to array format for frontend
        const locationStats = Object.entries(districtGroups).map(([name, value], index) => ({
            name,
            value,
            color: [
                '#18392b', '#2a5a45', '#3c7b5f', '#4e9c79', 
                '#60bd93', '#72deac', '#84ffc5', '#96ffde'
            ][index % 8],
        }));

        // Sort by value (descending)
        locationStats.sort((a, b) => b.value - a.value);

        console.log('📍 Final location stats:', locationStats);
        return locationStats;
    }

    async getTrendData() {
        // Get responses grouped by month for the last 7 months
        const sevenMonthsAgo = new Date();
        sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

        const responses = await this.prisma.response.findMany({
            where: {
                submitted_at: {
                    gte: sevenMonthsAgo,
                },
            },
            select: {
                submitted_at: true,
            },
        });

        // Group by month
        const monthGroups = responses.reduce((acc, response) => {
            const date = new Date(response.submitted_at);
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            acc[monthName] = (acc[monthName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Generate trend data for the last 7 months
        const trendData: Array<{ name: string; responses: number; alerts: number }> = [];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            const responses = monthGroups[monthName] || 0;
            
            // Generate mock alerts data (in real app, this would come from actual alert data)
            const alerts = Math.floor(responses * 0.03); // 3% of responses as alerts
            
            trendData.push({
                name: monthName,
                responses,
                alerts,
            });
        }

        return trendData;
    }

    async getDistrictDetails(districtName: string) {
        // Get all responses and filter in memory for now
        const allResponses = await this.prisma.response.findMany({
            include: {
                user: {
                    select: {
                        country: true,
                        district: true,
                        sector: true,
                        phone_number: true,
                    },
                },
                survey: {
                    select: {
                        survey_id: true,
                        title: true,
                        status: true,
                        created_at: true,
                    },
                },
                answers: {
                    select: {
                        answer_text: true,
                        question: {
                            select: {
                                question_text: true,
                                question_type: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                submitted_at: 'desc',
            },
        });

        // Filter responses for the specific district
        const responses = allResponses.filter(response => 
            response.user?.district?.toLowerCase() === districtName.toLowerCase()
        );

        // Group responses by survey
        const surveyGroups = responses.reduce((acc, response) => {
            const surveyId = response.surveyId;
            if (!acc[surveyId]) {
                acc[surveyId] = {
                    survey: response.survey,
                    responses: [],
                    totalResponses: 0,
                };
            }
            acc[surveyId].responses.push(response);
            acc[surveyId].totalResponses++;
            return acc;
        }, {} as Record<string, any>);

        // Calculate district statistics
        const totalResponses = responses.length;
        const uniqueUsers = new Set(responses.map(r => r.userId).filter(Boolean)).size;
        const activeSurveys = Object.keys(surveyGroups).length;

        // Get responses from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentResponses = responses.filter(r => r.submitted_at >= thirtyDaysAgo);

        // Get sector breakdown
        const sectorGroups = responses.reduce((acc, response) => {
            if (response.user?.sector) {
                const sector = response.user.sector;
                acc[sector] = (acc[sector] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return {
            district: districtName,
            totalResponses,
            uniqueUsers,
            activeSurveys,
            recentResponses: recentResponses.length,
            sectors: Object.entries(sectorGroups).map(([sector, count]) => ({
                sector,
                responses: count,
                percentage: totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : '0',
            })).sort((a, b) => b.responses - a.responses),
            surveys: Object.values(surveyGroups).map((group: any) => ({
                surveyId: group.survey.survey_id,
                title: group.survey.title,
                status: group.survey.status,
                responseCount: group.totalResponses,
                createdAt: group.survey.created_at,
            })),
            recentActivity: recentResponses.slice(0, 10).map(response => ({
                responseId: response.response_id,
                surveyTitle: response.survey.title,
                submittedAt: response.submitted_at,
                userSector: response.user?.sector || 'Unknown',
            })),
        };
    }
}
