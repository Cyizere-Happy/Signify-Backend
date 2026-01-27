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
            select: {
                country: true,
                district: true,
                sector: true,
            },
        });

        const locationGroups = responses.reduce((acc, response) => {
            const key = `${response.country}|${response.district}|${response.sector}`;
            acc[key] = (acc[key] || 0) + 1;
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
                            select: {
                                country: true,
                                district: true,
                                sector: true,
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
}
