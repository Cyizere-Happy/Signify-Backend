import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface CreateUserDto {
  phone_number: string;
  name?: string;
  country: string;
  district: string;
  sector: string;
}

export interface UpdateUserDto {
  name?: string;
  country?: string;
  district?: string;
  sector?: string;
  is_active?: boolean;
}

export interface User {
  user_id: string;
  phone_number: string;
  name?: string;
  country: string;
  district: string;
  sector: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: createUserDto,
      });

      return this.mapToUserInterface(user);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User with this phone number already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
    });

    return users.map(this.mapToUserInterface);
  }

  async findOne(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: id },
    });

    return user ? this.mapToUserInterface(user) : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone_number: phoneNumber },
    });

    return user ? this.mapToUserInterface(user) : null;
  }

  async findByLocation(country: string, district: string, sector: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        country,
        district,
        sector,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return users.map(this.mapToUserInterface);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.prisma.user.update({
      where: { user_id: id },
      data: updateUserDto,
    });

    return this.mapToUserInterface(user);
  }

  async remove(id: string): Promise<User> {
    const user = await this.prisma.user.delete({
      where: { user_id: id },
    });

    return this.mapToUserInterface(user);
  }

  private mapToUserInterface(user: any): User {
    return {
      user_id: user.user_id,
      phone_number: user.phone_number,
      name: user.name,
      country: user.country,
      district: user.district,
      sector: user.sector,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
