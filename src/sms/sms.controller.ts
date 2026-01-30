import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { IsString, IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SmsService } from './sms.service';

export class SendSmsDto {
  @IsString()
  @IsNotEmpty()
  phone_number: string;
  
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SendBulkSmsDto {
  @IsArray()
  @IsNotEmpty()
  phone_numbers: string[];
  
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  country: string;
  
  @IsString()
  @IsNotEmpty()
  district: string;
  
  @IsString()
  @IsNotEmpty()
  sector: string;
}

export class SendSurveyNotificationDto {
  @IsString()
  @IsNotEmpty()
  survey_title: string;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  survey_locations: LocationDto[];
}

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    const success = await this.smsService.sendSms(sendSmsDto);
    return {
      success,
      message: success ? 'SMS sent successfully' : 'Failed to send SMS',
    };
  }

  @Post('send-bulk')
  async sendBulkSms(@Body() sendBulkSmsDto: SendBulkSmsDto) {
    const results = await this.smsService.sendBulkSms(
      sendBulkSmsDto.phone_numbers,
      sendBulkSmsDto.message
    );
    return {
      results,
      message: `Bulk SMS completed: ${results.success} sent, ${results.failed} failed`,
    };
  }

  @Post('survey-notification')
  async sendSurveyNotification(@Body() sendSurveyNotificationDto: SendSurveyNotificationDto) {
    const results = await this.smsService.sendSurveyNotification(
      sendSurveyNotificationDto.survey_title,
      sendSurveyNotificationDto.survey_locations
    );
    return {
      results,
      message: `Survey notification SMS completed: ${results.success} sent, ${results.failed} failed`,
    };
  }

  @Post('general-notification')
  async sendGeneralNotification(
    @Body() body: { message: string; target_locations?: Array<{ country: string; district: string; sector: string }> }
  ) {
    const results = await this.smsService.sendGeneralNotification(
      body.message,
      body.target_locations
    );
    return {
      results,
      message: `General notification SMS completed: ${results.success} sent, ${results.failed} failed`,
    };
  }

  @Get('test')
  async testSms() {
    // Test SMS to a default number
    const testResult = await this.smsService.sendSms({
      phone_number: '+250788123456',
      message: '🧪 Test SMS from Signify System - SMS service is working correctly!',
    });
    
    return {
      success: testResult,
      message: testResult ? 'Test SMS sent successfully' : 'Test SMS failed',
    };
  }

  @Get('status')
  async getTwilioStatus() {
    return this.smsService.getTwilioStatus();
  }
}
