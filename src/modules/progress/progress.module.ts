import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProgressController],
  providers: [ProgressService, PrismaService],
  exports: [ProgressService],
})
export class ProgressModule {}
