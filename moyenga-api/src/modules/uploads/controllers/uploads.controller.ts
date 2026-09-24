import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { UploadsService } from '../services/uploads.service.js';
import { multerConfig } from '../../../configs/multer.config.js';
import { Role } from '../../../generated/prisma/client.js';

@Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerConfig))
  uploadOne(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    return {
      filename: file.filename,
      url: this.uploadsService.buildFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  uploadMany(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Aucun fichier reçu');
    return files.map((file) => ({
      filename: file.filename,
      url: this.uploadsService.buildFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    }));
  }

  @Delete(':filename')
  async deleteFile(@Param('filename') filename: string) {
    await this.uploadsService.deleteFile(filename);
    return { message: 'Fichier supprimé' };
  }
}
