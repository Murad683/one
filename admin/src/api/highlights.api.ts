import client from './client';

// Story-style highlights (cover + several images). Backend: /api/v1/highlights.
// The editor works on a draft: images are staged with stageHighlightImage and everything is
// written at once by saveHighlight / createHighlight ("Yadda saxla").

export const MAX_HIGHLIGHTS = 20;
export const MAX_ITEMS = 30;
export const TITLE_MAX = 30;

export interface HighlightSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  itemCount: number;
}

export interface HighlightItem {
  id: string;
  url: string | null;
  /** Saves the file (the original when kept); null when it could not be signed. */
  downloadUrl?: string | null;
}

export interface HighlightDetail {
  id: string;
  title: string;
  coverItemId: string | null;
  /** Version for the conflict check on save. */
  updatedAt?: string;
  items: HighlightItem[];
}

export interface StagedImage {
  key: string;
  url: string | null;
}

/** The wanted final state: images in order, each an existing one (`id`) or a staged upload. */
export interface HighlightDraftPayload {
  title: string;
  items: ({ id: string } | { uploadKey: string })[];
  /** Position in `items` of the circle image; null = the first one. */
  coverIndex: number | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

const unwrap = <T>(response: { data: Envelope<T> }): T => response.data.data;

export const listHighlights = async (clientId: string): Promise<HighlightSummary[]> =>
  unwrap(await client.get<Envelope<HighlightSummary[]>>(`/highlights/client/${clientId}`));

export const getHighlight = async (id: string): Promise<HighlightDetail> =>
  unwrap(await client.get<Envelope<HighlightDetail>>(`/highlights/${id}`));

export const createHighlight = async (clientId: string, draft: HighlightDraftPayload): Promise<HighlightDetail> =>
  unwrap(await client.post<Envelope<HighlightDetail>>(`/highlights/client/${clientId}`, draft));

export const saveHighlight = async (
  id: string,
  draft: HighlightDraftPayload,
  expectedUpdatedAt: string,
): Promise<HighlightDetail> =>
  unwrap(await client.put<Envelope<HighlightDetail>>(`/highlights/${id}`, { ...draft, expectedUpdatedAt }));

export const reorderHighlights = async (clientId: string, ids: string[]): Promise<HighlightSummary[]> =>
  unwrap(await client.put<Envelope<HighlightSummary[]>>(`/highlights/client/${clientId}/order`, { ids }));

/** One-time (60 s) link that downloads every image of a highlight as a ZIP, like posts. */
export const getHighlightZipTicket = async (id: string): Promise<string> =>
  unwrap(await client.post<Envelope<{ ticket: string }>>(`/highlights/${id}/zip-ticket`, undefined, { timeout: 60000 }))
    .ticket;

export const deleteHighlight = async (id: string): Promise<void> => {
  await client.delete(`/highlights/${id}`);
};

/** Uploads one image to the hidden staging area; no client sees it until the highlight is saved. */
export const stageHighlightImage = async (file: File, onProgress?: (fraction: number) => void): Promise<StagedImage> => {
  const form = new FormData();
  form.append('file', file);
  return unwrap(
    await client.post<Envelope<StagedImage>>('/highlights/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total);
      },
    }),
  );
};

/** Drops staged images (the editor was cancelled or the image removed). Best effort: the server also cleans up after 24 hours. */
export const discardStagedImages = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  try {
    await client.delete('/highlights/uploads', { data: { keys } });
  } catch {
    // Nothing the admin can do; the hourly cleanup removes them.
  }
};
