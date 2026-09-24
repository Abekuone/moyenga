import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * TODO: brancher un vrai fournisseur (SMTP, SendGrid, Resend, Brevo...).
   * En attendant, le lien de vérification est simplement loggé en console
   * pour pouvoir tester le flux d'inscription de bout en bout.
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const link = `${frontendUrl}/verify-email?token=${token}`;

    this.logger.log(`[EMAIL SIMULÉ] Vérification pour ${email} → ${link}`);
  }
}
