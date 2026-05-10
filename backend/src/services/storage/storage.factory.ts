import { IStorageProvider } from './storage.interface';
import { LocalStorageProvider } from './local.storage';
import { AzureStorageProvider } from './azure.storage';

export function getStorageProvider(): IStorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider.toLowerCase()) {
    case 'local':
      return new LocalStorageProvider();
    case 'azure':
      return new AzureStorageProvider();
    default:
      throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }
}

export const storageProvider = getStorageProvider();
