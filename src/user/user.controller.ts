import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import type { CreateUserDto, UpdateUserDto, User } from './user.service';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.userService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Get('phone/:phoneNumber')
  async findByPhoneNumber(@Param('phoneNumber') phoneNumber: string): Promise<User> {
    const user = await this.userService.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Get('location/:country/:district/:sector')
  async findByLocation(
    @Param('country') country: string,
    @Param('district') district: string,
    @Param('sector') sector: string,
  ): Promise<User[]> {
    return this.userService.findByLocation(country, district, sector);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.userService.remove(id);
  }
}
