import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DbClientModule } from '../db_client/db_client.module';
import { UserRepository } from './user.repo';

@Module({
  controllers: [UserController],
  providers: [UserService, DbClientModule, UserRepository],
  exports: [UserService]
})
export class UserModule {}
