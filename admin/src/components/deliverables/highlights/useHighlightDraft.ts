import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  MAX_ITEMS,
  discardStagedImages,
  stageHighlightImage,
  type HighlightDraftPayload,
  type HighlightItem,
} from '../../../api/highlights.api';
import { requestErrorMessage } from '../../../lib/apiHelpers';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PARALLEL_UPLOADS = 3;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
const IMAGE_NAME = /\.(jpe?g|png|webp|heic|heif)$/i;
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export interface SavedDraftItem {
  kind: 'saved';
  /** Stable key for lists and drag and drop (the server id). */
  key: string;
  id: string;
  url: string | null;
}

export interface NewDraftItem {
  kind: 'new';
  key: string;
  file: File;
  preview: string;
  status: 'queued' | 'uploading' | 'ready' | 'error';
  progress: number;
  uploadKey?: string;
  message?: string;
}

export type DraftItem = SavedDraftItem | NewDraftItem;

export interface DraftInitial {
  title: string;
  coverItemId: string | null;
  items: HighlightItem[];
}

interface DraftState {
  title: string;
  items: DraftItem[];
  /** Key of the chosen circle image; null = the first one. */
  coverKey: string | null;
}

type Action =
  | { type: 'title'; title: string }
  | { type: 'add'; items: NewDraftItem[] }
  | { type: 'patch'; key: string; patch: Partial<NewDraftItem> }
  | { type: 'remove'; key: string }
  | { type: 'cover'; key: string }
  | { type: 'order'; keys: string[] };

const reducer = (state: DraftState, action: Action): DraftState => {
  switch (action.type) {
    case 'title':
      return { ...state, title: action.title };
    case 'add':
      return { ...state, items: [...state.items, ...action.items] };
    case 'patch':
      return {
        ...state,
        items: state.items.map((item) =>
          item.kind === 'new' && item.key === action.key ? { ...item, ...action.patch } : item,
        ),
      };
    case 'remove':
      return {
        ...state,
        items: state.items.filter((item) => item.key !== action.key),
        coverKey: state.coverKey === action.key ? null : state.coverKey,
      };
    case 'cover':
      return { ...state, coverKey: action.key };
    case 'order': {
      const byKey = new Map(state.items.map((item) => [item.key, item]));
      const next = action.keys.flatMap((key) => byKey.get(key) ?? []);
      return next.length === state.items.length ? { ...state, items: next } : state;
    }
    default:
      return state;
  }
};

const initialState = (initial: DraftInitial): DraftState => ({
  title: initial.title,
  coverKey: initial.coverItemId,
  items: initial.items.map((item) => ({ kind: 'saved', key: item.id, id: item.id, url: item.url })),
});

/** Splits the chosen files into the ones we can send and a human message for each we cannot. */
const checkFiles = (files: File[], room: number): { ok: File[]; notes: string[] } => {
  const notes: string[] = [];
  const usable: File[] = [];
  for (const file of files) {
    if (!(IMAGE_MIME.includes(file.type) || IMAGE_NAME.test(file.name))) {
      notes.push(`${file.name}: yalnız şəkil qəbul olunur (JPG, PNG, WEBP, HEIC).`);
    } else if (file.size > MAX_FILE_BYTES) {
      notes.push(`${file.name}: 10 MB-dan böyükdür.`);
    } else {
      usable.push(file);
    }
  }
  if (usable.length > room) {
    notes.push(
      room > 0
        ? `Yalnız ${room} şəkil üçün yer qalıb, qalanları əlavə edilmədi.`
        : `Bir highlight-da ən çox ${MAX_ITEMS} şəkil ola bilər.`,
    );
    return { ok: usable.slice(0, Math.max(0, room)), notes };
  }
  return { ok: usable, notes };
};

const uploadMessage = (err: unknown): string => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 429) return 'Çox tez-tez yükləyirsiniz. Bir az gözləyib yenidən cəhd edin.';
  return requestErrorMessage(err, 'Yüklənmədi. Yenidən cəhd edin.');
};

let tileCounter = 0;

/**
 * The editor's draft of one highlight: title, images (saved ones and fresh uploads), order and cover.
 * Nothing here reaches the server except the hidden staging uploads; the caller writes everything at
 * once from `toPayload()`. Uploads run three at a time and "Save" waits for them.
 */
export const useHighlightDraft = (initial: DraftInitial) => {
  const [state, dispatch] = useReducer(reducer, initial, initialState);
  const queue = useRef<NewDraftItem[]>([]);
  const active = useRef(0);
  const dropped = useRef(new Set<string>());
  const previews = useRef(new Set<string>());
  const latest = useRef(state);
  const saved = useRef(false);
  const pumpAgain = useRef<() => void>(() => undefined);

  useEffect(() => {
    latest.current = state;
  });

  const pump = useCallback(() => {
    while (active.current < PARALLEL_UPLOADS && queue.current.length > 0) {
      const tile = queue.current.shift() as NewDraftItem;
      active.current += 1;
      dispatch({ type: 'patch', key: tile.key, patch: { status: 'uploading', progress: 0, message: undefined } });
      stageHighlightImage(tile.file, (fraction) =>
        dispatch({ type: 'patch', key: tile.key, patch: { progress: fraction } }),
      )
        .then((staged) => {
          if (dropped.current.has(tile.key)) void discardStagedImages([staged.key]);
          else dispatch({ type: 'patch', key: tile.key, patch: { status: 'ready', progress: 1, uploadKey: staged.key } });
        })
        .catch((err) => {
          if (!dropped.current.has(tile.key)) {
            dispatch({ type: 'patch', key: tile.key, patch: { status: 'error', message: uploadMessage(err) } });
          }
        })
        .finally(() => {
          active.current -= 1;
          pumpAgain.current();
        });
    }
  }, []);

  useEffect(() => {
    pumpAgain.current = pump;
  }, [pump]);

  const addFiles = useCallback(
    (list: FileList | File[] | null): string[] => {
      const files = list ? Array.from(list) : [];
      if (files.length === 0) return [];
      const room = MAX_ITEMS - latest.current.items.length;
      const { ok, notes } = checkFiles(files, room);
      const tiles: NewDraftItem[] = ok.map((file) => {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        tileCounter += 1;
        return { kind: 'new', key: `new-${tileCounter}`, file, preview, status: 'queued', progress: 0 };
      });
      if (tiles.length > 0) {
        dispatch({ type: 'add', items: tiles });
        queue.current.push(...tiles);
        pump();
      }
      return notes;
    },
    [pump],
  );

  const remove = useCallback((key: string) => {
    const item = latest.current.items.find((entry) => entry.key === key);
    if (item && item.kind === 'new') {
      dropped.current.add(item.key);
      queue.current = queue.current.filter((tile) => tile.key !== item.key);
      if (item.uploadKey) void discardStagedImages([item.uploadKey]);
      URL.revokeObjectURL(item.preview);
      previews.current.delete(item.preview);
    }
    dispatch({ type: 'remove', key });
  }, []);

  const retry = useCallback(
    (key: string) => {
      const item = latest.current.items.find((entry) => entry.key === key);
      if (!item || item.kind !== 'new' || item.status !== 'error') return;
      dispatch({ type: 'patch', key, patch: { status: 'queued', progress: 0, message: undefined } });
      queue.current.push(item);
      pump();
    },
    [pump],
  );

  /** Throws away every staged image of this draft (the editor was cancelled). */
  const discardAll = useCallback(() => {
    const staged: string[] = [];
    for (const item of latest.current.items) {
      if (item.kind !== 'new') continue;
      dropped.current.add(item.key);
      if (item.uploadKey) staged.push(item.uploadKey);
    }
    queue.current = [];
    void discardStagedImages(staged);
  }, []);

  const markSaved = useCallback(() => {
    saved.current = true;
  }, []);

  useEffect(() => {
    const live = previews.current;
    return () => {
      live.forEach((url) => URL.revokeObjectURL(url));
      live.clear();
    };
  }, []);

  // Closed any other way (page changed, parent unmounted): do not leave staged images behind.
  useEffect(
    () => () => {
      if (!saved.current) discardAll();
    },
    [discardAll],
  );

  const baseKeys = useMemo(() => initial.items.map((item) => item.id), [initial]);
  const baseCover = initial.coverItemId ?? initial.items[0]?.id ?? null;
  const effectiveCover = state.coverKey ?? state.items[0]?.key ?? null;
  const cleanTitle = state.title.trim();

  const dirty =
    cleanTitle !== initial.title ||
    effectiveCover !== baseCover ||
    state.items.length !== baseKeys.length ||
    state.items.some((item, index) => item.kind === 'new' || item.key !== baseKeys[index]);

  const uploading = state.items.some(
    (item) => item.kind === 'new' && (item.status === 'queued' || item.status === 'uploading'),
  );
  const failedUploads = state.items.some((item) => item.kind === 'new' && item.status === 'error');

  let problem: string | null = null;
  if (uploading) problem = 'Şəkillər yüklənir…';
  else if (failedUploads) problem = 'Yüklənməyən şəkilləri yenidən cəhd edin və ya çıxarın.';
  else if (!cleanTitle) problem = 'Başlıq yazın.';
  else if (state.items.length === 0) problem = 'Ən azı bir şəkil əlavə edin.';

  const toPayload = useCallback((): HighlightDraftPayload => {
    const items: HighlightDraftPayload['items'] = [];
    for (const item of state.items) {
      if (item.kind === 'saved') items.push({ id: item.id });
      else if (item.uploadKey) items.push({ uploadKey: item.uploadKey });
    }
    const coverIndex = state.coverKey ? state.items.findIndex((item) => item.key === state.coverKey) : -1;
    return { title: cleanTitle, items, coverIndex: coverIndex >= 0 ? coverIndex : null };
  }, [state, cleanTitle]);

  return {
    title: state.title,
    items: state.items,
    effectiveCover,
    room: MAX_ITEMS - state.items.length,
    dirty,
    uploading,
    problem,
    canSave: dirty && problem === null,
    setTitle: useCallback((title: string) => dispatch({ type: 'title', title }), []),
    setCover: useCallback((key: string) => dispatch({ type: 'cover', key }), []),
    reorder: useCallback((keys: string[]) => dispatch({ type: 'order', keys }), []),
    addFiles,
    remove,
    retry,
    toPayload,
    discardAll,
    markSaved,
  };
};
