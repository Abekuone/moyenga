import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import type ms from 'ms';
import { MailModule } from '../mail/mail.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuthService } from './services/auth.service.js';

@Module({
  imports: [
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.getOrThrow<string>(
          'jwt.expiresIn',
        ) as ms.StringValue;

        return {
          secret: config.getOrThrow<string>('jwt.secret'),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
