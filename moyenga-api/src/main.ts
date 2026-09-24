import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

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

  await app.listen(configService.get<number>('port', 3000));
}
bootstrap();
