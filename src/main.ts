import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerService } from './modules/logger/logger.service';
import { ExceptionResponseFilter } from './filters/exception-response/exception-response.filter';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const logger = await app.resolve(LoggerService);
  app.useLogger(logger);

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // security headers
  app.use(helmet());

  // cookie parser (em đã có)
  app.use(cookieParser());

  // CORS nếu frontend domain khác
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? true,
    credentials: true, // allow cookies
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(error => ({
          field: error.property,
          constraints: error.constraints,
        }));
        logger.error('Validation failed:', JSON.stringify(messages, null, 2));
        return new BadRequestException({
          statusCode: 400,
          message: errors.map(e => Object.values(e.constraints || {}).join(', ')),
          error: 'Validation Failed'
        });
      },
    }),
  );
  app.useGlobalFilters(new ExceptionResponseFilter(logger));
  app.setGlobalPrefix('api');

  // Swagger (giữ như hiện tại)
  const config = new DocumentBuilder()
    .setTitle('Kanji web backend')
    .setDescription('API description')
    .setVersion(process.env.APP_VERSION ?? '1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  logger.log('🚀 Application starting...');
  await app.listen(process.env.PORT_SERVER ?? 3000);
  logger.log('✅ Application ready.');
}
bootstrap();
