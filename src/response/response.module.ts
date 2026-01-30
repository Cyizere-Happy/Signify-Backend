import { Module } from '@nestjs/common';
import { ResponseService } from './response.service';
import { ResponseController } from './response.controller';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
    controllers: [ResponseController],
    providers: [ResponseService],
    imports: [NotificationModule, UserModule],
    exports: [ResponseService],
})
export class ResponseModule { }
