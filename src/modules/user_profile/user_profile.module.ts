import { Module } from '@nestjs/common';
import { UserProfileController } from './user_profile.controller';
import { UserProfileService } from './user_profile.service';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { DbClientModule } from '../db_client/db_client.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbClientModule, AuthModule],
  controllers: [UserProfileController],
  providers: [UserProfileService, UserProfileRepository],
  exports: [UserProfileService],
})
export class UserProfileModule {}
