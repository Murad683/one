import { useEffect, useMemo, useState } from 'react';
import {
  MAX_HIGHLIGHTS,
  createHighlight,
  listHighlights,
  reorderHighlights,
  type HighlightSummary,
} from '../../api/highlights.api';
import { requestErrorMessage } from '../../lib/apiHelpers';
import Combobox from '../ui/Combobox';
import { HighlightEditor } from './highlights/HighlightEditor';
import { HighlightGrid } from './highlights/HighlightGrid';
import { SaveStatus } from './highlights/SaveStatus';
import { useSaveStatus } from './highlights/useSaveStatus';

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

/**
 * "Önə çıxanlar" tab: pick a client, see their highlights as circles, open one to add and arrange
 * its images. Every change is saved at once (no "Save" button). Admins and creators use the same screen.
 */
export const HighlightsManager = ({ clients, onRefreshClients }: HighlightsManagerProps) => {
  const [clientId, setClientId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [loaded, setLoaded] = useState<{ clientId: string; list: HighlightSummary[] } | null>(null);
  const [failure, setFailure] = useState<{ clientId: string; message: string } | null>(null);
  const { state: saveState, track } = useSaveStatus();

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

  const list = loaded && loaded.clientId === clientId ? loaded.list : null;
  const error = failure && failure.clientId === clientId ? failure.message : '';

  const reload = () => setReloadTick((tick) => tick + 1);

  const handleCreate = async (title: string) => {
    const created = await track(createHighlight(clientId, title), 'Highlight yaradıla bilmədi.');
    if (created) {
      reload();
      onRefreshClients();
      setEditingId(created.id);
    }
  };

  const handleReorder = async (next: HighlightSummary[]) => {
    setLoaded({ clientId, list: next });
    const saved = await track(reorderHighlights(clientId, next.map((entry) => entry.id)));
    if (saved) setLoaded({ clientId, list: saved });
    else reload();
  };

  const closeEditor = () => {
    setEditingId(null);
    reload();
    onRefreshClients();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <h3 className="mb-1 text-lg font-semibold text-heading">Önə çıxanlar (Highlights)</h3>
        <p className="mb-4 text-sm text-muted">
          Müştərinin profilindəki dairələr. Hər highlight-a bir neçə şəkil əlavə edə bilərsiniz, müştəri üzərinə basıb story kimi izləyir.
        </p>

        <div className="mb-6 max-w-md">
          <Combobox
            label="Müştəri seçin"
            options={options}
            value={clientId}
            onChange={(value) => {
              setClientId(value);
              setEditingId(null);
            }}
            placeholder="Müştəri axtar..."
          />
        </div>

        {!client && (
          <div className="rounded-xl border border-dashed border-edge bg-surface-alt p-8 text-center text-muted">
            Highlight-ları idarə etmək üçün yuxarıdan müştəri seçin.
          </div>
        )}

        {client && editingId && <HighlightEditor key={editingId} highlightId={editingId} onBack={closeEditor} />}

        {client && !editingId && (
          <div className="space-y-4 border-t border-edge pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-heading">{client.name}</h4>
                {client.email && <p className="text-sm text-muted">{client.email}</p>}
              </div>
              <div className="flex items-center gap-3">
                <SaveStatus state={saveState} />
                {list && (
                  <span className="rounded-md border border-edge bg-surface-alt px-2 py-1 text-xs font-medium text-muted">
                    {list.length} / {MAX_HIGHLIGHTS}
                  </span>
                )}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            {!error && !list && <p className="text-sm text-muted">Yüklənir…</p>}
            {list && (
              <HighlightGrid
                highlights={list}
                onOpen={setEditingId}
                onCreate={handleCreate}
                onReorder={(next) => void handleReorder(next)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HighlightsManager;
