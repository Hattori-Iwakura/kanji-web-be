import { Injectable } from '@nestjs/common';
import { Prisma, Users } from 'generated/prisma';
import { UserRepository } from './user.repo';
import {LoggerService} from './../logger/logger.service'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly logger: LoggerService
  ) {}

  async getAll(): Promise<Users[]> {

    const result = await this.userRepo.fetchAllAsync();

    return result.filter(user => user.is_active);
  }

  async findById(id: number): Promise<Users| null> {

    const user = await this.userRepo.fetchAsync({id: id});

    return user;
  }

  // use for sign up
  async findByAccount(account: string): Promise<Users| null> {
    
    return this.userRepo.fetchAsync({account: account})
  }

  async updateAsync(id: number, info: Prisma.UsersUpdateInput): Promise<Users | null> {
    const user = await this.userRepo.updateAsync(id, info);

    return user;
  }
}