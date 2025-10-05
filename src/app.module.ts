import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './modules/app_config/app_config.module';
import { AppConfigService } from './modules/app_config/app_config.service';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggingInterceptor } from './interceptors/logging/logging.interceptor';
import { LoggerModule } from './modules/logger/logger.module';
import { RequestContextMiddleware } from './middlewares/request-context/request-context.middleware';
import { TransformInterceptor } from './interceptors/transform/transform.interceptor';

@Module({
  imports: [AppConfigModule, LoggerModule],
  controllers: [AppController],
  providers: [
    AppService, 
    AppConfigService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor
    },
    {
      provide: APP_PIPE,
      useFactory: () => 
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware)
    .forRoutes('');
  }

}
