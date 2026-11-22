import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import { api } from '../../lib/api';
import { requestErrorMessage } from '../../lib/apiHelpers';
import type { ApiEnvelope } from '../../lib/apiHelpers';
import { shareExpiryLabel, shareLastViewLabel, shareLinkState } from '../../lib/shareLink';
import type { ShareDuration, ShareLinkInfo } from '../../lib/shareLink';
import useToastStore from '../../store/useToastStore';

export interface ShareLinkClient extends ShareLinkInfo {
  id: string;
  name: string;
}

interface ShareLinkModalProps {
  client: ShareLinkClient | null;
  /** '/users' for admins, '/creator/clients' for creators. */
  apiBase: string;
  onClose: () => void;
  /** After the link was created, changed or revoked: the parent refreshes its list. */
  onChanged: (clientId: string, link: ShareLinkInfo) => void;
}

const DURATIONS: { value: ShareDuration; label: string }[] = [
  { value: 'never', label: 'Müddətsiz' },
  { value: '30d', label: '30 gün' },
];

/** Two-option pill: Müddətsiz | 30 gün. */
const DurationSwitch = ({
  value,
  onSelect,
  disabled,
}: {
  value: ShareDuration | null;
  onSelect: (d: ShareDuration) => void;
  disabled?: boolean;
}) => (
  <div className="inline-flex rounded-lg border border-edge bg-surface-alt p-0.5" role="radiogroup" aria-label="Linkin müddəti">
    {DURATIONS.map((d) => {
      const active = value === d.value;
      return (
        <button
          key={d.value}
          type="button"
          role="radio"
          aria-checked={active}
          disabled={disabled}
          onClick={() => onSelect(d.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors duration-200 disabled:opacity-60 ${
            active ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'
          }`}
        >
          {d.label}
        </button>
      );
    })}
  </div>
);

// Mounted per client (keyed by id below), so its state always starts from that client's link.
const ShareLinkModalBody = ({
  client,
  apiBase,
  onClose,
  onChanged,
}: ShareLinkModalProps & { client: ShareLinkClient }) => {
  const addToast = useToastStore((s) => s.addToast);
  const [link, setLink] = useState<ShareLinkInfo>(() => ({
    shareUrl: client.shareUrl ?? null,
    shareTokenExpiresAt: client.shareTokenExpiresAt ?? null,
    shareLastViewedAt: client.shareLastViewedAt ?? null,
  }));
  const [newDuration, setNewDuration] = useState<ShareDuration>('never');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [shown, setShown] = useState(() => Boolean(client.shareUrl));
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const state = shareLinkState(link);
  const currentDuration: ShareDuration | null = state === 'none' ? null : link.shareTokenExpiresAt ? '30d' : 'never';

  const update = (next: ShareLinkInfo) => {
    setLink(next);
    onChanged(client.id, next);
  };

  const createLink = async () => {
    setBusy(true);
    try {
      const res = await api.post<ApiEnvelope<{ url: string; expiresAt: string | null }>>(
        `${apiBase}/${client.id}/share-link`,
        { duration: newDuration },
      );
      setShown(false);
      update({ shareUrl: res.data.data.url, shareTokenExpiresAt: res.data.data.expiresAt, shareLastViewedAt: null });
      // Next frame: the link block fades in instead of popping.
      requestAnimationFrame(() => setShown(true));
    } catch (err) {
      addToast(requestErrorMessage(err, 'Link yaradıla bilmədi.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Same address, new expiry: an expired link opens again.
  const changeDuration = async (duration: ShareDuration) => {
    setBusy(true);
    try {
      const res = await api.patch<ApiEnvelope<{ url: string; expiresAt: string | null }>>(
        `${apiBase}/${client.id}/share-link`,
        { duration },
      );
      update({ ...link, shareTokenExpiresAt: res.data.data.expiresAt });
      addToast('Müddət yeniləndi.', 'success');
    } catch (err) {
      addToast(requestErrorMessage(err, 'Müddət dəyişdirilə bilmədi.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    try {
      await api.delete(`${apiBase}/${client.id}/share-link`);
      setRevoking(false);
      update({ shareUrl: null, shareTokenExpiresAt: null, shareLastViewedAt: null });
      addToast('Paylaşım linki ləğv edildi.', 'success');
    } catch (err) {
      addToast(requestErrorMessage(err, 'Link ləğv edilə bilmədi.'), 'error');
    }
  };

  const copy = async () => {
    if (!link.shareUrl) return;
    try {
      await navigator.clipboard.writeText(link.shareUrl);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast('Kopyalamaq alınmadı, linki əl ilə seçin.', 'error');
    }
  };

  return (
    <>
      <Modal isOpen onClose={onClose} title={`${client.name} — Paylaşım Linki`} size="sm">
        {state === 'none' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Müştəri bu linklə login olmadan bütün materiallarına baxa, rəy yaza, fayl endirə və mesaj göndərə bilər.
            </p>
            <div className="flex items-center justify-between gap-3 border-t border-edge pt-4">
              <DurationSwitch value={newDuration} onSelect={setNewDuration} disabled={busy} />
              <Button onClick={createLink} isLoading={busy}>
                Link yarat
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`space-y-4 transition-all duration-300 ease-out ${
              shown ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={link.shareUrl ?? ''}
                  aria-label="Paylaşım linki"
                  className="min-w-0 flex-1 rounded-lg border border-field-border bg-surface-alt px-3 py-2 text-sm text-body outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copy}
                  title="Kopyala"
                  aria-label={copied ? 'Kopyalandı' : 'Kopyala'}
                  className={copied ? 'border-emerald-500/40 text-emerald-500' : ''}
                >
                  <span className="relative block h-4 w-4">
                    <Copy
                      className={`absolute inset-0 h-4 w-4 transition-all duration-200 ${copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}
                    />
                    <Check
                      className={`absolute inset-0 h-4 w-4 transition-all duration-200 ${copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                    />
                  </span>
                </Button>
              </div>
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                <span className={state === 'expired' ? 'text-amber-500' : ''}>{shareExpiryLabel(link)}</span>
                <span aria-hidden="true">·</span>
                <span>{shareLastViewLabel(link)}</span>
                <span
                  className={`ml-auto text-emerald-500 transition-opacity duration-200 ${copied ? 'opacity-100' : 'opacity-0'}`}
                  aria-live="polite"
                >
                  {copied ? 'Kopyalandı' : ''}
                </span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-edge pt-4">
              <DurationSwitch value={currentDuration} onSelect={changeDuration} disabled={busy} />
              <button
                type="button"
                onClick={() => setRevoking(true)}
                className="text-xs font-medium text-red-500 transition-colors hover:text-red-600"
              >
                Ləğv et
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={revoking}
        onClose={() => setRevoking(false)}
        onConfirm={revoke}
        title="Paylaşım linkini ləğv et"
        message="Bu link artıq işləməyəcək. Müştəriyə yeni link lazım olsa, yenisini yaradıb göndərməlisiniz. Davam edək?"
        variant="danger"
        confirmText="Linki ləğv et"
        cancelText="İmtina"
      />
    </>
  );
};

const ShareLinkModal = (props: ShareLinkModalProps) =>
  props.client ? <ShareLinkModalBody key={props.client.id} {...props} client={props.client} /> : null;

/** Small dot next to the share button: green = link opens, grey = expired, nothing = no link. */
export const ShareStatusDot = ({ link }: { link: ShareLinkInfo }) => {
  const state = shareLinkState(link);
  if (state === 'none') return null;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
        state === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
      }`}
    />
  );
};

export default ShareLinkModal;
