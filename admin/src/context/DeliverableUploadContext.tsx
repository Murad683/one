import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { uploadDeliverableFile, directUploadDeliverableFile } from '../api/deliverables.api';
import { DIRECT_UPLOAD_THRESHOLD_BYTES } from '../constants';
import { requestErrorMessage } from '../lib/apiHelpers';
import { useShowcaseUpload } from './ShowcaseUploadContext';
import { DeliverableUploadCtx, type DeliverableUploadPhase } from './deliverableUpload';

/**
 * App-level so a "Layihə Faylları" upload keeps running (and its progress pill
 * stays visible) after the admin leaves the deliverables page. Same approach as
 * ShowcaseUploadContext: an SPA route change doesn't reload the page, so the
 * in-flight upload + finalize complete regardless. Closing or reloading the tab
 * still cancels it — the beforeunload warning covers that.
 */
export function DeliverableUploadProvider({ children }: { children: ReactNode }) {
  // Must be rendered inside ShowcaseUploadProvider: both pills sit bottom-right,
  // so this one moves up while a portfolio/package video pill is showing.
  const showcaseBusy = useShowcaseUpload().phase !== 'idle';
  const [phase, setPhase] = useState<DeliverableUploadPhase>('idle');
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState('');
  const [errorText, setErrorText] = useState('');
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback((deliverableId: string, files: File[], thumbnail: File | null, onFinished?: () => void) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setLabel(
      files.length === 1 ? files[0].name : files.length > 1 ? `${files.length} fayl` : (thumbnail?.name ?? 'Fayl'),
    );
    setErrorText('');
    setPct(0);
    setPhase('uploading');

    const isLargeVideo = files.some((f) => f.type.startsWith('video/') && f.size > DIRECT_UPLOAD_THRESHOLD_BYTES);
    const runUpload = isLargeVideo ? directUploadDeliverableFile : uploadDeliverableFile;

    runUpload(deliverableId, files, setPct, thumbnail)
      .then(() => {
        setPct(100);
        setPhase('done');
        onFinished?.();
        clearTimer.current = setTimeout(() => setPhase('idle'), 4000);
      })
      .catch((err) => {
        setErrorText(requestErrorMessage(err, 'Fayl yüklənə bilmədi.'));
        setPhase('error');
        onFinished?.();
      });
  }, []);

  useEffect(() => {
    if (phase !== 'uploading') return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  return (
    <DeliverableUploadCtx.Provider value={{ phase, start }}>
      {children}
      {phase !== 'idle' && (
        <div
          className={`fixed right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-edge bg-surface shadow-lg p-4 ${
            showcaseBusy ? 'bottom-44' : 'bottom-4'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-body">
                {phase === 'uploading' && 'Fayl yüklənir…'}
                {phase === 'done' && 'Yükləndi ✓'}
                {phase === 'error' && 'Yükləmə uğursuz oldu'}
              </p>
              <p className="truncate text-xs text-muted">{label}</p>
            </div>
            {phase === 'uploading' ? (
              <span className="tabular-nums text-xs font-medium text-muted">{pct}%</span>
            ) : (
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="text-xs text-muted hover:text-body"
                aria-label="Bağla"
              >
                ✕
              </button>
            )}
          </div>
          {phase === 'uploading' && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-900 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {phase === 'uploading' && (
            <p className="mt-2 text-[11px] text-muted">
              Panel-də başqa səhifələrə keçə bilərsiniz — yükləmə arxa planda davam edir.
              Bu vərəqi <span className="font-medium">bağlamayın və yeniləməyin</span>.
            </p>
          )}
          {phase === 'error' && errorText && <p className="mt-2 text-[11px] text-red-600">{errorText}</p>}
        </div>
      )}
    </DeliverableUploadCtx.Provider>
  );
}
