import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider.interface';

export interface FileMetadata {
  id: string;
  workspaceId: string;
  uploadedByMembershipId?: string;
  key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  downloadUrl?: string;
  isPublic: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: Date;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const DISALLOWED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bin', '.msi', '.dll', '.com', '.vbs', '.scr', '.pif'
];

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'text/',
  'application/pdf',
  'application/vnd.',
  'application/msword',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // allowed if extension is safe
];

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
  ) {}

  // ---------------------------------------------------------------------------
  // FILE UPLOAD & VALIDATION (REQUIREMENTS 7, 8, 10, 11)
  // ---------------------------------------------------------------------------

  async uploadFile(
    workspaceId: string,
    uploaderMembershipId: string,
    fileBuffer: Buffer | Uint8Array,
    originalName: string,
    mimeType: string,
    options?: {
      entityType?: string;
      entityId?: string;
      isPublic?: boolean;
    },
  ): Promise<FileMetadata> {
    const cleanName = (originalName || 'file.bin').trim();
    const sizeBytes = fileBuffer.length;

    // 1. Validate File Size
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 25 MB`,
      );
    }
    if (sizeBytes === 0) {
      throw new BadRequestException('Cannot upload empty file');
    }

    // 2. Validate Disallowed Dangerous Extensions
    const extMatch = cleanName.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';
    if (DISALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `File extension "${ext}" is not permitted for security reasons`,
      );
    }

    // 3. Validate Mime Type
    const isMimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
    if (!isMimeAllowed) {
      throw new BadRequestException(`MIME type "${mimeType}" is not supported for secure upload`);
    }

    // 4. Construct Safe Storage Key
    const safeBaseName = cleanName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${workspaceId}/${options?.entityType || 'general'}/${Date.now()}_${safeBaseName}`;

    // 5. Delegate to Extensible Storage Provider (e.g. Cloudflare R2 / S3 compliant)
    const uploadResult = await this.storageProvider.uploadFile({
      key: storageKey,
      body: fileBuffer,
      mimeType,
      isPublic: !!options?.isPublic,
    });

    // 6. Persist File Record in Database
    const fileRecord = await this.prisma.file.create({
      data: {
        workspaceId,
        uploadedByMembershipId: uploaderMembershipId,
        key: storageKey,
        originalName: cleanName,
        mimeType,
        sizeBytes,
        url: uploadResult.url,
        isPublic: !!options?.isPublic,
        entityType: options?.entityType,
        entityId: options?.entityId,
      },
    });

    // 7. Security Audit Log
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorMembershipId: uploaderMembershipId,
        action: 'FILE_UPLOADED',
        entity: 'File',
        entityId: fileRecord.id,
        metadata: {
          originalName: cleanName,
          sizeBytes,
          mimeType,
          entityType: options?.entityType,
          entityId: options?.entityId,
        },
      },
    }).catch(() => null);

    return fileRecord as any;
  }

  // ---------------------------------------------------------------------------
  // FILE RETRIEVAL, AUTHORISATION & SECURE PRE-SIGNED DOWNLOAD URL
  // ---------------------------------------------------------------------------

  async getFile(
    workspaceId: string,
    fileId: string,
    actorMembershipId?: string,
  ): Promise<FileMetadata> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, workspaceId },
    });

    // Cross-tenant boundary check: Files from another workspace are strictly not found
    if (!file) {
      throw new NotFoundException('File not found in this workspace');
    }

    let downloadUrl = file.url;

    // For private files, generate a secure pre-signed download URL (never exposing credentials)
    if (!file.isPublic) {
      try {
        downloadUrl = await this.storageProvider.getSignedDownloadUrl(file.key, 3600); // 1-hour expiry
      } catch (err: any) {
        this.logger.warn(`Could not generate signed URL: ${err.message}`);
      }
    }

    // Record access audit event
    if (actorMembershipId) {
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          actorMembershipId,
          action: 'FILE_ACCESSED',
          entity: 'File',
          entityId: file.id,
          metadata: { originalName: file.originalName, isPublic: file.isPublic },
        },
      }).catch(() => null);
    }

    return {
      ...file,
      downloadUrl,
    };
  }

  // ---------------------------------------------------------------------------
  // LIST FILES BY ENTITY OR WORKSPACE
  // ---------------------------------------------------------------------------

  async listFiles(
    workspaceId: string,
    query?: { entityType?: string; entityId?: string },
  ): Promise<FileMetadata[]> {
    const where: any = { workspaceId };
    if (query?.entityType) where.entityType = query.entityType;
    if (query?.entityId) where.entityId = query.entityId;

    const files = await this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return files;
  }

  // ---------------------------------------------------------------------------
  // FILE DELETION & AUDIT EVENT
  // ---------------------------------------------------------------------------

  async deleteFile(
    workspaceId: string,
    fileId: string,
    actorMembershipId: string,
  ): Promise<{ message: string; deletedId: string }> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new NotFoundException('File not found in this workspace');
    }

    // Delete from underlying storage
    try {
      await this.storageProvider.deleteFile(file.key);
    } catch (err: any) {
      this.logger.warn(`Storage delete error for key ${file.key}: ${err.message}`);
    }

    // Delete from database
    await this.prisma.file.delete({
      where: { id: fileId },
    });

    // Record removal audit event
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorMembershipId,
        action: 'FILE_DELETED',
        entity: 'File',
        entityId: fileId,
        metadata: { originalName: file.originalName, key: file.key },
      },
    }).catch(() => null);

    return { message: 'File deleted successfully', deletedId: fileId };
  }
}
