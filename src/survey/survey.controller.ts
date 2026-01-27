import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { SurveyService } from './survey.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('surveys')
export class SurveyController {
    constructor(private readonly surveyService: SurveyService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createSurveyDto: CreateSurveyDto, @Request() req) {
        return this.surveyService.create(createSurveyDto, req.user.admin_id);
    }

    @Get()
    findAll(@Query('country') country?: string, @Query('district') district?: string, @Query('sector') sector?: string) {
        if (country && district && sector) {
            return this.surveyService.findByLocation(country, district, sector);
        }
        return this.surveyService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.surveyService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateSurveyDto: UpdateSurveyDto,
        @Request() req,
    ) {
        return this.surveyService.update(id, updateSurveyDto, req.user.admin_id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.surveyService.remove(id, req.user.admin_id);
    }
}
