import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { uploadDeliverableFile, directUploadDeliverableFile } from '../api/deliverables.api';
import { DIRECT_UPLOAD_THRESHOLD_BYTES } from '../constants';
import { requestErrorMessage } from '../lib/apiHelpers';
import { useShowcaseUpload } from './ShowcaseUploadContext';
import { DeliverableUploadCtx, MAX_PARALLEL_UPLOADS, type DeliverableUploadItem } from './deliverableUpload';

const DONE_CARD_MS = 4000;

/**
 * App-level so a "Layihə Faylları" upload keeps running (and its progress card
 * stays visible) after the admin leaves the deliverables page. Same approach as
 * ShowcaseUploadContext: an SPA route change doesn't reload the page, so the
 * in-flight upload + finalize complete regardless. Closing or reloading the tab
 * still cancels it — the beforeunload warning covers that.
 *
 * Up to MAX_PARALLEL_UPLOADS uploads run at once, each with its own card; a card
 * only ever reflects (and closes for) its own upload.
 */
export function DeliverableUploadProvider({ children }: { children: ReactNode }) {
  // Must be rendered inside ShowcaseUploadProvider: both cards sit bottom-right,
  // so this stack moves up while a portfolio/package video pill is showing.
  const showcaseBusy = useShowcaseUpload().phase !== 'idle';
  const [uploads, setUploads] = useState<DeliverableUploadItem[]>([]);
  const nextId = useRef(1);
  const closeTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const activeCount = uploads.filter((u) => u.status === 'uploading').length;
  // The "don't close the tab" hint is shown once, on the first running card.
  const firstUploadingId = uploads.find((u) => u.status === 'uploading')?.id;

  const patch = useCallback((id: number, changes: Partial<DeliverableUploadItem>) => {
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...changes } : u)));
  }, []);

  const remove = useCallback((id: number) => {
    const timer = closeTimers.current.get(id);
    if (timer) clearTimeout(timer);
    closeTimers.current.delete(id);
    setUploads((list) => list.filter((u) => u.id !== id));
  }, []);

  const start = useCallback(
    (deliverableId: string, files: File[], thumbnail: File | null, onFinished?: () => void) => {
      const id = nextId.current++;
      const label =
        files.length === 1 ? files[0].name : files.length > 1 ? `${files.length} fayl` : (thumbnail?.name ?? 'Fayl');
      setUploads((list) => [...list, { id, label, pct: 0, status: 'uploading', errorText: '' }]);

      const isLargeVideo = files.some((f) => f.type.startsWith('video/') && f.size > DIRECT_UPLOAD_THRESHOLD_BYTES);
      const runUpload = isLargeVideo ? directUploadDeliverableFile : uploadDeliverableFile;

      runUpload(deliverableId, files, (pct) => patch(id, { pct }), thumbnail)
        .then(() => {
          patch(id, { pct: 100, status: 'done' });
          onFinished?.();
          closeTimers.current.set(
            id,
            setTimeout(() => remove(id), DONE_CARD_MS),
          );
        })
        .catch((err) => {
          patch(id, { status: 'error', errorText: requestErrorMessage(err, 'Fayl yüklənə bilmədi.') });
          onFinished?.();
        });
    },
    [patch, remove],
  );

  useEffect(() => {
    if (activeCount === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [activeCount]);

  useEffect(() => {
    const timers = closeTimers.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <DeliverableUploadCtx.Provider value={{ activeCount, canStart: activeCount < MAX_PARALLEL_UPLOADS, start }}>
      {children}
      {uploads.length > 0 && (
        <div
          className={`fixed right-4 z-50 flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2 ${
            showcaseBusy ? 'bottom-44' : 'bottom-4'
          }`}
        >
          {uploads.map((u) => (
            <div key={u.id} className="rounded-xl border border-edge bg-surface shadow-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-body">
                    {u.status === 'uploading' && 'Fayl yüklənir…'}
                    {u.status === 'done' && 'Yükləndi ✓'}
                    {u.status === 'error' && 'Yükləmə uğursuz oldu'}
                  </p>
                  <p className="truncate text-xs text-muted">{u.label}</p>
                </div>
                {u.status === 'uploading' ? (
                  <span className="tabular-nums text-xs font-medium text-muted">{u.pct}%</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(u.id)}
                    className="text-xs text-muted hover:text-body"
                    aria-label="Bağla"
                  >
                    ✕
                  </button>
                )}
              </div>
              {u.status === 'uploading' && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gray-900 transition-all duration-300"
                    style={{ width: `${u.pct}%` }}
                  />
                </div>
              )}
              {u.id === firstUploadingId && (
                <p className="mt-2 text-[11px] text-muted">
                  Panel-də başqa səhifələrə keçə bilərsiniz — yükləmə arxa planda davam edir.
                  Bu vərəqi <span className="font-medium">bağlamayın və yeniləməyin</span>.
                </p>
              )}
              {u.status === 'error' && u.errorText && <p className="mt-2 text-[11px] text-red-600">{u.errorText}</p>}
            </div>
          ))}
        </div>
      )}
    </DeliverableUploadCtx.Provider>
  );
}
