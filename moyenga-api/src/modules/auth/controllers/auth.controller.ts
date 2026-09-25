import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service.js';
import { Role } from '../../prisma/prisma-client.js';
import { RegisterDto } from '../dtos/register.dto.js';
import { Public } from '../decorators/public.decorator.js';
import { LoginDto } from '../dtos/login.dto.js';
import { VerifyEmailDto } from '../dtos/verify-email.dto.js';
import { RefreshTokenDto } from '../dtos/refresh-token.dto.js';
import { CurrentUser } from '../dtos/current-user.decorator.js';
import { CreateStaffDto } from '../dtos/create-staff.dto.js';
import { Roles } from '../decorators/roles.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -------- Public --------

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  // -------- Authentifié (n'importe quel rôle) --------

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@CurrentUser('id') userId: string) {
    return this.authService.resendVerificationEmail(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  // -------- Backoffice - réservé SUPERADMIN --------

  @Roles(Role.SUPERADMIN)
  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) {
    return this.authService.createStaff(dto);
  }
}
