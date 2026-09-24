import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

export const multerConfig = {
  storage: diskStorage({
    destination: process.env.UPLOAD_DEST || './uploads',
    filename: (_req: any, file: Express.Multer.File, callback: any) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Type de fichier non autorisé (jpeg, png, webp uniquement)',
        ),
        false,
      );
    }
    callback(null, true);
  },
  limits: { fileSize: MAX_FILE_SIZE },
};
