import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { Users } from 'generated/prisma';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';

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
}