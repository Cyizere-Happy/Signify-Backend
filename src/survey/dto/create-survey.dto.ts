import { IsNotEmpty, IsString, IsDateString, IsArray, ValidateNested, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionOptionDto {
    @IsNotEmpty()
    @IsString()
    option_text: string;
}

class QuestionDto {
    @IsNotEmpty()
    @IsString()
    question_text: string;

    @IsNotEmpty()
    @IsString()
    question_type: string;

    @IsBoolean()
    is_required: boolean;

    @IsInt()
    order_index: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionOptionDto)
    options?: QuestionOptionDto[];
}

class SurveyLocationDto {
    @IsNotEmpty()
    @IsString()
    country: string;

    @IsNotEmpty()
    @IsString()
    district: string;

    @IsNotEmpty()
    @IsString()
    sector: string;
}

export class CreateSurveyDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsString()
    status: string;

    @IsNotEmpty()
    @IsDateString()
    start_date: string;

    @IsNotEmpty()
    @IsDateString()
    end_date: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionDto)
    questions: QuestionDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SurveyLocationDto)
    locations: SurveyLocationDto[];
}
