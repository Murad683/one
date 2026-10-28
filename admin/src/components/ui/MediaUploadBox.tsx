import type { ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import type { MediaUploadFn } from '../../hooks/useMediaUpload';

interface Props {
  accept: string;
  /** SiteSettings field the file is stored in (heroVideoUrl, navbarLogoUrl...). */
  field: string;
  onUpload: MediaUploadFn;
  /** Message for a finished upload that has nothing special to report. */
  successText: string;
  onSuccess?: (message: string) => void;
}

/**
 * Dashed drop box for the settings page media uploads. Shows the upload
 * percentage, then "processing" while the server works on the file, and keeps
 * the result (or the error) visible under the box instead of a short toast.
 */
export default function MediaUploadBox({ accept, field, onUpload, successText, onSuccess }: Props) {
  const { state, start } = useMediaUpload(onUpload, field, successText);
  const busy = state.phase === 'uploading' || state.phase === 'processing';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // otherwise picking the same file again does nothing
    if (!file) return;
    void start(file).then((message) => {
      if (message) onSuccess?.(message);
    });
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-edge bg-surface-alt px-4 transition hover:bg-surface-hover">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={busy}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        {state.phase === 'uploading' ? (
          <div className="w-full space-y-2 text-center">
            <p className="text-xs font-medium text-body">
              Yüklənir… <span className="tabular-nums">{state.pct}%</span>
            </p>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-edge"
              role="progressbar"
              aria-valuenow={state.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-200"
                style={{ width: `${state.pct}%` }}
              />
            </div>
          </div>
        ) : state.phase === 'processing' ? (
          <div className="flex flex-col items-center gap-1 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-medium">Emal olunur…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-faint">
            <Upload className="h-5 w-5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Yüklə</span>
          </div>
        )}
      </div>

      {state.phase === 'done' && (
        <p
          role="status"
          className={`flex items-start gap-1.5 text-xs font-medium ${state.warning ? 'text-amber-600' : 'text-emerald-600'}`}
        >
          {state.warning ? (
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
          )}
          {state.message}
        </p>
      )}
      {state.phase === 'error' && (
        <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-600">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          {state.message}
        </p>
      )}
    </div>
  );
}
