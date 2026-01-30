import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class SurveyService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private smsService: SmsService
    ) { }

    async create(createSurveyDto: CreateSurveyDto, adminId: string) {
        const survey = await this.prisma.survey.create({
            data: {
                title: createSurveyDto.title,
                description: createSurveyDto.description,
                status: createSurveyDto.status,
                start_date: new Date(createSurveyDto.start_date),
                end_date: new Date(createSurveyDto.end_date),
                adminId: adminId,
                questions: {
                    create: createSurveyDto.questions.map((q) => ({
                        question_text: q.question_text,
                        question_type: q.question_type,
                        is_required: q.is_required,
                        order_index: q.order_index,
                        options: {
                            create: q.options || [],
                        },
                    })),
                },
                locations: {
                    create: createSurveyDto.locations,
                },
            },
            include: {
                questions: {
                    include: {
                        options: true,
                    },
                },
                locations: true,
                admin: {
                    select: {
                        admin_id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Create notification for new survey if it's active
        if (survey.status === 'active') {
            await this.notificationService.createSurveyNotification(
                survey.survey_id,
                survey.title,
                createSurveyDto.locations
            );

            // Send SMS notifications to users in survey locations
            try {
                const smsResults = await this.smsService.sendSurveyNotification(
                    survey.title,
                    createSurveyDto.locations
                );
                console.log(`SMS notification sent for survey "${survey.title}": ${smsResults.success} sent, ${smsResults.failed} failed`);
            } catch (error) {
                console.error('Failed to send SMS notifications for survey:', error);
                // Don't fail the survey creation if SMS fails
            }
        }

        return survey;
    }

    async findAll() {
        return this.prisma.survey.findMany({
            include: {
                questions: {
                    include: {
                        options: true,
                    },
                    orderBy: {
                        order_index: 'asc',
                    },
                },
                locations: true,
                admin: {
                    select: {
                        admin_id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        responses: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const survey = await this.prisma.survey.findUnique({
            where: { survey_id: id },
            include: {
                questions: {
                    include: {
                        options: true,
                    },
                    orderBy: {
                        order_index: 'asc',
                    },
                },
                locations: true,
                admin: {
                    select: {
                        admin_id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        responses: true,
                    },
                },
            },
        });

        if (!survey) {
            throw new NotFoundException('Survey not found');
        }

        return survey;
    }

    async findByLocation(country: string, district: string, sector: string) {
        console.log("Hit", { country, district, sector });
        const result = await this.prisma.survey.findMany({
            where: {
                status: 'active',
                locations: {
                    some: {
                        country,
                        district,
                        sector,
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
                questions: {
                    include: {
                        options: true,
                    },
                    orderBy: {
                        order_index: 'asc',
                    },
                },
                locations: true,
            },
        });
        console.log("Query result:", result.length, "surveys found");
        return result;
    }

    async update(id: string, updateSurveyDto: UpdateSurveyDto, adminId: string) {
        const survey = await this.findOne(id);

        if (survey.adminId !== adminId) {
            throw new ForbiddenException('You can only update your own surveys');
        }

        const data: any = { ...updateSurveyDto };

        if (updateSurveyDto.start_date) {
            data.start_date = new Date(updateSurveyDto.start_date);
        }

        if (updateSurveyDto.end_date) {
            data.end_date = new Date(updateSurveyDto.end_date);
        }

        if (updateSurveyDto.locations) {
            await this.prisma.surveyLocation.deleteMany({
                where: { surveyId: id },
            });
            data.locations = {
                create: updateSurveyDto.locations,
            };
        }

        return this.prisma.survey.update({
            where: { survey_id: id },
            data,
            include: {
                questions: {
                    include: {
                        options: true,
                    },
                },
                locations: true,
                admin: {
                    select: {
                        admin_id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    async remove(id: string, adminId: string) {
        const survey = await this.findOne(id);

        if (survey.adminId !== adminId) {
            throw new ForbiddenException('You can only delete your own surveys');
        }

        // Delete related records first due to foreign key constraints
        await this.prisma.$transaction(async (tx) => {
            // Delete survey locations
            await tx.surveyLocation.deleteMany({
                where: { surveyId: id }
            });

            // Delete answers first (they depend on questions)
            await tx.answer.deleteMany({
                where: {
                    question: {
                        surveyId: id
                    }
                }
            });

            // Delete question options first (they depend on questions)
            await tx.questionOption.deleteMany({
                where: {
                    question: {
                        surveyId: id
                    }
                }
            });

            // Delete questions (now that options and answers are deleted)
            await tx.question.deleteMany({
                where: { surveyId: id }
            });

            // Delete responses related to this survey
            await tx.response.deleteMany({
                where: { surveyId: id }
            });

            // Finally delete the survey
            return tx.survey.delete({
                where: { survey_id: id }
            });
        });
    }
}
