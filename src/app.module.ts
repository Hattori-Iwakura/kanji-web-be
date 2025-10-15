import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './modules/app_config/app_config.module';
import { AuthModule } from './modules/auth/auth.module';
import { DbClientModule } from './modules/db_client/db_client.module';
import { KanjiModule } from './modules/kanji/kanji.module';
import { KanjiListModule } from './modules/kanji_list/kanji_list.module';
import { KanjiRecognitionModule } from './modules/kanji-recognition/kanji-recognition.module';
import { AiModule } from './modules/ai/ai.module'; // Add this
import { FlashcardModule } from './modules/flashcard/flashcard.module';
import { LoggerModule } from './modules/logger/logger.module';
import { UserModule } from './modules/user/user.module';
import { ExceptionResponseFilter } from './filters/exception-response/exception-response.filter';
import { LoggingInterceptor } from './interceptors/logging/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform/transform.interceptor';
import { RequestContextMiddleware } from './middlewares/request-context/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AppConfigModule,
    DbClientModule,
    LoggerModule,
    AuthModule,
    UserModule,
    KanjiModule,
    KanjiListModule,
    KanjiRecognitionModule,
    FlashcardModule,
    AiModule, // Add this
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ExceptionResponseFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
