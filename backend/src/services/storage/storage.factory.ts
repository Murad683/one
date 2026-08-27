import { IStorageProvider } from './storage.interface';
import { AzureStorageProvider } from './azure.storage';
import { S3StorageProvider } from './s3.storage';
import { LocalStorageProvider } from './local.storage';

export function getStorageProvider(): IStorageProvider {
  // Default stays 'azure' so existing deployments that never set this
  // env var (e.g. the current Azure App Service) keep working unchanged.
  const provider = (process.env.STORAGE_PROVIDER || 'azure').toLowerCase();

  switch (provider) {
    case 's3':
      return new S3StorageProvider();
    case 'local':
      return new LocalStorageProvider();
    case 'azure':
    default:
      return new AzureStorageProvider();
  }
}

export const storageProvider = getStorageProvider();
