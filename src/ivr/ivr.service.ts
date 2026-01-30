import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface IvrResponse {
  phone_number: string;
  survey_id: string;
  question_id: string;
  response_value: string;
  response_time: Date;
}

export interface IvrCall {
  call_id: string;
  phone_number: string;
  survey_id: string;
  start_time: Date;
  end_time?: Date;
  status: 'active' | 'completed' | 'abandoned';
  current_question_index?: number;
}

@Injectable()
export class IvrService {
  private readonly logger = new Logger(IvrService.name);
  private activeCalls = new Map<string, IvrCall>();

  constructor(private prisma: PrismaService) {}

  // Start IVR call for a survey
  async startIvrCall(phoneNumber: string, surveyId: string): Promise<IvrCall> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const call: IvrCall = {
      call_id: callId,
      phone_number: phoneNumber,
      survey_id: surveyId,
      start_time: new Date(),
      status: 'active',
      current_question_index: 0
    };

    this.activeCalls.set(callId, call);
    
    this.logger.log(`IVR call started: ${callId} for ${phoneNumber} on survey ${surveyId}`);
    
    // In production, this would trigger the actual IVR system
    console.log(`📞 IVR Call Started:`);
    console.log(`   Call ID: ${callId}`);
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Survey: ${surveyId}`);
    console.log(`   Status: Active`);
    
    return call;
  }

  // Get current question for IVR call
  async getCurrentQuestion(callId: string): Promise<any> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    const survey = await this.prisma.survey.findUnique({
      where: { survey_id: call.survey_id },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order_index: 'asc',
          },
        },
      },
    });

    if (!survey || !survey.questions.length) {
      throw new Error('Survey or questions not found');
    }

    const currentQuestionIndex = call.current_question_index || 0;
    
    if (currentQuestionIndex >= survey.questions.length) {
      return null; // Survey completed
    }

    return survey.questions[currentQuestionIndex];
  }

  // Process IVR response
  async processResponse(callId: string, responseValue: string): Promise<any> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    const currentQuestion = await this.getCurrentQuestion(callId);
    if (!currentQuestion) {
      throw new Error('No current question found');
    }

    // Map IVR response to actual answer
    let answerText = '';
    if (currentQuestion.question_type === 'yesno') {
      answerText = responseValue === '1' ? 'Yes' : responseValue === '2' ? 'No' : responseValue;
    } else if (currentQuestion.question_type === 'multiple_choice') {
      const optionIndex = parseInt(responseValue) - 1;
      if (currentQuestion.options[optionIndex]) {
        answerText = currentQuestion.options[optionIndex].option_text;
      }
    } else {
      answerText = responseValue; // For numeric or text responses
    }

    // Create anonymous response for IVR
    const anonymousToken = `ivr_${call.phone_number}_${Date.now()}`;
    
    try {
      // Check if response already exists for this call
      const existingResponse = await this.prisma.response.findFirst({
        where: {
          anonymous_token: anonymousToken,
        },
      });

      let response;
      if (existingResponse) {
        // Add answer to existing response
        response = await this.prisma.answer.create({
          data: {
            answer_text: answerText,
            questionId: currentQuestion.question_id,
            responseId: existingResponse.response_id,
          },
        });
      } else {
        // Create new response
        response = await this.prisma.response.create({
          data: {
            anonymous_token: anonymousToken,
            surveyId: call.survey_id,
            answers: {
              create: {
                answer_text: answerText,
                questionId: currentQuestion.question_id,
              },
            },
          },
        });
      }

      this.logger.log(`IVR response recorded: ${answerText} for question ${currentQuestion.question_id}`);
      
      // Move to next question
      call.current_question_index = (call.current_question_index || 0) + 1;
      
      // Check if survey is completed
      const nextQuestion = await this.getCurrentQuestion(callId);
      if (!nextQuestion) {
        call.status = 'completed';
        call.end_time = new Date();
        this.logger.log(`IVR call completed: ${callId}`);
      }

      return {
        success: true,
        answer_text: answerText,
        next_question: nextQuestion,
        survey_completed: !nextQuestion,
      };
    } catch (error) {
      this.logger.error(`Failed to process IVR response:`, error);
      throw error;
    }
  }

  // End IVR call
  async endCall(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.status = 'abandoned';
      call.end_time = new Date();
      this.logger.log(`IVR call ended: ${callId}`);
    }
  }

  // Get IVR call status
  getCallStatus(callId: string): IvrCall | null {
    return this.activeCalls.get(callId) || null;
  }

  // Get IVR statistics
  async getIvrStatistics(surveyId?: string): Promise<any> {
    const whereClause = surveyId ? { surveyId } : {};
    
    const ivrResponses = await this.prisma.response.findMany({
      where: {
        ...whereClause,
        anonymous_token: {
          startsWith: 'ivr_',
        },
      },
      include: {
        answers: true,
        survey: {
          select: {
            title: true,
          },
        },
      },
    });

    return {
      total_ivr_responses: ivrResponses.length,
      survey_breakdown: surveyId 
        ? null 
        : ivrResponses.reduce((acc, response) => {
            const surveyTitle = response.survey.title;
            acc[surveyTitle] = (acc[surveyTitle] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
      recent_responses: ivrResponses.slice(-10).reverse(),
    };
  }

  // Generate IVR script for survey
  async generateIvrScript(surveyId: string): Promise<string> {
    const survey = await this.prisma.survey.findUnique({
      where: { survey_id: surveyId },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order_index: 'asc',
          },
        },
      },
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    let script = `IVR Script for Survey: ${survey.title}\n`;
    script += `=====================================\n\n`;
    script += `Welcome to the Ministry of Health Survey.\n`;
    script += `Please listen carefully and respond using your phone keypad.\n\n`;

    survey.questions.forEach((question, index) => {
      script += `Question ${index + 1}: ${question.question_text}\n`;
      
      if (question.question_type === 'yesno') {
        script += `Press 1 for Yes\n`;
        script += `Press 2 for No\n`;
      } else if (question.question_type === 'multiple_choice') {
        question.options.forEach((option, optionIndex) => {
          script += `Press ${optionIndex + 1} for ${option.option_text}\n`;
        });
      } else if (question.question_type === 'numeric') {
        script += `Enter the number using your keypad, then press #\n`;
      } else if (question.question_type === 'text') {
        script += `Please record your message after the tone\n`;
      }
      
      script += `\n`;
    });

    script += `Thank you for completing the survey.\n`;
    script += `Your responses help improve community health services.\n`;

    return script;
  }
}
