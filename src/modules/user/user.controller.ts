import { BadRequestException, Body, Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { Users } from 'generated/prisma';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { time } from 'console';

@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAll(): Promise<Users[]> {
    const result = await this.userService.getAll();

    return result
  }

  @Get(':id')
  async getById(@Param('id') id: number): Promise<Users | null> {
    const result = await this.userService.findById(id)
    return result
  } 
}