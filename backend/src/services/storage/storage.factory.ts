import { IStorageProvider } from './storage.interface';
import { AzureStorageProvider } from './azure.storage';

export function getStorageProvider(): IStorageProvider {
  return new AzureStorageProvider();
}

export const storageProvider = getStorageProvider();
