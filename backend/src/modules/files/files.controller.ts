import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @UploadedFile() file?: any,
    @Body() body?: any,
  ) {
    if (file && file.buffer) {
      return this.filesService.uploadFile(
        workspaceId,
        req.membershipId,
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          entityType: body?.entityType,
          entityId: body?.entityId,
          isPublic: body?.isPublic === 'true' || body?.isPublic === true,
        },
      );
    } else if (body && body.base64Data) {
      const buffer = Buffer.from(body.base64Data, 'base64');
      return this.filesService.uploadFile(
        workspaceId,
        req.membershipId,
        buffer,
        body.originalName || 'uploaded_document.bin',
        body.mimeType || 'application/octet-stream',
        {
          entityType: body.entityType,
          entityId: body.entityId,
          isPublic: !!body.isPublic,
        },
      );
    } else {
      throw new BadRequestException('File payload required (multipart "file" or "base64Data" JSON)');
    }
  }

  @Get()
  async listFiles(
    @CurrentWorkspace() workspaceId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.filesService.listFiles(workspaceId, { entityType, entityId });
  }

  @Get(':id')
  async getFile(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') fileId: string,
  ) {
    return this.filesService.getFile(workspaceId, fileId, req.membershipId);
  }

  @Delete(':id')
  async deleteFile(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') fileId: string,
  ) {
    return this.filesService.deleteFile(workspaceId, fileId, req.membershipId);
  }
}
