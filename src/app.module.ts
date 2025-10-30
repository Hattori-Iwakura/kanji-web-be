import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './modules/app_config/app_config.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './modules/cache/cache.module';
import { DbClientModule } from './modules/db_client/db_client.module';
// import { KanjiModule } from './modules/kanji/kanji.module'; // Old - rebuild later
import { KanjiModule } from './modules/kanji/kanji.module'; // New clean module
import { KanjiListModule as KanjiListModuleNew } from './modules/kanji-list/kanji-list.module'; // New clean module
import { FlashcardDeckModule } from './modules/flashcard/flashcard-deck.module'; // New clean module
import { QuizModule as QuizModuleNew } from './modules/quiz_new/quiz.module'; // New clean module
// import { KanjiListModule } from './modules/kanji_list/kanji_list.module'; // Old - rebuild later
import { KanjiRecognitionModule } from './modules/kanji-recognition/kanji-recognition.module';
import { UserModule } from './modules/user/user.module'; // New clean module
import { AdminModule } from './modules/admin/admin.module'; // Admin dashboard module
import { FlashcardSessionModule } from './modules/flashcard-session/flashcard-session.module'; // Flashcard sessions with SM-2
import { ProgressModule } from './modules/progress/progress.module'; // Progress tracking module
// import { FlashcardModule } from './modules/flashcard/flashcard.module'; // Old - rebuild later
// import { QuizModule } from './modules/quiz/quiz.module'; // Old - rebuild later
// import { AchievementModule } from './modules/achievement/achievement.module'; // Old - not found
import { LoggerModule } from './modules/logger/logger.module';
// import { UserModule } from './modules/user/user.module'; // Old - has errors
import { ExceptionResponseFilter } from './filters/exception-response/exception-response.filter';
import { LoggingInterceptor } from './interceptors/logging/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform/transform.interceptor';
import { RequestContextMiddleware } from './middlewares/request-context/request-context.middleware';
import { RequestLoggerMiddleware } from './middlewares/request-logger.middleware';

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
    ScheduleModule.forRoot(),
    AppConfigModule,
    CacheModule,
    // DbClientModule, // Using PrismaService instead
    LoggerModule,
    AuthModule,
    KanjiModule, // New clean module
    KanjiListModuleNew, // New clean module
    FlashcardDeckModule, // New clean module
    QuizModuleNew, // New clean module
    // UserModule, // Rebuild later
    // KanjiListModule, // Rebuild later
    KanjiRecognitionModule,
    UserModule, // New clean module
    AdminModule, // Admin dashboard module
    FlashcardSessionModule, // Flashcard sessions with SM-2
    ProgressModule, // Progress tracking module
    // FlashcardModule, // Rebuild later
    // QuizModule, // Rebuild later
    // QuizModule, // Rebuild later
    // AchievementModule, // Rebuild later
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
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('auth/register');
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
