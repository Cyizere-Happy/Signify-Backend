import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Twilio } from 'twilio';

export interface SendSmsDto {
  phone_number: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio;
  private readonly twilioNumber: string;

  constructor(private prisma: PrismaService) {
    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890'; // Your Twilio phone number

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized');
    } else {
      this.logger.warn('Twilio credentials not found. SMS will be logged to console only.');
    }
  }

  async sendSms(smsDto: SendSmsDto): Promise<boolean> {
    try {
      // Validate and format phone number
      const formattedPhone = this.validatePhoneNumber(smsDto.phone_number);
      
      if (this.twilioClient) {
        // Send real SMS via Twilio
        const message = await this.twilioClient.messages.create({
          body: smsDto.message,
          from: this.twilioNumber,
          to: formattedPhone,
        });

        this.logger.log(`✅ SMS sent via Twilio to ${formattedPhone}`);
        this.logger.log(`Message SID: ${message.sid}`);
        
        return true;
      } else {
        // Fallback to console logging
        this.logger.log(`📱 SMS Sent to ${formattedPhone}:`);
        this.logger.log(`Message: ${smsDto.message}`);
        console.log(`📱 SMS Sent to ${formattedPhone}:`);
        console.log(`Message: ${smsDto.message}`);
        
        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${smsDto.phone_number}:`, error);
      return false;
    }
  }

  async sendBulkSms(phoneNumbers: string[], message: string): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };
    
    for (const phone of phoneNumbers) {
      const success = await this.sendSms({ phone_number: phone, message });
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
    }
    
    this.logger.log(`Bulk SMS completed: ${results.success} sent, ${results.failed} failed`);
    return results;
  }

  async sendSurveyNotification(surveyTitle: string, surveyLocations: Array<{ country: string; district: string; sector: string }>): Promise<{ success: number; failed: number }> {
    // Get all users in the survey locations
    const locationConditions = surveyLocations.map(location => ({
      country: location.country,
      district: location.district,
      sector: location.sector,
    }));

    const users = await this.prisma.user.findMany({
      where: {
        is_active: true,
        OR: locationConditions,
      },
      select: {
        phone_number: true,
      },
    });

    if (users.length === 0) {
      this.logger.log('No users found in survey locations');
      return { success: 0, failed: 0 };
    }

    const phoneNumbers = users.map(user => user.phone_number);
    const message = `📋 New Survey Available: "${surveyTitle}"\n\nA new health survey is now available in your area.\n\n📱 Option 1: Open the Signify mobile app\n📞 Option 2: Dial 1234 to take survey by phone\n\nYour responses help improve community health services.\n\n- Ministry of Health`;

    return await this.sendBulkSms(phoneNumbers, message);
  }

  async sendGeneralNotification(message: string, targetUsers?: Array<{ country: string; district: string; sector: string }>): Promise<{ success: number; failed: number }> {
    let users;

    if (targetUsers && targetUsers.length > 0) {
      // Send to specific locations
      const locationConditions = targetUsers.map(location => ({
        country: location.country,
        district: location.district,
        sector: location.sector,
      }));

      users = await this.prisma.user.findMany({
        where: {
          is_active: true,
          OR: locationConditions,
        },
        select: {
          phone_number: true,
        },
      });
    } else {
      // Send to all active users
      users = await this.prisma.user.findMany({
        where: {
          is_active: true,
        },
        select: {
          phone_number: true,
        },
      });
    }

    const phoneNumbers = users.map(user => user.phone_number);
    return await this.sendBulkSms(phoneNumbers, message);
  }

  // Method to check Twilio configuration status
  getTwilioStatus(): { configured: boolean; phoneNumber?: string; message: string } {
    if (this.twilioClient) {
      return {
        configured: true,
        phoneNumber: this.twilioNumber,
        message: 'Twilio is configured and ready to send SMS'
      };
    } else {
      return {
        configured: false,
        message: 'Twilio credentials not configured. SMS will be logged to console only.'
      };
    }
  }

  // Method to validate phone number format for Twilio
  private validatePhoneNumber(phoneNumber: string): string {
    // Ensure phone number is in E.164 format
    if (!phoneNumber.startsWith('+')) {
      // Assuming Rwanda numbers (+250)
      if (phoneNumber.startsWith('250')) {
        return `+${phoneNumber}`;
      } else if (phoneNumber.length === 9) {
        return `+250${phoneNumber}`;
      }
    }
    return phoneNumber;
  }
}
