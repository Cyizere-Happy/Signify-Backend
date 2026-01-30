import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { IvrService } from './ivr.service';

export class StartIvrCallDto {
  phone_number: string;
  survey_id: string;
}

export class ProcessIvrResponseDto {
  call_id: string;
  response_value: string;
}

@Controller('ivr')
export class IvrController {
  constructor(private readonly ivrService: IvrService) {}

  @Post('start')
  async startIvrCall(@Body() startIvrCallDto: StartIvrCallDto) {
    const call = await this.ivrService.startIvrCall(
      startIvrCallDto.phone_number,
      startIvrCallDto.survey_id
    );
    
    return {
      success: true,
      call_id: call.call_id,
      message: 'IVR call started successfully',
      next_question: await this.ivrService.getCurrentQuestion(call.call_id),
    };
  }

  @Post('respond')
  async processResponse(@Body() processIvrResponseDto: ProcessIvrResponseDto) {
    const result = await this.ivrService.processResponse(
      processIvrResponseDto.call_id,
      processIvrResponseDto.response_value
    );
    
    return {
      success: true,
      ...result,
    };
  }

  @Get('question/:callId')
  async getCurrentQuestion(@Param('callId') callId: string) {
    const question = await this.ivrService.getCurrentQuestion(callId);
    
    return {
      success: true,
      question,
      survey_completed: !question,
    };
  }

  @Post('end/:callId')
  async endCall(@Param('callId') callId: string) {
    await this.ivrService.endCall(callId);
    
    return {
      success: true,
      message: 'IVR call ended',
    };
  }

  @Get('status/:callId')
  getCallStatus(@Param('callId') callId: string) {
    const status = this.ivrService.getCallStatus(callId);
    
    return {
      success: true,
      call_status: status,
    };
  }

  @Get('statistics')
  async getIvrStatistics(@Query('survey_id') surveyId?: string) {
    const stats = await this.ivrService.getIvrStatistics(surveyId);
    
    return {
      success: true,
      statistics: stats,
    };
  }

  @Get('script/:surveyId')
  async generateIvrScript(@Param('surveyId') surveyId: string) {
    const script = await this.ivrService.generateIvrScript(surveyId);
    
    return {
      success: true,
      script,
    };
  }

  @Get('test/:surveyId')
  async testIvrCall(@Param('surveyId') surveyId: string) {
    // Simulate a test IVR call
    const testPhoneNumber = '+250788123456';
    
    const call = await this.ivrService.startIvrCall(testPhoneNumber, surveyId);
    
    console.log(`📞 Test IVR Call Simulation:`);
    console.log(`   Call ID: ${call.call_id}`);
    console.log(`   Phone: ${testPhoneNumber}`);
    console.log(`   Survey: ${surveyId}`);
    
    // Simulate some responses
    const responses = ['1', '2', '1']; // Yes, No, Yes
    
    for (const response of responses) {
      const result = await this.ivrService.processResponse(call.call_id, response);
      console.log(`   Response: ${response} -> ${result.answer_text}`);
      
      if (result.survey_completed) {
        break;
      }
    }
    
    return {
      success: true,
      message: 'Test IVR call completed',
      call_id: call.call_id,
      test_responses: responses,
    };
  }
}
