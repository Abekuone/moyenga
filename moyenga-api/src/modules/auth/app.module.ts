import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    PrismaModule,
    AuthModule,
    // Les modules métier suivants (products, orders, ...) seront importés ici
  ],
  providers: [
    // Toute route est protégée par défaut (JWT requis) sauf @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Vérifie ensuite le rôle si @Roles(...) est présent sur la route
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
