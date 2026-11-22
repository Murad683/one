import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ProfileFeed } from './portal/DeliverablesPage';
import type { Deliverable, FeedProfile, FeedSource } from './portal/DeliverablesPage';
import type { HighlightDetail, HighlightSummary } from '../components/ui/highlightTypes';

interface SharedClientProfile {
  name: string;
  igUsername: string | null;
  igBio: string | null;
  igFollowers: string | null;
  igFollowing: string | null;
  igPostsCount: string | null;
  igProfilePic: string | null;
}

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// A separate, interceptor-free instance — this page has no logged-in user, so apiClient's Bearer-token
// attach and 401→/portal redirect don't apply here. The API asks every write for an x-csrf-token header.
const publicApi = axios.create({ baseURL: `${BACKEND}/api/v1`, headers: { 'x-csrf-token': '1' } });

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** The "Message" button on a share link: a short note to the team, delivered as a support request. */
const MessageSheet = ({ token, onClose }: { token: string; onClose: () => void }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!sent) return;
    const t = window.setTimeout(onClose, 1800);
    return () => window.clearTimeout(t);
  }, [sent, onClose]);

  const canSend = subject.trim().length >= 2 && body.trim().length >= 10 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      await publicApi.post(`/share/${token}/tickets`, { subject: subject.trim(), body: body.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Mesaj göndərilə bilmədi. Yenidən cəhd edin.'));
    } finally {
      setSending(false);
    }
  };

  const field = 'w-full rounded-lg px-3 py-2 text-[14px] outline-none border';
  const fieldStyle = { backgroundColor: 'var(--ig-btn-gray-bg)', borderColor: 'var(--ig-border)', color: 'var(--ig-text)' };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Mesaj"
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl overflow-hidden border"
        style={{ backgroundColor: 'var(--ig-bg)', color: 'var(--ig-text)', borderColor: 'var(--ig-border)' }}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center h-12 border-b" style={{ borderColor: 'var(--ig-border)' }}>
          <p className="text-[16px] font-semibold">Mesaj</p>
          <button type="button" onClick={onClose} className="absolute right-3 p-1" aria-label="Bağla">
            <X size={22} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[15px] font-semibold">Mesajınız göndərildi</p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--ig-text-secondary)' }}>
              Komanda mesajınızı aldı.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mövzu"
              maxLength={200}
              className={field}
              style={fieldStyle}
              autoFocus
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Mesajınızı yazın..."
              maxLength={5000}
              rows={5}
              className={`${field} resize-none`}
              style={fieldStyle}
            />
            {error && <p className="text-[13px] text-red-500">{error}</p>}
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="w-full py-2 text-[14px] font-semibold rounded-lg bg-[#0095F6] text-white transition-opacity disabled:opacity-40"
            >
              {sending ? 'Göndərilir...' : 'Göndər'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const SharePage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [client, setClient] = useState<SharedClientProfile | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  // A client's link: keep it out of search engines (the site's own robots tag says "index").
  useEffect(() => {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const meta = existing ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'robots' }));
    const previous = existing?.content;
    meta.content = 'noindex, nofollow';
    return () => {
      if (existing) existing.content = previous ?? '';
      else meta.remove();
    };
  }, []);

  // The same feed as the signed-in portal, through /share/:token/*.
  const source = useMemo<FeedSource>(
    () => ({
      fetchPage: async (page) => {
        try {
          const res = await publicApi.get(`/share/${token}?page=${page}&limit=6`);
          const data = res.data as {
            data: Deliverable[];
            meta: { hasMore: boolean; total: number; client: SharedClientProfile };
          };
          setClient(data.meta.client);
          return { items: data.data, total: data.meta.total, hasMore: data.meta.hasMore };
        } catch (err) {
          if (page === 1) setInvalid(true);
          throw err;
        }
      },
      listHighlights: async () => {
        const res = await publicApi.get(`/share/${token}/highlights`);
        return (res.data?.data ?? []) as HighlightSummary[];
      },
      loadHighlight: async (id) => (await publicApi.get(`/share/${token}/highlights/${id}`)).data.data as HighlightDetail,
      highlightZipTicket: async (id) =>
        (await publicApi.post(`/share/${token}/highlights/${id}/zip-ticket`, undefined, { timeout: 60000 })).data.data
          .ticket as string,
      actions: {
        submitFeedback: async (id, text) =>
          (await publicApi.patch(`/share/${token}/deliverables/${id}/feedback`, { clientFeedback: text })).data.data
            .clientFeedback as string,
        deleteFeedback: async (id) => {
          await publicApi.delete(`/share/${token}/deliverables/${id}/feedback`);
        },
        zipTicket: async (id) =>
          (await publicApi.post(`/share/${token}/deliverables/${id}/zip-ticket`, undefined, { timeout: 60000 })).data
            .data.ticket as string,
      },
    }),
    [token],
  );

  const profile: FeedProfile = {
    name: client?.name || '',
    igUsername: client?.igUsername || 'username',
    igBio: client?.igBio || '',
    igFollowers: client?.igFollowers || '0',
    igFollowing: client?.igFollowing || '0',
    igPostsCount: client?.igPostsCount || '0',
    igProfilePic: client?.igProfilePic || null,
  };

  if (invalid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ backgroundColor: 'var(--ig-bg)', color: 'var(--ig-text)' }}>
        <p className="text-lg font-semibold">Bu link etibarsızdır və ya vaxtı bitib</p>
        <p className="text-sm" style={{ color: 'var(--ig-text-secondary)' }}>Zəhmət olmasa yeni link üçün agentliklə əlaqə saxlayın.</p>
      </div>
    );
  }

  return (
    <>
      <ProfileFeed source={source} profile={profile} onMessage={() => setMessageOpen(true)} />
      <AnimatePresence>
        {messageOpen && <MessageSheet token={token} onClose={() => setMessageOpen(false)} />}
      </AnimatePresence>
    </>
  );
};

export default SharePage;
