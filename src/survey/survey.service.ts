import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';

@Injectable()
export class SurveyService {
    constructor(private prisma: PrismaService) { }

    async create(createSurveyDto: CreateSurveyDto, adminId: string) {
        return this.prisma.survey.create({
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
        return this.prisma.survey.findMany({
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

        return this.prisma.survey.delete({
            where: { survey_id: id },
        });
    }
}
