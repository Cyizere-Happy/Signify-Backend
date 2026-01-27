import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ResponseService {
    constructor(private prisma: PrismaService) { }

    private generateAnonymousToken(): string {
        return randomBytes(32).toString('hex');
    }

    async create(createResponseDto: CreateResponseDto) {
        // Check if survey exists and is active in the user's location
        const survey = await this.prisma.survey.findFirst({
            where: {
                survey_id: createResponseDto.survey_id,
                status: 'active',
                locations: {
                    some: {
                        country: createResponseDto.country,
                        district: createResponseDto.district,
                        sector: createResponseDto.sector,
                    },
                },
                start_date: {
                    lte: new Date(),
                },
                end_date: {
                    gte: new Date(),
                },
            },
            include: {
                questions: true,
            },
        });

        if (!survey) {
            throw new NotFoundException('Survey not found or not available in your location');
        }

        // Validate that all required questions are answered
        const requiredQuestions = survey.questions.filter(q => q.is_required);
        const answeredQuestionIds = createResponseDto.answers.map(a => a.question_id);

        const missingRequired = requiredQuestions.filter(
            q => !answeredQuestionIds.includes(q.question_id)
        );

        if (missingRequired.length > 0) {
            throw new BadRequestException('All required questions must be answered');
        }

        const anonymousToken = this.generateAnonymousToken();

        return this.prisma.response.create({
            data: {
                anonymous_token: anonymousToken,
                country: createResponseDto.country,
                district: createResponseDto.district,
                sector: createResponseDto.sector,
                surveyId: createResponseDto.survey_id,
                answers: {
                    create: createResponseDto.answers.map(answer => ({
                        answer_text: answer.answer_text,
                        questionId: answer.question_id,
                    })),
                },
            },
            include: {
                answers: {
                    include: {
                        question: true,
                    },
                },
            },
        });
    }

    async findAll() {
        return this.prisma.response.findMany({
            include: {
                answers: {
                    include: {
                        question: true,
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
    }

    async findBySurvey(surveyId: string) {
        return this.prisma.response.findMany({
            where: { surveyId },
            include: {
                answers: {
                    include: {
                        question: {
                            select: {
                                question_id: true,
                                question_text: true,
                                question_type: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const response = await this.prisma.response.findUnique({
            where: { response_id: id },
            include: {
                answers: {
                    include: {
                        question: true,
                    },
                },
                survey: true,
            },
        });

        if (!response) {
            throw new NotFoundException('Response not found');
        }

        return response;
    }
}
