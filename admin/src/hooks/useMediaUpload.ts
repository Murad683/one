import { useCallback, useState } from 'react';
import axios from 'axios';
import type { SiteSettings } from './useSiteSettings';

export type MediaUploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; pct: number }
  // The file is fully sent; the server is still working on it (faststart, poster, optimizing).
  | { phase: 'processing' }
  | { phase: 'done'; message: string; warning: boolean }
  | { phase: 'error'; message: string };

export type MediaUploadFn = (file: File, field: string, onProgress?: (pct: number) => void) => Promise<SiteSettings>;

export const uploadErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Əlaqə kəsildi, yenidən cəhd edin.';
    if (err.response.status === 401) return 'Sessiya bitib, yenidən daxil olun.';
    if (err.response.status === 413) return 'Fayl çox böyükdür.';
    if (err.response.status >= 500) return 'Serverdə xəta baş verdi, bir az sonra yenidən cəhd edin.';
    const message = err.response.data?.message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Yükləmə alınmadı. Bir az sonra yenidən cəhd edin.';
};

// A hero video comes back with a poster; if it is missing the video still works,
// but the admin should know the instant first frame was not made.
const describeResult = (file: File, field: string, result: SiteSettings, successText: string) => {
  if (field === 'heroVideoUrl' && file.type.startsWith('video/')) {
    return result.heroPoster
      ? { message: 'Video yükləndi, poster hazırdır.', warning: false }
      : { message: 'Video yükləndi, amma poster yaradıla bilmədi. Video yenə də işləyir.', warning: true };
  }
  return { message: successText, warning: false };
};

/** Progress and result of one media upload on the settings page. */
export const useMediaUpload = (upload: MediaUploadFn, field: string, successText: string) => {
  const [state, setState] = useState<MediaUploadState>({ phase: 'idle' });

  /** Resolves with the success message, or null when the upload failed (the error is in `state`). */
  const start = useCallback(
    async (file: File): Promise<string | null> => {
      setState({ phase: 'uploading', pct: 0 });
      try {
        const result = await upload(file, field, (pct) =>
          setState(pct >= 100 ? { phase: 'processing' } : { phase: 'uploading', pct }),
        );
        const done = describeResult(file, field, result, successText);
        setState({ phase: 'done', ...done });
        return done.message;
      } catch (err) {
        setState({ phase: 'error', message: uploadErrorMessage(err) });
        return null;
      }
    },
    [upload, field, successText],
  );

  return { state, start };
};
