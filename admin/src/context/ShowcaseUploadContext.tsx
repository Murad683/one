import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { uploadShowcaseVideo } from '../api/showcaseVideo.api';
import ShowcaseUploadPill from '../components/ShowcaseUploadPill';

type Kind = 'project' | 'package';
type Phase = 'idle' | 'uploading' | 'processing' | 'error';

interface ShowcaseUploadValue {
  phase: Phase;
  /** bumps each time an upload finishes — pages watch it to refetch their list */
  lastCompleted: number;
  start: (kind: Kind, id: string, file: File) => void;
}

const Ctx = createContext<ShowcaseUploadValue | null>(null);

/**
 * App-level so a showcase-video upload keeps running (and its progress pill
 * stays visible) even after the edit modal closes and the user navigates to
 * another admin page. The SPA route change doesn't reload the page, so the
 * in-flight PUT + finalize complete regardless; this just keeps the UI.
 */
export function ShowcaseUploadProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState('');
  const [lastCompleted, setLastCompleted] = useState(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback((kind: Kind, id: string, file: File) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setLabel(file.name);
    setPct(0);
    setPhase('uploading');
    uploadShowcaseVideo(kind, id, file, setPct)
      .then(() => {
        setPhase('processing');
        setLastCompleted(Date.now());
        clearTimer.current = setTimeout(() => setPhase('idle'), 15000);
      })
      .catch(() => {
        setPhase('error');
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
    <Ctx.Provider value={{ phase, lastCompleted, start }}>
      {children}
      <ShowcaseUploadPill phase={phase} pct={pct} label={label} onDismiss={() => setPhase('idle')} />
    </Ctx.Provider>
  );
}

export function useShowcaseUpload(): ShowcaseUploadValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShowcaseUpload must be used within ShowcaseUploadProvider');
  return v;
}
