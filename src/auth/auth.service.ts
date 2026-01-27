import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private adminService: AdminService,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const admin = await this.adminService.findByEmail(loginDto.email);

        if (!admin) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            admin.password_hash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            sub: admin.admin_id,
            email: admin.email,
            name: admin.name
        };

        return {
            access_token: this.jwtService.sign(payload),
            admin: {
                admin_id: admin.admin_id,
                name: admin.name,
                email: admin.email,
            },
        };
    }

    async validateUser(payload: any) {
        return this.adminService.findOne(payload.sub);
    }
}
