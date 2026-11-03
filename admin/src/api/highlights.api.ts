import client from './client';

// Story-style highlights (cover + several images). Backend: /api/v1/highlights.

export const MAX_HIGHLIGHTS = 20;
export const MAX_ITEMS = 30;
export const TITLE_MAX = 30;
/** Images sent per request: keeps the order and stays under the upload rate limit (10 requests a minute). */
export const UPLOAD_CHUNK = 5;

export interface HighlightSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  itemCount: number;
}

export interface HighlightItem {
  id: string;
  url: string | null;
}

export interface HighlightDetail {
  id: string;
  title: string;
  coverItemId: string | null;
  items: HighlightItem[];
}

export interface UploadOutcome {
  items: HighlightItem[];
  failed: { name: string; message: string }[];
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

export const createHighlight = async (clientId: string, title: string): Promise<HighlightDetail> =>
  unwrap(await client.post<Envelope<HighlightDetail>>(`/highlights/client/${clientId}`, { title }));

export const reorderHighlights = async (clientId: string, ids: string[]): Promise<HighlightSummary[]> =>
  unwrap(await client.put<Envelope<HighlightSummary[]>>(`/highlights/client/${clientId}/order`, { ids }));

export const renameHighlight = async (id: string, title: string): Promise<HighlightDetail> =>
  unwrap(await client.patch<Envelope<HighlightDetail>>(`/highlights/${id}`, { title }));

/** `null` goes back to "the first image". */
export const setHighlightCover = async (id: string, coverItemId: string | null): Promise<HighlightDetail> =>
  unwrap(await client.patch<Envelope<HighlightDetail>>(`/highlights/${id}`, { coverItemId }));

export const deleteHighlight = async (id: string): Promise<void> => {
  await client.delete(`/highlights/${id}`);
};

export const uploadHighlightImages = async (id: string, files: File[]): Promise<UploadOutcome> => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return unwrap(
    await client.post<Envelope<UploadOutcome>>(`/highlights/${id}/items`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  );
};

export const reorderHighlightItems = async (id: string, ids: string[]): Promise<HighlightDetail> =>
  unwrap(await client.put<Envelope<HighlightDetail>>(`/highlights/${id}/items/order`, { ids }));

export const deleteHighlightItem = async (id: string, itemId: string): Promise<void> => {
  await client.delete(`/highlights/${id}/items/${itemId}`);
};
