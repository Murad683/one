import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  MAX_ITEMS,
  TITLE_MAX,
  UPLOAD_CHUNK,
  deleteHighlight,
  deleteHighlightItem,
  getHighlight,
  renameHighlight,
  reorderHighlightItems,
  setHighlightCover,
  uploadHighlightImages,
  type HighlightDetail,
  type HighlightItem,
} from '../../../api/highlights.api';
import { requestErrorMessage } from '../../../lib/apiHelpers';
import Button from '../../ui/Button';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { SaveStatus } from './SaveStatus';
import { useSaveStatus } from './useSaveStatus';
import { useReorder } from './useReorder';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
const IMAGE_NAME = /\.(jpe?g|png|webp|heic|heif)$/i;
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

interface PendingTile {
  key: string;
  file: File;
  preview: string;
  status: 'waiting' | 'uploading' | 'error';
  message?: string;
}

/** Splits the chosen files into the ones we can send and a human message for each we cannot. */
const checkFiles = (files: File[], room: number): { ok: File[]; messages: string[] } => {
  const messages: string[] = [];
  const usable: File[] = [];
  for (const file of files) {
    if (!(IMAGE_MIME.includes(file.type) || IMAGE_NAME.test(file.name))) {
      messages.push(`${file.name}: yalnız şəkil qəbul olunur (JPG, PNG, WEBP, HEIC).`);
    } else if (file.size > MAX_FILE_BYTES) {
      messages.push(`${file.name}: 10 MB-dan böyükdür.`);
    } else {
      usable.push(file);
    }
  }
  if (usable.length > room) {
    messages.push(
      room > 0
        ? `Bu highlight-da yalnız ${room} şəkil üçün yer qalıb, qalanları əlavə edilmədi.`
        : `Bir highlight-da ən çox ${MAX_ITEMS} şəkil ola bilər.`,
    );
    return { ok: usable.slice(0, Math.max(0, room)), messages };
  }
  return { ok: usable, messages };
};

const chunk = <T,>(list: T[], size: number): T[][] => {
  const parts: T[][] = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
};

interface HighlightEditorProps {
  highlightId: string;
  onBack: () => void;
}

/** Screen 2: one highlight. Every change is saved on its own; there is no "Save" button. */
export const HighlightEditor = ({ highlightId, onBack }: HighlightEditorProps) => {
  const [detail, setDetail] = useState<HighlightDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [items, setItems] = useState<HighlightItem[]>([]);
  const [coverItemId, setCoverItemId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingTile[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const activeBatches = useRef(0);
  const progressRef = useRef({ done: 0, total: 0 });
  const previews = useRef(new Set<string>());
  const { state: saveState, track, fail } = useSaveStatus();

  const applyDetail = useCallback((next: HighlightDetail) => {
    setDetail(next);
    setTitleDraft(next.title);
    setItems(next.items);
    setCoverItemId(next.coverItemId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHighlight(highlightId)
      .then((next) => {
        if (!cancelled) applyDetail(next);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(requestErrorMessage(err, 'Highlight yüklənmədi.'));
      });
    return () => {
      cancelled = true;
    };
  }, [highlightId, applyDetail]);

  useEffect(() => {
    const live = previews.current;
    return () => {
      live.forEach((url) => URL.revokeObjectURL(url));
      live.clear();
    };
  }, []);

  const uploading = pending.some((tile) => tile.status !== 'error') || progress !== null;
  const room = MAX_ITEMS - items.length - pending.length;
  const coverId = coverItemId ?? items[0]?.id ?? null;

  /* ── title ── */
  const saveTitle = async () => {
    if (!detail) return;
    const clean = titleDraft.trim();
    if (!clean) {
      setTitleDraft(detail.title); // an empty title is not allowed: put the old one back
      return;
    }
    if (clean === detail.title) return;
    const next = await track(renameHighlight(highlightId, clean));
    if (next) {
      setDetail((prev) => (prev ? { ...prev, title: next.title } : prev));
      setTitleDraft(next.title);
    } else {
      setTitleDraft(detail.title);
    }
  };

  /* ── order ── */
  const reorder = useReorder(items, async (next) => {
    if (uploading) return;
    const before = items;
    setItems(next);
    const saved = await track(reorderHighlightItems(highlightId, next.map((item) => item.id)));
    if (saved) applyDetail(saved);
    else setItems(before);
  });

  /* ── cover ── */
  const makeCover = async (itemId: string) => {
    const before = coverItemId;
    setCoverItemId(itemId);
    const saved = await track(setHighlightCover(highlightId, itemId));
    if (!saved) setCoverItemId(before);
  };

  /* ── delete one image ── */
  const removeItem = async (itemId: string) => {
    setConfirmItemId(null);
    const ok = await track(deleteHighlightItem(highlightId, itemId).then(() => true));
    if (ok) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setCoverItemId((prev) => (prev === itemId ? null : prev));
    }
  };

  /* ── upload ── */
  const runBatch = async (batch: PendingTile[]) => {
    const failed = (keys: string[], message: string) =>
      setPending((prev) => prev.map((tile) => (keys.includes(tile.key) ? { ...tile, status: 'error', message } : tile)));
    let stopMessage: string | null = null;

    for (const part of chunk(batch, UPLOAD_CHUNK)) {
      const keys = part.map((tile) => tile.key);
      if (stopMessage) {
        failed(keys, stopMessage);
        continue;
      }
      setPending((prev) => prev.map((tile) => (keys.includes(tile.key) ? { ...tile, status: 'uploading' } : tile)));
      try {
        const outcome = await uploadHighlightImages(highlightId, part.map((tile) => tile.file));
        setItems((prev) => [...prev, ...outcome.items]);
        const failedNames = [...outcome.failed.map((entry) => entry.name)];
        setPending((prev) =>
          prev.flatMap((tile) => {
            if (!keys.includes(tile.key)) return [tile];
            const at = failedNames.indexOf(tile.file.name);
            if (at === -1) return []; // uploaded: the real tile replaces it
            failedNames.splice(at, 1);
            return [{ ...tile, status: 'error' as const, message: 'Yüklənmədi' }];
          }),
        );
        setProgress({ done: (progressRef.current.done += part.length), total: progressRef.current.total });
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const message =
          status === 429
            ? 'Çox tez-tez yükləyirsiniz. Bir az gözləyib "Yenidən cəhd et" basın.'
            : requestErrorMessage(err, 'Yüklənmədi. Yenidən cəhd edin.');
        if (status === 429) stopMessage = message;
        failed(keys, message);
        fail(message);
        setProgress({ done: (progressRef.current.done += part.length), total: progressRef.current.total });
      }
    }
  };

  const enqueue = (tiles: PendingTile[]) => {
    setPending((prev) => [...prev, ...tiles]);
    activeBatches.current += 1;
    progressRef.current.total += tiles.length;
    setProgress({ done: progressRef.current.done, total: progressRef.current.total });
    chain.current = chain.current
      .then(() => runBatch(tiles))
      .catch(() => {})
      .then(() => {
        activeBatches.current -= 1;
        if (activeBatches.current === 0) {
          progressRef.current = { done: 0, total: 0 };
          setProgress(null);
        }
      });
  };

  const makeTiles = (files: File[]): PendingTile[] =>
    files.map((file, index) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      return { key: `${Date.now()}-${index}-${file.name}`, file, preview, status: 'waiting' };
    });

  const handleFiles = (list: FileList | File[] | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length === 0) return;
    const { ok, messages } = checkFiles(files, room);
    setNotes(messages);
    if (ok.length > 0) enqueue(makeTiles(ok));
  };

  const retry = (tile: PendingTile) => {
    setPending((prev) => prev.filter((entry) => entry.key !== tile.key));
    enqueue([{ ...tile, status: 'waiting', message: undefined }]);
  };

  const dismiss = (tile: PendingTile) => {
    URL.revokeObjectURL(tile.preview);
    previews.current.delete(tile.preview);
    setPending((prev) => prev.filter((entry) => entry.key !== tile.key));
  };

  /* ── delete the whole highlight ── */
  const removeHighlight = async () => {
    await deleteHighlight(highlightId);
    onBack();
  };

  if (loadError) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft size={16} className="mr-2" aria-hidden="true" />
          Geri
        </Button>
        <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500" role="alert">
          {loadError}
        </p>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Yüklənir…
      </div>
    );
  }

  const reorderLocked = uploading;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-heading hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Geri
        </button>
        <SaveStatus state={saveState} />
      </div>

      <div>
        <label htmlFor="highlight-title" className="mb-1 block text-sm text-muted">
          Başlıq (müştəri bunu dairənin altında görür)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="highlight-title"
            type="text"
            value={titleDraft}
            maxLength={TITLE_MAX}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="h-10 w-full max-w-xs rounded-lg border border-field-border bg-surface px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <span className="shrink-0 whitespace-nowrap text-xs text-muted">
            {titleDraft.length} / {TITLE_MAX}
          </span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="font-medium text-heading">Şəkillər</span>
          <span className="text-muted">
            {items.length} / {MAX_ITEMS}
          </span>
          {progress && (
            <span className="inline-flex items-center gap-1.5 text-muted" aria-live="polite">
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              Yüklənir: {Math.min(progress.done, progress.total)} / {progress.total}
            </span>
          )}
        </div>

        <div
          className={`flex flex-wrap gap-3 rounded-xl border p-3 transition ${
            dropActive ? 'border-accent bg-accent/5' : 'border-edge bg-surface-alt'
          }`}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
              setDropActive(true);
            }
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            setDropActive(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          {items.map((item, index) => {
            const isCover = item.id === coverId;
            const confirming = confirmItemId === item.id;
            return (
              <div
                key={item.id}
                {...(reorderLocked ? {} : reorder.dragProps(index))}
                className={`flex w-24 flex-col items-center gap-1.5 transition ${
                  reorder.dragIndex === index ? 'opacity-40' : ''
                } ${
                  reorder.overIndex === index && reorder.dragIndex !== null && reorder.dragIndex !== index
                    ? 'rounded-lg ring-2 ring-accent'
                    : ''
                }`}
              >
                <div className="group relative h-[120px] w-24 overflow-hidden rounded-lg border border-edge bg-surface">
                  {item.url ? (
                    <img src={item.url} alt={`${index + 1}-ci şəkil`} className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-faint">
                      <ImageIcon size={22} aria-hidden="true" />
                    </div>
                  )}
                  <span
                    className="absolute left-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-surface/90 text-muted shadow-sm"
                    aria-hidden="true"
                  >
                    <GripVertical size={14} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmItemId(item.id)}
                    aria-label={`${index + 1}-ci şəkli sil`}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-muted shadow-sm transition hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                  {confirming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/95 p-2 text-center">
                      <span className="text-xs font-medium text-heading">Silinsin?</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          autoFocus
                          onClick={() => void removeItem(item.id)}
                          className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600"
                        >
                          Bəli
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmItemId(null)}
                          className="rounded-md border border-edge bg-surface px-2.5 py-1 text-xs font-medium text-heading hover:bg-surface-hover"
                        >
                          Xeyr
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => reorder.move(index, -1)}
                    disabled={index === 0 || reorderLocked}
                    aria-label={`${index + 1}-ci şəkli sola çək`}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-surface text-muted transition hover:text-heading disabled:opacity-30"
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorder.move(index, 1)}
                    disabled={index === items.length - 1 || reorderLocked}
                    aria-label={`${index + 1}-ci şəkli sağa çək`}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-surface text-muted transition hover:text-heading disabled:opacity-30"
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
                {isCover ? (
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Kover</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void makeCover(item.id)}
                    className="text-xs text-muted underline hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Kover et
                  </button>
                )}
              </div>
            );
          })}

          {pending.map((tile) => (
            <div key={tile.key} className="flex w-24 flex-col items-center gap-1.5">
              <div
                className={`relative h-[120px] w-24 overflow-hidden rounded-lg border bg-surface ${
                  tile.status === 'error' ? 'border-red-500' : 'border-edge'
                }`}
              >
                <img
                  src={tile.preview}
                  alt=""
                  className="h-full w-full object-cover opacity-60"
                  draggable={false}
                  onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {tile.status === 'error' ? (
                    <AlertCircle size={22} className="text-red-500" aria-hidden="true" />
                  ) : (
                    <Loader2 size={22} className="animate-spin text-heading" aria-label="Yüklənir" />
                  )}
                </div>
              </div>
              {tile.status === 'error' ? (
                <>
                  <p className="text-center text-xs leading-tight text-red-500" title={tile.message}>
                    {tile.message && tile.message.length > 60 ? `${tile.message.slice(0, 58)}…` : tile.message}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => retry(tile)}
                      className="inline-flex items-center gap-1 rounded-md border border-edge bg-surface px-2 py-1 text-xs text-heading hover:bg-surface-hover"
                    >
                      <RotateCw size={12} aria-hidden="true" />
                      Yenidən
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(tile)}
                      aria-label="Bu şəkli siyahıdan çıxar"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-surface text-muted hover:text-heading"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted">{tile.status === 'uploading' ? 'Yüklənir…' : 'Növbədə'}</span>
              )}
            </div>
          ))}

          {room > 0 && (
            <div className="flex w-24 flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-[120px] w-24 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-edge p-2 text-center text-xs text-muted transition hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ImagePlus size={24} aria-hidden="true" />
                Şəkil əlavə et
              </button>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        {items.length === 0 && pending.length === 0 && (
          <p className="mt-2 text-sm text-muted">Hələ şəkil yoxdur. "Şəkil əlavə et"ə basın və ya şəkilləri bura sürüşdürüb ata bilərsiniz.</p>
        )}
        <p className="mt-2 text-sm text-muted">
          Eyni anda bir neçə şəkil seçə bilərsiniz (hər biri ən çox 10 MB). Şəkilləri sürüşdürərək və ya ox düymələri ilə sıralayın. Kover dairənin üzündə görünən şəkildir.
        </p>
        {notes.length > 0 && (
          <ul className="mt-2 space-y-1 rounded-lg bg-red-500/10 p-3 text-sm text-red-500" role="alert">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-edge pt-4">
        <span className="text-sm text-muted">Bu highlight müştərinin profilində göstərilir.</span>
        <Button variant="danger" onClick={() => setConfirmDeleteAll(true)} disabled={uploading}>
          <Trash2 size={16} className="mr-2" aria-hidden="true" />
          Highlight-ı sil
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteAll}
        onClose={() => setConfirmDeleteAll(false)}
        onConfirm={removeHighlight}
        title="Highlight silinsin?"
        message={`"${detail.title}" və içindəki ${items.length} şəkil silinəcək. Bu əməliyyat geri qaytarılmır.`}
        confirmText="Sil"
        cancelText="Ləğv et"
      />
    </div>
  );
};
