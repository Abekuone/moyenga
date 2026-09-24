import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Sert les fichiers uploadés (images produits) hors du préfixe /api
  app.useStaticAssets(
    join(process.cwd(), config.get<string>('upload.dest') || './uploads'),
    { prefix: '/uploads/' },
  );

  app.setGlobalPrefix(config.get<string>('apiPrefix') ?? 'api');

  app.enableCors({
    origin: config.get<string>('cors.origin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`API démarrée sur http://localhost:${port}`);
}
bootstrap();
