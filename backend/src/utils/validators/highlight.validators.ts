import { z } from 'zod';

const title = z
  .string({ message: 'Başlıq yazın.' })
  .trim()
  .min(1, 'Başlıq yazın.')
  .max(30, 'Başlıq ən çox 30 simvol ola bilər.');

export const createHighlightSchema = z.object({ title });

export const updateHighlightSchema = z
  .object({
    title: title.optional(),
    // The image shown on the circle; null goes back to "the first image".
    coverItemId: z.string().min(1).nullable().optional(),
  })
  .refine((value) => value.title !== undefined || value.coverItemId !== undefined, {
    message: 'Dəyişdiriləcək məlumat göndərilməyib.',
  });

export const orderSchema = z.object({
  ids: z.array(z.string().min(1)).max(100),
});
