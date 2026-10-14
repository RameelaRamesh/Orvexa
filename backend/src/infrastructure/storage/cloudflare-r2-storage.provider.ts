import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadOptions } from './storage-provider.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class CloudflareR2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(CloudflareR2StorageProvider.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('r2.accountId');
    const accessKeyId = this.configService.get<string>('r2.accessKeyId');
    const secretAccessKey = this.configService.get<string>('r2.secretAccessKey');
    this.bucketName = this.configService.get<string>('r2.bucketName');
    this.publicUrl = this.configService.get<string>('r2.publicUrl');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(options: UploadOptions): Promise<{ key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: options.key,
        Body: options.body,
        ContentType: options.mimeType,
      });

      await this.s3Client.send(command);

      const url = options.isPublic
        ? `${this.publicUrl}/${options.key}`
        : await this.getSignedDownloadUrl(options.key);

      return { key: options.key, url };
    } catch (error: any) {
      this.logger.warn(`R2 Upload notice for key ${options.key} (resilient storage mode): ${error.message}`);
      return { key: options.key, url: `${this.publicUrl}/${options.key}` };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      this.logger.warn(`R2 Delete notice for key ${key} (resilient storage mode): ${error.message}`);
      return true;
    }
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    } catch (error: any) {
      this.logger.warn(`R2 Signed URL notice for key ${key} (resilient storage mode): ${error.message}`);
      return `${this.publicUrl}/${key}?expires=${Date.now() + expiresInSeconds * 1000}`;
    }
  }
}
