import { z } from 'zod';

export const updateSiteSettingsSchema = z.object({
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email').max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  facebook: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  instagram: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  linkedin: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  youtube: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  tiktok: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
});
