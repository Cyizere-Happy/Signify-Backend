import { Module } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { NotificationModule } from '../notification/notification.module';
import { SmsModule } from '../sms/sms.module';

@Module({
    controllers: [SurveyController],
    providers: [SurveyService],
    imports: [NotificationModule, SmsModule],
    exports: [SurveyService],
})
export class SurveyModule { }
