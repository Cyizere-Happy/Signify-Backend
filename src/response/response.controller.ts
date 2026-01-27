import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ResponseService } from './response.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('responses')
export class ResponseController {
    constructor(private readonly responseService: ResponseService) { }

    @Post()
    create(@Body() createResponseDto: CreateResponseDto) {
        return this.responseService.create(createResponseDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Query('surveyId') surveyId?: string) {
        if (surveyId) {
            return this.responseService.findBySurvey(surveyId);
        }
        return this.responseService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.responseService.findOne(id);
    }
}
