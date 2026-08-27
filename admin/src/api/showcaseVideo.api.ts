import axios from 'axios';
import client from './client';

type Kind = 'project' | 'package';
const base = (kind: Kind) => (kind === 'project' ? '/projects' : '/packages');

/**
 * Uploads a showcase video for a project or package: ask the API for a
 * presigned PUT URL, upload the file straight to storage, then tell the API to
 * kick off the faststart + 720p transcode. Mirrors `uploadSinglePut` in
 * deliverables.api.ts. Single PUT, no multipart.
 */
export const uploadShowcaseVideo = async (
  kind: Kind,
  id: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> => {
  const init = await client.post(`${base(kind)}/${id}/video/initiate`, {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
  const { uploadUrl, storageKey } = init.data.data;

  // Raw axios so the admin bearer/CSRF headers are NOT sent to the bucket.
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    timeout: 0,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total));
    },
  });

  await client.post(`${base(kind)}/${id}/video/finalize`, { storageKey });
};

export const deleteShowcaseVideo = async (kind: Kind, id: string): Promise<void> => {
  await client.delete(`${base(kind)}/${id}/video`);
};
