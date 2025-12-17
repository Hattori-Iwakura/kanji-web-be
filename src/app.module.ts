import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { AppConfigModule } from './modules/app_config/app_config.module';
import { AppConfigService } from './modules/app_config/app_config.service';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggingInterceptor } from './interceptors/logging/logging.interceptor';
import { LoggerModule } from './modules/logger/logger.module';
import { RequestContextMiddleware } from './middlewares/request-context/request-context.middleware';
import { TransformInterceptor } from './interceptors/transform/transform.interceptor';
import { DbClientModule } from './modules/db_client/db_client.module';
import { UserModule } from './modules/user/user.module';
import { KanjiModule } from './modules/kanji/kanji.module';
import { KanjiListModule } from './modules/kanji_list/kanji_list.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { FlashcardModule } from './modules/flashcard/flashcard.module';
import { UserProfileModule } from './modules/user_profile/user_profile.module';
import { CommunityModule } from './modules/community/community.module';
import { NewsModule } from './modules/news/news.module';
import { AdminModule } from './modules/admin/admin.module';
import { TranslateModule } from './modules/translate/translate.module';
import { DbClient } from './modules/db_client/db_client.service';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DbClientModule,
    SharedModule,
    UserModule,
    KanjiModule,
    KanjiListModule,
    AuthModule,
    QuizModule,
    FlashcardModule,
    UserProfileModule,
    CommunityModule,
    NewsModule,
    AdminModule,
    TranslateModule,
  ],
  controllers: [],
  providers: [
    DbClient,
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
