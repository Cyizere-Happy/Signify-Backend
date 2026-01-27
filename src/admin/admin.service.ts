import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async create(createAdminDto: CreateAdminDto) {
        const existingAdmin = await this.prisma.admin.findUnique({
            where: { email: createAdminDto.email },
        });

        if (existingAdmin) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

        return this.prisma.admin.create({
            data: {
                name: createAdminDto.name,
                email: createAdminDto.email,
                password_hash: hashedPassword,
            },
            select: {
                admin_id: true,
                name: true,
                email: true,
                created_at: true,
            },
        });
    }

    async findAll() {
        return this.prisma.admin.findMany({
            select: {
                admin_id: true,
                name: true,
                email: true,
                created_at: true,
            },
        });
    }

    async findOne(id: string) {
        const admin = await this.prisma.admin.findUnique({
            where: { admin_id: id },
            select: {
                admin_id: true,
                name: true,
                email: true,
                created_at: true,
            },
        });

        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        return admin;
    }

    async findByEmail(email: string) {
        return this.prisma.admin.findUnique({
            where: { email },
        });
    }

    async update(id: string, updateAdminDto: UpdateAdminDto) {
        await this.findOne(id);

        const data: any = { ...updateAdminDto };

        if (updateAdminDto.password) {
            data.password_hash = await bcrypt.hash(updateAdminDto.password, 10);
            delete data.password;
        }

        return this.prisma.admin.update({
            where: { admin_id: id },
            data,
            select: {
                admin_id: true,
                name: true,
                email: true,
                created_at: true,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.admin.delete({
            where: { admin_id: id },
            select: {
                admin_id: true,
                name: true,
                email: true,
                created_at: true,
            },
        });
    }
}
