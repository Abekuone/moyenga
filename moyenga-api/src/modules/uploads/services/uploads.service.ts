import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  buildFileUrl(filename: string): string {
    const appUrl = this.configService.get<string>('appUrl');
    return `${appUrl}/uploads/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const dest = this.configService.get<string>('upload.dest') || './uploads';
    try {
      await unlink(join(dest, filename));
    } catch {
      // Fichier déjà absent - pas bloquant
    }
  }
}
