import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserActivityMiddleware } from './user-activity.middleware';
import { DbClientModule } from '../db_client/db_client.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbClientModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, UserActivityMiddleware],
  exports: [AdminService, UserActivityMiddleware]
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(UserActivityMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST }
      )
      .forRoutes('*');
  }
}
