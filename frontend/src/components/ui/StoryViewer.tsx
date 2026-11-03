import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, X } from 'lucide-react';
import type { HighlightDetail, HighlightSummary, LoadHighlight } from './highlightTypes';

// How long one image stays on screen, and how long a press must last to count as "hold to pause".
const SLIDE_MS = 5000;
const HOLD_MS = 220;
const MAX_FRAME_MS = 100;
// Pointer movement (px) that turns a press into a swipe, and the left share of the screen that means "back".
const SWIPE_X = 60;
const SWIPE_DOWN = 80;
const TAP_SLOP = 12;
const BACK_ZONE = 0.3;

interface Gesture {
  x: number;
  y: number;
  held: boolean;
  timer: number | null;
}

/**
 * Full-screen, Instagram-style viewer for highlights: progress bars, tap zones, hold to pause,
 * swipe between highlights, swipe down to close. Details are fetched when needed and kept;
 * the next highlight and the next image are preloaded.
 */
export const StoryViewer = ({
  highlights,
  startIndex,
  loadDetail,
  onClose,
}: {
  highlights: HighlightSummary[];
  startIndex: number;
  loadDetail: LoadHighlight;
  onClose: () => void;
}) => {
  const [pos, setPos] = useState({ h: startIndex, s: 0 });
  const [details, setDetails] = useState<Record<string, HighlightDetail>>({});
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  const requested = useRef(new Set<string>());
  const elapsed = useRef(0);
  const slideKey = useRef('');
  const barRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const goNextRef = useRef<() => void>(() => {});
  const goPrevRef = useRef<() => void>(() => {});

  const summary = highlights[pos.h];
  const detail = details[summary.id];
  const items = useMemo(
    () => (detail ? detail.items.filter((item): item is { id: string; url: string } => Boolean(item.url)) : []),
    [detail],
  );
  const item = items[pos.s];
  const status: 'loading' | 'error' | 'ready' = failed[summary.id] || (detail && items.length === 0) ? 'error' : detail ? 'ready' : 'loading';
  const paused = holding || manualPause || hidden;
  const imageReady = Boolean(item) && loadedUrl === item?.url;

  const fetchDetail = useCallback(
    (id: string) => {
      if (requested.current.has(id)) return;
      requested.current.add(id);
      loadDetail(id)
        .then((data) => setDetails((prev) => ({ ...prev, [id]: data })))
        .catch(() => setFailed((prev) => ({ ...prev, [id]: true })));
    },
    [loadDetail],
  );

  const retry = () => {
    requested.current.delete(summary.id);
    setFailed((prev) => {
      const next = { ...prev };
      delete next[summary.id];
      return next;
    });
    fetchDetail(summary.id);
  };

  const goHighlight = useCallback(
    (delta: 1 | -1) => {
      const next = pos.h + delta;
      if (next >= 0 && next < highlights.length) setPos({ h: next, s: 0 });
      else if (delta > 0) onClose();
    },
    [pos.h, highlights.length, onClose],
  );

  const goNext = useCallback(() => {
    if (pos.s < items.length - 1) setPos({ h: pos.h, s: pos.s + 1 });
    else goHighlight(1);
  }, [pos.h, pos.s, items.length, goHighlight]);

  const goPrev = useCallback(() => {
    if (pos.s > 0) setPos({ h: pos.h, s: pos.s - 1 });
    else if (pos.h > 0) setPos({ h: pos.h - 1, s: 0 });
    else {
      // First image of the first highlight: start it over.
      elapsed.current = 0;
      if (barRef.current) barRef.current.style.transform = 'scaleX(0)';
    }
  }, [pos.h, pos.s]);

  useEffect(() => {
    goNextRef.current = goNext;
    goPrevRef.current = goPrev;
  }, [goNext, goPrev]);

  // Fetch this highlight and the next one.
  useEffect(() => {
    fetchDetail(highlights[pos.h].id);
    const next = highlights[pos.h + 1];
    if (next) fetchDetail(next.id);
  }, [pos.h, highlights, fetchDetail]);

  // Preload the next image of this highlight.
  useEffect(() => {
    const upcoming = items[pos.s + 1];
    if (upcoming) {
      const preload = new Image();
      preload.src = upcoming.url;
    }
  }, [items, pos.s]);

  // The 5-second clock: starts once the image is on screen, stops while paused.
  useEffect(() => {
    if (!item) return;
    const key = `${pos.h}:${pos.s}:${item.id}`;
    if (slideKey.current !== key) {
      slideKey.current = key;
      elapsed.current = 0;
      if (barRef.current) barRef.current.style.transform = 'scaleX(0)';
    }
    if (paused || loadedUrl !== item.url) return;

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // A frame that arrives late (throttled or covered window) must not skip the picture ahead.
      elapsed.current += Math.min(now - last, MAX_FRAME_MS);
      last = now;
      const progress = Math.min(1, elapsed.current / SLIDE_MS);
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {
        goNextRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [item, pos.h, pos.s, paused, loadedUrl]);

  // Pause while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Lock page scroll, move focus in, and give it back on close.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  // Keyboard: arrows move, Esc closes, Space pauses, Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        goNextRef.current();
      } else if (e.key === 'ArrowLeft') {
        goPrevRef.current();
      } else if (e.key === ' ') {
        e.preventDefault();
        setManualPause((value) => !value);
      } else if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clearGesture = () => {
    if (gesture.current?.timer) window.clearTimeout(gesture.current.timer);
    gesture.current = null;
    setHolding(false);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-gesture]')) return;
    const timer = window.setTimeout(() => {
      if (gesture.current) {
        gesture.current.held = true;
        setHolding(true);
      }
    }, HOLD_MS);
    gesture.current = { x: e.clientX, y: e.clientY, held: false, timer };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    clearGesture();
    if (g.held) return; // it was a hold-to-pause, not a tap
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy)) {
      goHighlight(dx < 0 ? 1 : -1);
    } else if (dy > SWIPE_DOWN && dy > Math.abs(dx)) {
      onClose();
    } else if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX - rect.left < rect.width * BACK_ZONE) goPrev();
      else goNext();
    }
  };

  const barCount = status === 'ready' ? items.length : Math.max(1, summary.itemCount);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${summary.title} highlight`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black md:bg-black/90 md:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {pos.h > 0 && (
        <button
          type="button"
          onClick={() => goHighlight(-1)}
          aria-label="Əvvəlki highlight"
          className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {pos.h < highlights.length - 1 && (
        <button
          type="button"
          onClick={() => goHighlight(1)}
          aria-label="Növbəti highlight"
          className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <div
        className="relative h-[100dvh] w-full overflow-hidden bg-black text-white select-none md:h-[min(90vh,860px)] md:w-auto md:aspect-[9/16] md:rounded-xl"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={clearGesture}
        onPointerLeave={() => {
          if (gesture.current?.held) clearGesture();
        }}
      >
        {item && status === 'ready' && (
          <img
            key={item.id}
            src={item.url}
            alt={summary.title}
            draggable={false}
            onLoad={() => setLoadedUrl(item.url)}
            onError={() => goNextRef.current()}
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200 motion-reduce:transition-none"
            style={{ opacity: imageReady ? 1 : 0 }}
          />
        )}

        {(status === 'loading' || (status === 'ready' && !imageReady)) && (
          <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Yüklənir">
            <Loader2 size={28} className="animate-spin text-white/80" />
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-sm text-white/90">Yüklənmədi. İnternet bağlantınızı yoxlayıb yenidən cəhd edin.</p>
            <button
              type="button"
              data-no-gesture
              onClick={retry}
              className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25"
            >
              Yenidən cəhd et
            </button>
          </div>
        )}

        {/* Top: progress bars and header (taps pass through; only the buttons are interactive) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: barCount }, (_, i) => (
              // The key changes with the bar's state so a bar that was playing is rebuilt (its fill is
              // animated straight on the element and would otherwise keep a stale value after going back).
              <div
                key={`${i}:${i === pos.s ? 'now' : i < pos.s ? 'done' : 'next'}`}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  ref={i === pos.s && status === 'ready' ? barRef : undefined}
                  className="h-full w-full origin-left bg-white"
                  style={{ transform: status === 'ready' && i < pos.s ? 'scaleX(1)' : 'scaleX(0)' }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/20">
              {summary.coverUrl && <img src={summary.coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold drop-shadow">{summary.title}</span>
            <button
              type="button"
              data-no-gesture
              onClick={() => setManualPause((value) => !value)}
              aria-label={manualPause ? 'Davam et' : 'Dayandır'}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            >
              {manualPause ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              ref={closeRef}
              type="button"
              data-no-gesture
              onClick={onClose}
              aria-label="Bağla"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
