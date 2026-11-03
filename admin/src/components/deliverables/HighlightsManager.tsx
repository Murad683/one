import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Pencil, Plus, X } from 'lucide-react';
import {
  MAX_HIGHLIGHTS,
  deleteHighlight,
  listHighlights,
  reorderHighlights,
  type HighlightSummary,
} from '../../api/highlights.api';
import { requestErrorMessage } from '../../lib/apiHelpers';
import useToastStore from '@/store/useToastStore';
import Button from '../ui/Button';
import Combobox from '../ui/Combobox';
import ConfirmDialog from '../ui/ConfirmDialog';
import { HighlightEditorModal } from './highlights/HighlightEditorModal';
import { SortableGrid } from './highlights/SortableGrid';

interface HighlightClient {
  id: string;
  name: string;
  email?: string;
  /** Highlights on the client's profile (rows, or the older one-image form). */
  highlightCount?: number;
}

interface HighlightsManagerProps {
  clients: HighlightClient[];
  onRefreshClients: () => void;
}

/** The list in the order the admin dragged it into (ids the server does not know yet go last). */
const applyOrder = (list: HighlightSummary[], order: string[] | null): HighlightSummary[] => {
  if (!order) return list;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...list].sort((a, b) => (rank.get(a.id) ?? order.length) - (rank.get(b.id) ?? order.length));
};

/**
 * "Önə çıxanlar" tab: pick a client, see their highlights as circles, open one in an editor window.
 * Nothing reaches the client until "Yadda saxla" (in the editor, or in the bar that appears after
 * the circles were rearranged). Admins and creators use the same screen.
 */
export const HighlightsManager = ({ clients, onRefreshClients }: HighlightsManagerProps) => {
  const [clientId, setClientId] = useState('');
  const [editor, setEditor] = useState<{ highlightId: string | null } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [loaded, setLoaded] = useState<{ clientId: string; list: HighlightSummary[] } | null>(null);
  const [failure, setFailure] = useState<{ clientId: string; message: string } | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<HighlightSummary | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const client = clients.find((entry) => entry.id === clientId);
  const options = useMemo(
    () =>
      clients.map((entry) => {
        const count = entry.highlightCount ?? 0;
        return {
          value: entry.id,
          label: entry.name,
          subLabel: [entry.email, count > 0 ? `${count} highlight` : 'highlight yoxdur'].filter(Boolean).join(' · '),
        };
      }),
    [clients],
  );

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    listHighlights(clientId)
      .then((list) => {
        if (cancelled) return;
        setLoaded({ clientId, list });
        setFailure(null);
      })
      .catch((err) => {
        if (!cancelled) setFailure({ clientId, message: requestErrorMessage(err, 'Highlight-lar yüklənmədi.') });
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, reloadTick]);

  // Rearranged circles that are not saved yet: warn before the tab or page is closed.
  useEffect(() => {
    if (!order) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [order]);

  const list = loaded && loaded.clientId === clientId ? loaded.list : null;
  const error = failure && failure.clientId === clientId ? failure.message : '';
  const shown = list ? applyOrder(list, order) : null;
  const full = (list?.length ?? 0) >= MAX_HIGHLIGHTS;

  const reload = () => setReloadTick((tick) => tick + 1);

  const selectClient = (value: string) => {
    if (value === clientId) return;
    if (order) setSwitchTo(value);
    else setClientId(value);
  };

  const handleReorder = (ids: string[]) => {
    const original = (list ?? []).map((entry) => entry.id);
    const same = ids.length === original.length && ids.every((id, index) => id === original[index]);
    setOrder(same ? null : ids);
  };

  const saveOrder = async () => {
    if (!order || savingOrder) return;
    setSavingOrder(true);
    try {
      const saved = await reorderHighlights(clientId, order);
      setLoaded({ clientId, list: saved });
      setOrder(null);
      addToast('Sıra yadda saxlandı', 'success');
    } catch (err) {
      addToast(requestErrorMessage(err, 'Sıra yadda saxlanmadı. Yenidən cəhd edin.'), 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    try {
      await deleteHighlight(target.id);
    } catch (err) {
      setDeleting(null);
      addToast(requestErrorMessage(err, 'Highlight silinmədi. Yenidən cəhd edin.'), 'error');
      return;
    }
    setDeleting(null);
    setOrder((prev) => {
      const next = prev ? prev.filter((id) => id !== target.id) : null;
      return next && next.length > 0 ? next : null;
    });
    addToast('Highlight silindi', 'success');
    reload();
    onRefreshClients();
  };

  const closeEditor = () => setEditor(null);
  const handleChanged = () => {
    reload();
    onRefreshClients();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-xl border border-edge bg-surface p-4 shadow-sm sm:p-6">
        <h3 className="mb-1 text-lg font-semibold text-heading">Önə çıxanlar (Highlights)</h3>
        <p className="mb-4 text-sm text-muted">
          Müştərinin profilindəki dairələr. Hər highlight-a bir neçə şəkil əlavə edə bilərsiniz, müştəri üzərinə basıb story kimi izləyir.
        </p>

        <div className="mb-6 max-w-md">
          <Combobox
            label="Müştəri seçin"
            options={options}
            value={clientId}
            onChange={selectClient}
            placeholder="Müştəri axtar..."
          />
        </div>

        {!client && (
          <div className="rounded-xl border border-dashed border-edge bg-surface-alt p-8 text-center text-muted">
            Highlight-ları idarə etmək üçün yuxarıdan müştəri seçin.
          </div>
        )}

        {client && (
          <div className="space-y-4 border-t border-edge pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-heading">{client.name}</h4>
                {client.email && <p className="text-sm text-muted">{client.email}</p>}
              </div>
              {list && (
                <span className="rounded-md border border-edge bg-surface-alt px-2 py-1 text-xs font-medium text-muted">
                  {list.length} / {MAX_HIGHLIGHTS}
                </span>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            {!error && !shown && <p className="text-sm text-muted">Yüklənir…</p>}

            {shown && (
              <div className="space-y-3">
                <SortableGrid
                  items={shown}
                  getId={(entry) => entry.id}
                  getLabel={(entry) => `${entry.title} highlight-ı`}
                  onReorder={handleReorder}
                  disabled={savingOrder}
                  className="flex flex-wrap items-start gap-x-1 sm:gap-x-3 gap-y-5 rounded-xl border border-edge bg-surface-alt p-3 sm:p-4"
                  renderItem={(entry) => (
                    <div className="relative w-[4.75rem] sm:w-24">
                      <button
                        type="button"
                        onClick={() => setEditor({ highlightId: entry.id })}
                        aria-label={`${entry.title} highlight-ını redaktə et`}
                        className="group flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg p-1 focus:outline-none"
                      >
                        <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-edge bg-surface shadow-sm transition group-hover:border-accent">
                          {entry.coverUrl ? (
                            <img src={entry.coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                          ) : (
                            <ImageIcon size={20} className="text-faint" aria-hidden="true" />
                          )}
                          <span className="absolute inset-0 hidden items-center justify-center bg-black/45 text-white group-hover:flex">
                            <Pencil size={18} aria-hidden="true" />
                          </span>
                        </span>
                        <span className="w-full truncate text-center text-xs font-medium text-body" title={entry.title}>
                          {entry.title}
                        </span>
                        <span className="text-xs text-muted">{entry.itemCount} şəkil</span>
                      </button>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-1.5 top-[2.9rem] flex h-5 w-5 items-center justify-center rounded-full border border-edge bg-surface text-muted shadow-sm sm:right-3.5"
                      >
                        <Pencil size={10} />
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeleting(entry)}
                        aria-label={`${entry.title} highlight-ını sil`}
                        title="Sil"
                        className="absolute right-0.5 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-edge bg-surface text-muted shadow-sm transition hover:border-red-500 hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:right-3"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  trailing={
                    full ? null : (
                      <button
                        type="button"
                        onClick={() => setEditor({ highlightId: null })}
                        className="flex w-[4.75rem] sm:w-24 flex-col items-center gap-1.5 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-muted transition hover:border-accent hover:text-accent">
                          <Plus size={22} aria-hidden="true" />
                        </span>
                        <span className="w-full text-center text-xs font-medium text-body">Yeni highlight</span>
                      </button>
                    )
                  }
                />

                {shown.length === 0 && (
                  <p className="text-sm text-muted">Bu müştərinin hələ highlight-ı yoxdur. "Yeni highlight" ilə başlayın.</p>
                )}
                {full && <p className="text-sm text-muted">Bir müştəridə ən çox {MAX_HIGHLIGHTS} highlight ola bilər.</p>}
                <p className="text-sm text-muted">
                  Redaktə üçün dairəyə basın (✎). Silmək üçün küncdəki × düyməsi. Sıranı dəyişmək üçün dairəni sürüşdürün (telefonda uzun basıb).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {order && (
        <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-xl border border-edge bg-surface p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-sm font-medium text-heading">Sıra dəyişdi, müştəri hələ köhnə sıranı görür.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOrder(null)} disabled={savingOrder} className="max-sm:flex-1">
              Ləğv et
            </Button>
            <Button onClick={() => void saveOrder()} isLoading={savingOrder} className="max-sm:flex-1">
              Yadda saxla
            </Button>
          </div>
        </div>
      )}

      {client && editor && (
        <HighlightEditorModal
          key={editor.highlightId ?? 'new'}
          clientId={client.id}
          highlightId={editor.highlightId}
          onClose={closeEditor}
          onChanged={handleChanged}
        />
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Highlight silinsin?"
        message={`"${deleting?.title ?? ''}" highlight-ı və içindəki ${deleting?.itemCount ?? 0} şəkil silinəcək. Bu əməliyyat geri qaytarılmır.`}
        confirmText="Sil"
        cancelText="Ləğv et"
      />

      <ConfirmDialog
        isOpen={switchTo !== null}
        onClose={() => setSwitchTo(null)}
        onConfirm={() => {
          setOrder(null);
          setClientId(switchTo ?? '');
          setSwitchTo(null);
        }}
        title="Sıra yadda saxlanmayıb"
        message="Müştərini dəyişsəniz sıra dəyişikliyi itəcək."
        confirmText="Davam et"
        cancelText="Geri qayıt"
      />
    </div>
  );
};

export default HighlightsManager;
