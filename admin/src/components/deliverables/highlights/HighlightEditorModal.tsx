import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Archive, Image as ImageIcon, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  MAX_ITEMS,
  TITLE_MAX,
  createHighlight,
  deleteHighlight,
  getHighlight,
  getHighlightZipTicket,
  saveHighlight,
  type HighlightDetail,
} from '../../../api/highlights.api';
import { requestErrorMessage } from '../../../lib/apiHelpers';
import useToastStore from '@/store/useToastStore';
import Button from '../../ui/Button';
import ConfirmDialog from '../../ui/ConfirmDialog';
import Modal from '../../ui/Modal';
import { ImageTile } from './ImageTile';
import { SortableGrid } from './SortableGrid';
import { IMAGE_ACCEPT, useHighlightDraft, type DraftInitial } from './useHighlightDraft';

interface HighlightEditorModalProps {
  clientId: string;
  /** null = a new highlight. */
  highlightId: string | null;
  onClose: () => void;
  /** Something changed on the server (saved or deleted): refresh the list. */
  onChanged: () => void;
}

const EMPTY: DraftInitial = { title: '', coverItemId: null, items: [] };

const hasFiles = (event: React.DragEvent): boolean => Array.from(event.dataTransfer.types).includes('Files');

interface BodyProps extends HighlightEditorModalProps {
  /** The loaded highlight (undefined for a new one). */
  detail?: HighlightDetail;
}

/** The editor itself. Everything on screen is a draft until "Yadda saxla"; "Ləğv et" drops it all. */
const DraftEditor = ({ clientId, highlightId, detail, onClose, onChanged }: BodyProps) => {
  const initial = detail ?? EMPTY;
  const draft = useHighlightDraft(initial);
  const addToast = useToastStore((state) => state.addToast);
  const fileInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);

  const busy = saving;
  const dialogOpen = confirmClose || confirmDelete;

  // Closing the tab or reloading with unsaved work.
  useEffect(() => {
    if (!draft.dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft.dirty]);

  const leave = () => {
    draft.discardAll();
    onClose();
  };

  // ×, Esc, the dark backdrop and "Ləğv et" all end up here.
  const requestClose = () => {
    if (busy || dialogOpen) return;
    if (draft.dirty) setConfirmClose(true);
    else leave();
  };

  const pickFiles = (files: FileList | File[] | null) => setNotes(draft.addFiles(files));

  const handleSave = async () => {
    if (!draft.canSave || busy) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = draft.toPayload();
      if (highlightId) await saveHighlight(highlightId, payload, detail?.updatedAt ?? '');
      else await createHighlight(clientId, payload);
      draft.markSaved();
      addToast('Yadda saxlandı', 'success');
      onChanged();
      onClose();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) setConflict(true);
      else setSaveError(requestErrorMessage(err, 'Yadda saxlanmadı. Yenidən cəhd edin.'));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!highlightId) return;
    try {
      await deleteHighlight(highlightId);
    } catch (err) {
      setConfirmDelete(false);
      setSaveError(requestErrorMessage(err, 'Highlight silinmədi. Yenidən cəhd edin.'));
      return;
    }
    draft.markSaved();
    addToast('Highlight silindi', 'success');
    onChanged();
    onClose();
  };

  // ZIP of the saved highlight (what the client has), like "Hamısını yüklə" on posts.
  const canZip = Boolean(highlightId) && (detail?.items.length ?? 0) >= 2;
  const handleDownloadAll = async () => {
    if (!highlightId || zipBusy) return;
    setZipBusy(true);
    try {
      const ticket = await getHighlightZipTicket(highlightId);
      const apiBase = import.meta.env.VITE_API_BASE_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1`;
      const link = document.createElement('a');
      link.href = `${apiBase}/downloads/${ticket}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const timedOut = (err as { code?: string })?.code === 'ECONNABORTED';
      addToast(
        requestErrorMessage(err, timedOut ? 'Hazırlanması çox çəkdi, yenidən cəhd edin.' : 'ZIP hazırlana bilmədi. Yenidən cəhd edin.'),
        'error',
      );
    } finally {
      setZipBusy(false);
    }
  };

  const coverItem = draft.items.find((item) => item.key === draft.effectiveCover);
  const coverSrc = coverItem ? (coverItem.kind === 'saved' ? coverItem.url : coverItem.preview) : null;
  const full = draft.room <= 0;

  const addTile = full ? null : (
    <button
      type="button"
      onClick={() => fileInput.current?.click()}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        draft.items.length === 0 ? 'col-span-full min-h-40 py-8' : 'aspect-[3/4]'
      } ${dropActive ? 'border-accent bg-accent/10 text-accent' : 'border-edge text-muted hover:border-accent hover:text-accent'}`}
    >
      <ImagePlus size={22} aria-hidden="true" />
      <span className="px-2 text-center">
        {draft.items.length === 0 ? 'Şəkilləri seçin və ya bura sürüşdürün' : 'Şəkil əlavə et'}
      </span>
    </button>
  );

  let status: { text: string; tone: 'error' | 'warn' | 'muted' } | null = null;
  if (saveError) status = { text: saveError, tone: 'error' };
  else if (draft.dirty && draft.problem) status = { text: draft.problem, tone: 'warn' };
  else if (draft.dirty) status = { text: 'Yadda saxlanmamış dəyişiklik var', tone: 'warn' };
  else if (!highlightId && draft.problem) status = { text: 'Başlıq yazın və şəkil əlavə edin.', tone: 'muted' };

  const footer = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {highlightId && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          aria-label="Highlight-ı sil"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span className="max-sm:sr-only">Highlight-ı sil</span>
        </button>
      )}
      {status && (
        <p
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={`order-first basis-full text-sm sm:order-none sm:flex-1 sm:basis-0 ${
            status.tone === 'error' ? 'text-red-500' : status.tone === 'warn' ? 'text-amber-500' : 'text-muted'
          }`}
        >
          {status.text}
        </p>
      )}
      <div className="ml-auto flex shrink-0 gap-2">
        <Button variant="secondary" onClick={requestClose} disabled={busy}>
          Ləğv et
        </Button>
        <Button onClick={() => void handleSave()} disabled={!draft.canSave || conflict} isLoading={saving}>
          Yadda saxla
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen
        onClose={requestClose}
        title={highlightId ? 'Highlight-ı redaktə et' : 'Yeni highlight'}
        size="xl"
        footer={footer}
        fullScreenOnMobile
      >
        <div
          className="space-y-6"
          onDragOver={(event) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
          }}
          onDrop={(event) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            setDropActive(false);
            pickFiles(event.dataTransfer.files);
          }}
        >
          {conflict && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500" role="alert">
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="space-y-2">
                <p>Bu highlight başqa yerdə dəyişdirilib. Səhifəni yeniləyin.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onChanged();
                    leave();
                  }}
                >
                  Bağla və yenilə
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 rounded-xl bg-surface-alt p-4">
            <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-edge bg-surface shadow-sm">
                {coverSrc ? (
                  <img src={coverSrc} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <ImageIcon size={22} className="text-faint" aria-hidden="true" />
                )}
              </span>
              <span className="w-full truncate text-center text-xs font-medium text-body">{draft.title.trim() || 'Başlıq'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="highlight-title" className="mb-1 flex items-baseline justify-between gap-2 text-sm text-muted">
                <span>Başlıq (müştəri dairənin altında görür)</span>
                <span className="shrink-0 text-xs">
                  {draft.title.length} / {TITLE_MAX}
                </span>
              </label>
              <input
                id="highlight-title"
                type="text"
                value={draft.title}
                maxLength={TITLE_MAX}
                autoFocus={!highlightId}
                onChange={(event) => draft.setTitle(event.target.value)}
                placeholder="Məsələn: Menyu"
                className="h-10 w-full rounded-lg border border-field-border bg-surface px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-heading">
                Şəkillər{' '}
                <span className="font-normal text-muted">
                  {draft.items.length} / {MAX_ITEMS}
                </span>
              </h3>
              {canZip && (
                <button
                  type="button"
                  onClick={() => void handleDownloadAll()}
                  disabled={zipBusy}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:opacity-60"
                >
                  {zipBusy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
                  {zipBusy ? 'Hazırlanır…' : 'Hamısını yüklə (ZIP)'}
                </button>
              )}
            </div>

            <SortableGrid
              items={draft.items}
              getId={(item) => item.key}
              getLabel={(_, index) => `${index + 1}-ci şəkil`}
              onReorder={draft.reorder}
              className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
              trailing={addTile}
              renderItem={(item, index) => (
                <ImageTile
                  item={item}
                  index={index}
                  isCover={item.key === draft.effectiveCover}
                  onCover={() => draft.setCover(item.key)}
                  onRemove={() => draft.remove(item.key)}
                  onRetry={() => draft.retry(item.key)}
                />
              )}
            />

            {notes.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-500">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}

            <p className="text-sm text-muted">
              Sıranı dəyişmək üçün şəkli sürüşdürün (telefonda uzun basıb). Şəkillər "Yadda saxla"-dan sonra müştəriyə görünür.
            </p>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            pickFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          leave();
        }}
        title="Dəyişikliklər yadda saxlanmayıb"
        message="İndi çıxsanız etdiyiniz dəyişikliklər itəcək."
        confirmText="Çıx, dəyişiklikləri at"
        cancelText="Redaktəyə qayıt"
      />
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Highlight silinsin?"
        message="Highlight və içindəki bütün şəkillər silinəcək. Bu əməliyyat geri qaytarılmır."
        confirmText="Sil"
        cancelText="Ləğv et"
      />
    </>
  );
};

/** Opens the editor for one highlight (loads it first) or for a new one. */
export const HighlightEditorModal = (props: HighlightEditorModalProps) => {
  const { highlightId, onClose } = props;
  const [loaded, setLoaded] = useState<{ id: string; detail: HighlightDetail } | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!highlightId) return undefined;
    let cancelled = false;
    getHighlight(highlightId)
      .then((detail) => {
        if (!cancelled) setLoaded({ id: highlightId, detail });
      })
      .catch((err) => {
        if (!cancelled) setFailure({ id: highlightId, message: requestErrorMessage(err, 'Highlight yüklənmədi.') });
      });
    return () => {
      cancelled = true;
    };
  }, [highlightId, attempt]);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((value) => value + 1);
  }, []);

  if (!highlightId) return <DraftEditor {...props} />;
  if (loaded && loaded.id === highlightId) return <DraftEditor {...props} detail={loaded.detail} />;

  const message = failure && failure.id === highlightId ? failure.message : '';
  return (
    <Modal isOpen onClose={onClose} title="Highlight-ı redaktə et" size="xl" fullScreenOnMobile>
      {message ? (
        <div className="space-y-4 py-4">
          <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500" role="alert">
            {message}
          </p>
          <div className="flex gap-2">
            <Button onClick={retry}>Yenidən cəhd et</Button>
            <Button variant="secondary" onClick={onClose}>
              Bağla
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Yüklənir…
        </div>
      )}
    </Modal>
  );
};

export default HighlightEditorModal;
