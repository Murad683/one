import client from './client';
import type { ApiResponse, PaginatedResponse, Deliverable } from '@/types';

export const getDeliverables = async (params?: {
  clientId?: string;
  year?: number;
  month?: number;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<PaginatedResponse<Deliverable>>> => {
  const response = await client.get<ApiResponse<PaginatedResponse<Deliverable>>>('/deliverables', {
    params,
  });
  return response.data;
};

export const createDeliverable = async (data: {
  clientId: string;
  type: string;
  month: number;
  year: number;
  notes?: string;
}): Promise<ApiResponse<Deliverable>> => {
  const response = await client.post<ApiResponse<Deliverable>>('/deliverables', data);
  return response.data;
};

export const uploadDeliverableFile = async (
  id: string,
  files: File[],
  onProgress?: (percent: number) => void,
  thumbnail?: File | null
): Promise<ApiResponse<Deliverable>> => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  if (thumbnail) {
    formData.append('thumbnail', thumbnail);
  }

  const response = await client.patch<ApiResponse<Deliverable>>(
    `/deliverables/${id}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes — large video uploads
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress?.(Math.round((event.loaded * 100) / event.total));
        }
      },
    }
  );
  return response.data;
};

export const updateDeliverableStatus = async (
  id: string,
  status: string
): Promise<ApiResponse<Deliverable>> => {
  const response = await client.patch<ApiResponse<Deliverable>>(`/deliverables/${id}/status`, {
    status,
  });
  return response.data;
};

export const deleteDeliverable = async (id: string): Promise<void> => {
  await client.delete(`/deliverables/${id}`);
};

import axios from 'axios';

// Files at or above this size are uploaded with S3 multipart (parallel chunks)
// instead of a single-stream PUT — dramatically faster on high-latency links.
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20 MB
const PART_CONCURRENCY = 5;
const PART_MAX_RETRIES = 3;
// The server learns an upload is alive from a ping about every 30 s (POST /upload-progress), so it
// can tell a running upload from a cut-off one. Best effort: a missed ping never stops an upload.
const HEARTBEAT_MS = 30_000;
const CALL_MAX_ATTEMPTS = 3;

const startHeartbeat = (id: string, storageKey: string, getPercent: () => number): (() => void) => {
  const send = (done = false) =>
    client.post(`/deliverables/${id}/upload-progress`, { storageKey, progress: getPercent(), done }).catch(() => undefined);
  const timer = setInterval(() => void send(), HEARTBEAT_MS);
  return () => clearInterval(timer);
};

// A short API call between two storage steps (complete / finalize): a lost connection must not
// throw away a finished upload, so network errors and 5xx answers are retried; 4xx answers are final.
const withRetries = async <T>(call: () => Promise<T>): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await call();
    } catch (err) {
      attempt += 1;
      const status = (err as { response?: { status?: number } })?.response?.status;
      const retryable = status === undefined || status >= 500;
      if (!retryable || attempt >= CALL_MAX_ATTEMPTS) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Single presigned PUT (used for small files and the thumbnail).
const uploadSinglePut = async (
  id: string,
  file: File,
  onFileProgress?: (percent: number) => void
): Promise<string> => {
  const initRes = await client.post(`/deliverables/${id}/initiate-upload`, {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
  const { uploadUrl, storageKey } = initRes.data.data;

  let percent = 0;
  const stopBeat = startHeartbeat(id, storageKey, () => percent);
  try {
    await withRetries(() =>
      axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        timeout: 0,
        onUploadProgress: (event) => {
          if (event.total) {
            percent = Math.round((event.loaded * 100) / event.total);
            onFileProgress?.(percent);
          }
        },
      }),
    );
  } finally {
    stopBeat();
  }
  // The whole file is in storage: the server row moves on, so a cut-off before "finalize" is visible.
  await client.post(`/deliverables/${id}/upload-progress`, { storageKey, progress: 100, done: true }).catch(() => undefined);
  return storageKey;
};

// Multipart upload: split the file into parts and PUT them in parallel.
const uploadMultipart = async (
  id: string,
  file: File,
  onFileProgress?: (percent: number) => void
): Promise<string> => {
  const initRes = await client.post(`/deliverables/${id}/initiate-multipart`, {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
  const { storageKey, uploadId, partSize, partUrls } = initRes.data.data as {
    storageKey: string;
    uploadId: string;
    partSize: number;
    partUrls: { partNumber: number; url: string }[];
  };

  const total = partUrls.length;
  let lastPercent = 0;
  const stopBeat = startHeartbeat(id, storageKey, () => lastPercent);
  const loadedPerPart = new Array<number>(total).fill(0);
  const completed = new Array<{ partNumber: number; etag: string } | undefined>(total);
  const reportProgress = () => {
    const loaded = loadedPerPart.reduce((a, b) => a + b, 0);
    lastPercent = Math.min(100, Math.round((loaded * 100) / file.size));
    onFileProgress?.(lastPercent);
  };

  const putPart = async (idx: number): Promise<void> => {
    const { partNumber, url } = partUrls[idx];
    const start = idx * partSize;
    const end = Math.min(file.size, start + partSize);
    const chunk = file.slice(start, end);

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await axios.put(url, chunk, {
          headers: { 'Content-Type': file.type },
          timeout: 0,
          onUploadProgress: (event) => {
            loadedPerPart[idx] = event.loaded;
            reportProgress();
          },
        });
        const etag = (res.headers.etag || res.headers.ETag || '').toString();
        if (!etag) throw new Error(`Part ${partNumber}: missing ETag in response`);
        completed[idx] = { partNumber, etag };
        loadedPerPart[idx] = end - start;
        reportProgress();
        return;
      } catch (err) {
        attempt += 1;
        if (attempt >= PART_MAX_RETRIES) throw err;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  };

  // Bounded-concurrency worker pool over the part indices.
  let nextIdx = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const idx = nextIdx++;
      if (idx >= total) return;
      await putPart(idx);
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(PART_CONCURRENCY, total) }, () => worker())
    );
  } catch (err) {
    stopBeat();
    // Leave no dangling multipart upload behind.
    try {
      await client.post(`/deliverables/${id}/abort-multipart`, { storageKey, uploadId });
    } catch {
      /* best effort */
    }
    throw err;
  }

  const parts = completed.filter(Boolean) as { partNumber: number; etag: string }[];
  try {
    await withRetries(() => client.post(`/deliverables/${id}/complete-multipart`, { storageKey, uploadId, parts }));
  } finally {
    stopBeat();
  }
  return storageKey;
};

export const directUploadDeliverableFile = async (
  id: string,
  files: File[],
  onProgress?: (percent: number) => void,
  thumbnail?: File | null
): Promise<any> => {
  const uploadedFiles: { storageKey: string; fileName: string; fileSize: number; mimeType: string }[] = [];
  let thumbnailStorageKey: string | null = null;

  // Custom thumbnail first (always small → single PUT).
  if (thumbnail) {
    thumbnailStorageKey = await uploadSinglePut(id, thumbnail);
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const onFileProgress = (fileProgress: number) => {
      const overall = Math.round((i * 100 + fileProgress) / files.length);
      onProgress?.(overall);
    };

    const storageKey =
      file.size >= MULTIPART_THRESHOLD_BYTES
        ? await uploadMultipart(id, file, onFileProgress)
        : await uploadSinglePut(id, file, onFileProgress);

    uploadedFiles.push({
      storageKey,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  }

  // Tell the backend everything is in place → verification + processing starts.
  const response = await withRetries(() =>
    client.post(`/deliverables/${id}/finalize-upload`, {
      files: uploadedFiles,
      ...(thumbnailStorageKey && { thumbnailStorageKey }),
    }),
  );
  return response.data;
};
