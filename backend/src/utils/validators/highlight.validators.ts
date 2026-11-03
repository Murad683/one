import { z } from 'zod';

const title = z
  .string({ message: 'Başlıq yazın.' })
  .trim()
  .min(1, 'Başlıq yazın.')
  .max(30, 'Başlıq ən çox 30 simvol ola bilər.');

// One entry of the wanted final order: an image already in the highlight, or a staged upload.
const itemRef = z.union([
  z.object({ id: z.string().min(1) }).strict(),
  z.object({ uploadKey: z.string().min(1) }).strict(),
]);

const saveFields = {
  title,
  items: z
    .array(itemRef, { message: 'Şəkillər düzgün göndərilməyib.' })
    .min(1, 'Ən azı bir şəkil əlavə edin.')
    .max(30, 'Bir highlight-da ən çox 30 şəkil ola bilər.'),
  // Position (in `items`) of the image shown on the circle; null = the first one.
  coverIndex: z.number().int().min(0).nullable().optional(),
};

export const createHighlightSchema = z.object(saveFields);

export const updateHighlightSchema = z.object({
  ...saveFields,
  // The updatedAt the editor was opened with; a different value means someone else saved meanwhile.
  expectedUpdatedAt: z.string().min(1, 'Versiya göndərilməyib.'),
});

export const orderSchema = z.object({
  ids: z.array(z.string().min(1)).max(100),
});

export const deleteUploadsSchema = z.object({
  keys: z.array(z.string().min(1)).min(1).max(100),
});
