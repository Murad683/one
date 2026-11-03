import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { SaveState } from './useSaveStatus';

export const SaveStatus = ({ state }: { state: SaveState }) => {
  if (state.kind === 'idle') return <span className="min-h-5" aria-live="polite" />;
  if (state.kind === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted" aria-live="polite">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        Yadda saxlanır…
      </span>
    );
  }
  if (state.kind === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-600" aria-live="polite">
        <Check size={14} aria-hidden="true" />
        Yadda saxlandı
      </span>
    );
  }
  return (
    <span className="inline-flex items-start gap-1.5 text-sm text-red-500" role="alert">
      <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      {state.message}
    </span>
  );
};
