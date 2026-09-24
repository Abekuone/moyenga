import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { NextFunction, Request, Response } from 'express';
import { RequestLoggerMiddleware } from './common/middlewares/request-logger.middleware.js';
import { join } from 'path';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix', 'api');

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: configService.get<string>('cors.origin', '*'),
    credentials: configService.get<string>('cors.origin', '*') !== '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const middleware = new RequestLoggerMiddleware();
    middleware.use(req, res, next);
  });

  await app.listen(configService.get<number>('port', 3000));
}
bootstrap();
