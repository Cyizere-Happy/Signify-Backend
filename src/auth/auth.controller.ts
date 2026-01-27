import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from '../admin/dto/create-admin.dto';
import { AdminService } from '../admin/admin.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly adminService: AdminService,
    ) { }

    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    async register(@Body() createAdminDto: CreateAdminDto) {
        const admin = await this.adminService.create(createAdminDto);
        return this.authService.login({
            email: createAdminDto.email,
            password: createAdminDto.password,
        });
    }
}
