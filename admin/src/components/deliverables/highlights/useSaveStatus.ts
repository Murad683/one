import { useCallback, useEffect, useRef, useState } from 'react';
import { requestErrorMessage } from '../../../lib/apiHelpers';

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/**
 * Tracks the "saving / saved / failed" chip of an editor that saves every change by itself.
 * `track(promise)` shows the result of the latest call only, so a slow older answer cannot
 * overwrite a newer one.
 */
export function useSaveStatus() {
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const timer = useRef<number | null>(null);
  const latest = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const track = useCallback(async <T,>(work: Promise<T>, failure = 'Yadda saxlanmadı. Yenidən cəhd edin.'): Promise<T | undefined> => {
    const mine = ++latest.current;
    if (timer.current) window.clearTimeout(timer.current);
    setState({ kind: 'saving' });
    try {
      const result = await work;
      if (mine === latest.current) {
        setState({ kind: 'saved' });
        timer.current = window.setTimeout(() => setState({ kind: 'idle' }), 2500);
      }
      return result;
    } catch (err) {
      if (mine === latest.current) setState({ kind: 'error', message: requestErrorMessage(err, failure) });
      return undefined;
    }
  }, []);

  const fail = useCallback((message: string) => {
    latest.current += 1;
    setState({ kind: 'error', message });
  }, []);

  return { state, track, fail };
}
