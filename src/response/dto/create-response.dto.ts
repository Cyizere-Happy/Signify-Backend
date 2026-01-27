import { IsNotEmpty, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
    @IsNotEmpty()
    @IsString()
    question_id: string;

    @IsNotEmpty()
    @IsString()
    answer_text: string;
}

export class CreateResponseDto {
    @IsNotEmpty()
    @IsString()
    survey_id: string;

    @IsNotEmpty()
    @IsString()
    country: string;

    @IsNotEmpty()
    @IsString()
    district: string;

    @IsNotEmpty()
    @IsString()
    sector: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnswerDto)
    answers: AnswerDto[];
}
