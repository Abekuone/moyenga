import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP-IN');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, body, headers, query, ip } = req;

    this.logger.log('📥 ========== REQUÊTE ENTRANTE ==========');
    this.logger.log(`📍 ${method} ${originalUrl}`);
    this.logger.log(`🌐 IP: ${ip}`);
    this.logger.log(`📋 Headers:`);
    this.logger.log(JSON.stringify(this.sanitizeHeaders(headers), null, 2));

    if (query && Object.keys(query).length > 0) {
      this.logger.log(`🔍 Query Params:`);
      this.logger.log(JSON.stringify(query, null, 2));
    }

    if (body && Object.keys(body).length > 0) {
      this.logger.log(`📦 Body:`);
      this.logger.log(JSON.stringify(body, null, 2));
    }

    this.logger.log('=========================================\n');

    const originalSend = res.send.bind(res);

    res.send = (data: any): Response => {
      const duration = Date.now() - startTime;
      this.logResponse(res, data, duration);
      return originalSend(data);
    };

    next();
  }

  private logResponse(res: Response, data: any, duration: number) {
    this.logger.log('📤 ========== RÉPONSE ENVOYÉE ==========');
    this.logger.log(`📊 Status: ${res.statusCode}`);
    this.logger.log(`⏱️  Durée: ${duration}ms`);

    if (data) {
      this.logger.log(`📦 Body:`);
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        this.logger.log(JSON.stringify(parsed, null, 2));
      } catch {
        this.logger.log(data);
      }
    }

    this.logger.log('========================================\n');
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    if (sanitized.cookie) sanitized.cookie = '[REDACTED]';
    if (sanitized.authorization) sanitized.authorization = sanitized.authorization.substring(0, 20) + '...';
    if (sanitized['x-xsrf-token']) sanitized['x-xsrf-token'] = '[REDACTED]';
    return sanitized;
  }
}