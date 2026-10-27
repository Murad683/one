/** E-mail addresses are stored and looked up in lower case without surrounding spaces. */
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

/** Same loose shape check as the admin form: something@something, no spaces. */
export const looksLikeEmail = (value: string): boolean => /^\S+@\S+$/.test(value);

/** Prisma unique-constraint violation (P2002): another row already has this value. */
export const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';

export const EMAIL_IN_USE_MESSAGE = 'Bu e-poçt artıq başqa hesabda istifadə olunur';
