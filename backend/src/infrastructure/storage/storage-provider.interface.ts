export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array;
  mimeType: string;
  isPublic?: boolean;
}

export interface StorageProvider {
  uploadFile(options: UploadOptions): Promise<{ key: string; url: string }>;
  deleteFile(key: string): Promise<boolean>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
