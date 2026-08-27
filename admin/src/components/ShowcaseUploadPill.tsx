type Phase = 'idle' | 'uploading' | 'processing' | 'error';

interface Props {
  phase: Phase;
  pct: number;
  label: string;
  onDismiss: () => void;
}

/**
 * Floating bottom-right progress card for a background showcase-video upload —
 * mirrors the deliverables page pill so the edit modal can close immediately
 * while the upload continues.
 */
export default function ShowcaseUploadPill({ phase, pct, label, onDismiss }: Props) {
  if (phase === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-edge bg-surface shadow-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-body">
            {phase === 'uploading' && 'Video yüklənir…'}
            {phase === 'processing' && 'Video emal olunur…'}
            {phase === 'error' && 'Video yüklənə bilmədi'}
          </p>
          <p className="truncate text-xs text-muted">{label}</p>
        </div>
        {phase === 'uploading' ? (
          <span className="tabular-nums text-xs font-medium text-muted">{pct}%</span>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
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
          Panel-də başqa işlərlə məşğul ola bilərsiniz — yükləmə arxa planda davam edir.
          Bu vərəqi <span className="font-medium">bağlamayın və yeniləməyin</span>.
        </p>
      )}
      {phase === 'processing' && (
        <p className="mt-2 text-[11px] text-muted">
          Server videonu hazırlayır. Bir azdan siyahıda "READY" görünəcək.
        </p>
      )}
    </div>
  );
}
