import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type ms from 'ms';
import { Role, User } from '../../prisma/prisma-client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import { RegisterDto } from '../dtos/register.dto.js';
import { CreateStaffDto } from '../dtos/create-staff.dto.js';
import { VerifyEmailDto } from '../dtos/verify-email.dto.js';
import { LoginDto } from '../dtos/login.dto.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ---------------------------------------------------------------------
  // Inscription publique (toujours CLIENT)
  // ---------------------------------------------------------------------
  async register(dto: RegisterDto) {
    this.assertHasIdentifier(dto.email, dto.phone);
    await this.assertIdentifierAvailable(dto.email, dto.phone);

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = dto.email ? this.generateToken() : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: Role.CLIENT,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationToken
          ? new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000)
          : null,
      },
    });

    if (dto.email && verificationToken) {
      await this.mailService.sendVerificationEmail(dto.email, verificationToken);
    }

    return this.sanitizeUser(user);
  }

  // ---------------------------------------------------------------------
  // Création de compte staff (ADMIN / GESTIONNAIRE) - réservé SUPERADMIN
  // Voir AuthController: protégé par @Roles(Role.SUPERADMIN)
  // ---------------------------------------------------------------------
  async createStaff(dto: CreateStaffDto) {
    this.assertHasIdentifier(dto.email, dto.phone);
    await this.assertIdentifierAvailable(dto.email, dto.phone);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        isEmailVerified: true, // compte créé par un superadmin: pas de vérification requise
      },
    });

    return this.sanitizeUser(user);
  }

  // ---------------------------------------------------------------------
  // Vérification d'email par token (lien envoyé par email)
  // ---------------------------------------------------------------------
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Token de vérification invalide');
    }
    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Token de vérification expiré');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { message: 'Email vérifié avec succès' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (!user.email) throw new BadRequestException('Aucun email associé à ce compte');
    if (user.isEmailVerified) throw new BadRequestException('Email déjà vérifié');

    const verificationToken = this.generateToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(
          Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
        ),
      },
    });

    await this.mailService.sendVerificationEmail(user.email, verificationToken);
    return { message: 'Email de vérification renvoyé' };
  }

  // ---------------------------------------------------------------------
  // Connexion - identifiant = email OU téléphone
  // ---------------------------------------------------------------------
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
      },
    });

    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Identifiants invalides');

    if (!user.isActive) {
      throw new ForbiddenException('Ce compte a été désactivé');
    }

    if (user.email && !user.isEmailVerified) {
      throw new ForbiddenException(
        'Veuillez vérifier votre adresse email avant de vous connecter',
      );
    }

    return this.issueTokens(user);
  }

  // ---------------------------------------------------------------------
  // Rafraîchissement des tokens
  // ---------------------------------------------------------------------
  async refreshTokens(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Accès refusé');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Accès refusé');

    return this.issueTokens(user);
  }

  // ---------------------------------------------------------------------
  // Déconnexion - invalide le refresh token stocké
  // ---------------------------------------------------------------------
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: 'Déconnexion réussie' };
  }

  // ---------------------------------------------------------------------
  // Helpers privés
  // ---------------------------------------------------------------------
  private async issueTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'jwt.expiresIn',
    ) as ms.StringValue;
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    ) as ms.StringValue;

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private assertHasIdentifier(email?: string, phone?: string) {
    if (!email && !phone) {
      throw new BadRequestException('Un email ou un numéro de téléphone est requis');
    }
  }

  private async assertIdentifierAvailable(email?: string, phone?: string) {
    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ConflictException('Cet email est déjà utilisé');
    }
    if (phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone } });
      if (existing) throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private sanitizeUser(user: User) {
    const {
      password: _password,
      refreshTokenHash: _refreshTokenHash,
      emailVerificationToken: _emailVerificationToken,
      ...safe
    } = user;
    return safe;
  }
}
