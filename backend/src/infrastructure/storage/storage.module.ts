import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { CloudflareR2StorageProvider } from './cloudflare-r2-storage.provider';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: CloudflareR2StorageProvider,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
