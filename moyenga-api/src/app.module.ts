import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import configuration from './configs/configuration.js';
import { validationSchema } from './configs/validation.schema.js';
import { MailModule } from './modules/mail/mail.module.js';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './modules/auth/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    PrismaModule,
    CategoriesModule,
    ProductsModule,
    AuthModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
