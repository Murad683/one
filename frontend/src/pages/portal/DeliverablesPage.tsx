import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { Download, Play, X, Send, FileX } from 'lucide-react';

interface Deliverable {
  id: string;
  title: string;
  type: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string; isVideo: boolean } | null;
  status: string;
  month: number;
  year: number;
  files: { url: string; name: string; size: number; type: string; downloadUrl?: string | null }[];
  notes: string | null;
  clientFeedback: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Gözləyir', color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
  PROCESSING: { label: 'Hazırlanır', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
  READY: { label: 'Hazırdır', color: 'var(--accent-text)', bg: 'var(--glow-accent-subtle)' },
  ARCHIVED: { label: 'Arxiv', color: 'var(--text-faint)', bg: 'var(--bg-elevated)' },
};

const typeLabels: Record<string, string> = {
  VIDEO: 'Video Material',
  SMM_DESIGN: 'SMM Dizayn',
  BRANDING: 'Brendinq / Loqo',
  REPORT: 'Hesabat / Sənəd',
  OTHER: 'Digər',
};

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ─── Media Type Helpers ─────────────────────── */
const getExt = (fileName: string | null): string =>
  fileName?.split('.').pop()?.toLowerCase() ?? '';

const isVideoFile = (mimeType: string | null, fileName: string | null): boolean => {
  if (mimeType?.startsWith('video/')) return true;
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(getExt(fileName));
};

const isImageFile = (mimeType: string | null, fileName: string | null): boolean => {
  if (mimeType?.startsWith('image/')) return true;
  return ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(getExt(fileName));
};

const getFileUrl = (f: { url: string; downloadUrl?: string | null } | null | undefined): string => {
  if (!f) return '';
  if (f.downloadUrl) return f.downloadUrl;
  if (!f.url) return '';
  if (f.url.startsWith('http')) return f.url;
  
  const normalized = f.url.replace(/\\/g, '/');
  if (normalized.includes('/uploads/')) {
    const idx = normalized.indexOf('/uploads/');
    return `${BACKEND}${normalized.substring(idx)}`;
  }
  
  if (normalized.startsWith('uploads/')) {
    return `${BACKEND}/${normalized}`;
  }

  // If it's an Azure storage key without a SAS token, return as-is
  return f.url;
};

/* ─── Skeleton Row ───────────────────────────── */
const SkeletonRow = () => (
  <div className="flex items-center justify-between py-5 animate-pulse">
    <div className="flex flex-col gap-2">
      <div className="h-4 w-28 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="h-3 w-40 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
    </div>
    <div className="h-5 w-16 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }} />
  </div>
);

/* ─── Dynamic Media Preview ──────────────────── */
const MediaPreview = ({
  url,
  mimeType,
  fileName,
}: {
  url: string;
  mimeType: string | null;
  fileName: string | null;
}) => {
  if (!url) return null;

  if (isVideoFile(mimeType, fileName)) {
    return (
      <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
        <video controls autoPlay={false} className="w-full max-h-[70vh]" src={url}>
          Brauzeriniz video formatını dəstəkləmir.
        </video>
      </div>
    );
  }

  if (isImageFile(mimeType, fileName)) {
    return (
      <div
        className="w-full flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <img
          src={url}
          alt="Önizləmə"
          className="object-contain w-full max-h-[70vh] rounded-lg"
        />
      </div>
    );
  }

  // PDF, ZIP, AI, etc. — no inline preview
  return (
    <div
      className="flex flex-col items-center justify-center py-12 gap-3"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      <FileX size={36} style={{ color: 'var(--text-ghost)' }} />
      <p className="text-xs text-center px-6" style={{ color: 'var(--text-muted)' }}>
        Bu fayl növü üçün önizləmə yoxdur. Zəhmət olmasa yükləyin.
      </p>
    </div>
  );
};

/* ─── Preview Modal ──────────────────────────── */
const PreviewModal = ({
  item,
  onClose,
  onFeedbackSent,
}: {
  item: Deliverable;
  onClose: () => void;
  onFeedbackSent: (id: string, fullFeedback: string) => void;
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState(item.clientFeedback || '');
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const activeFile = item.files?.[activeIndex];
  const url = getFileUrl(activeFile);

  const handleSendFeedback = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    setError('');
    try {
      const res = (await apiClient.patch(`/dashboard/deliverables/${item.id}/feedback`, {
        clientFeedback: newMessage,
      })) as { data: { clientFeedback: string } };
      const updated = res.data.clientFeedback;
      setFeedbackHistory(updated);
      setNewMessage('');
      onFeedbackSent(item.id, updated);
    } catch {
      setError('Rəy göndərilə bilmədi. Yenidən cəhd edin.');
    } finally {
      setIsSending(false);
    }
  };



  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ backgroundColor: 'var(--modal-backdrop)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--card-border)',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.title || item.category?.name || typeLabels[item.type || ''] || item.type || 'Fayl'}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {item.category?.name || typeLabels[item.type || ''] || item.type} — {statusConfig[item.status]?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={activeFile.downloadUrl || url}
                download={activeFile.name || 'file'}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-text)', backgroundColor: 'var(--glow-accent-subtle)' }}
              >
                <Download size={12} />
                Yüklə
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--text-faint)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto">
          {/* Dynamic Media Preview */}
          {activeFile && <MediaPreview url={url} mimeType={activeFile.type} fileName={activeFile.name} />}
          
          {/* Thumbnails strip if multiple files */}
          {item.files && item.files.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-4 w-full justify-center" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
              {item.files.map((f, idx) => (
                <button
                  key={f.url}
                  onClick={() => setActiveIndex(idx)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === activeIndex ? 'border-blue-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {isImageFile(f.type, f.name) ? (
                    <img src={getFileUrl(f)} className="w-full h-full object-cover" alt={f.name} />
                  ) : isVideoFile(f.type, f.name) ? (
                    <div className="w-full h-full bg-black flex items-center justify-center"><Play className="h-6 w-6 text-white" /></div>
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center"><FileX className="h-6 w-6 text-white" /></div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Feedback Section */}
          <div className="px-4 sm:px-6 py-4 sm:py-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p
              className="text-[11px] uppercase tracking-widest font-medium mb-3"
              style={{ color: 'var(--text-ghost)' }}
            >
              Rəyiniz
            </p>

            {/* Feedback history — read-only, always visible when content exists */}
            {feedbackHistory && (
              <div
                className="rounded-xl p-3 mb-4 text-xs leading-relaxed whitespace-pre-wrap"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {feedbackHistory}
              </div>
            )}

            {/* Always-active textarea */}
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={feedbackHistory ? 'Əlavə rəy yazın...' : 'Bu material haqqında rəyinizi yazın...'}
              rows={3}
              disabled={isSending}
              className="w-full rounded-xl py-3 px-4 text-sm resize-none focus:outline-none transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendFeedback();
              }}
            />
            {error && (
              <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>
                {error}
              </p>
            )}
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                Ctrl+Enter ilə göndər
              </p>
              <button
                onClick={handleSendFeedback}
                disabled={isSending || !newMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all hover:opacity-90 disabled:opacity-40 bg-accent"
                style={{ color: 'var(--accent-on-accent)' }}
              >
                <Send size={13} />
                {isSending ? 'Göndərilir...' : 'Göndər'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────── */
const DeliverablesPage = () => {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Deliverable | null>(null);

  const fetchItems = useCallback(() => {
    (apiClient.get('/dashboard/deliverables') as Promise<{ data: Deliverable[] }>)
      .then((res) => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFeedbackSent = (id: string, fullFeedback: string) => {
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, clientFeedback: fullFeedback } : d)),
    );
    // Keep modal open and sync latest feedback into it
    setSelectedItem((prev) =>
      prev?.id === id ? { ...prev, clientFeedback: fullFeedback } : prev,
    );
  };



  const monthNames = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
    'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
  ];

  return (
    <div className="pb-28 lg:pb-12">
      {/* Page Header */}
      <div className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6 md:px-10">
        <p
          className="text-xs uppercase tracking-widest font-medium mb-3"
          style={{ color: 'var(--accent-text)' }}
        >
          Şəxsi Kabinet
        </p>
        <h1
          className="font-heading text-2xl md:text-3xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Çatdırılmalar
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Sizin üçün hazırlanmış materiallar.
        </p>
      </div>

      <div className="px-4 sm:px-6 md:px-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-slate-900 border border-white/[0.06] animate-pulse">
                <div className="w-full aspect-video bg-slate-800" />
                <div className="px-3 py-2.5 flex flex-col gap-2">
                  <div className="h-4 w-3/4 rounded bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/20 gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm tracking-wide">Hələ heç bir material yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {items.map((d) => {
              const hasFile = d.files && d.files.length > 0;
              const firstFile = hasFile ? d.files[0] : null;

              // Determine if this deliverable is a video type
              const isVideoType =
                d.category?.isVideo === true ||
                d.type === 'VIDEO' ||
                (firstFile?.type && firstFile.type.startsWith('video/'));

              // Resolve the thumbnail source with strict priority:
              // 1. Use server-generated thumbnailUrl (for videos with a processed thumb)
              // 2. Fall back to the first file's URL only if it is NOT a video (i.e., it is an image)
              // 3. Otherwise render a placeholder
              const thumbnailSrc: string | null =
                d.thumbnailUrl ??
                (!isVideoType && firstFile?.url ? firstFile.url : null);

              return (
                <div
                  key={d.id}
                  onClick={() => hasFile && setSelectedItem(d)}
                  className={[
                    'relative group rounded-xl overflow-hidden bg-slate-900',
                    'border border-white/[0.06]',
                    'transition-transform duration-200 ease-out',
                    hasFile ? 'cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40' : 'cursor-default opacity-60',
                  ].join(' ')}
                >
                  {/* ── THUMBNAIL AREA ── */}
                  <div className="relative w-full aspect-video bg-slate-800 flex items-center justify-center overflow-hidden">

                    {thumbnailSrc ? (
                      /* Render ONLY an <img> tag — NEVER a <video> tag here */
                      <img
                        src={thumbnailSrc}
                        alt={d.title}
                        className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                        loading="lazy"
                      />
                    ) : (
                      /* Fallback placeholder when no thumbnail is available */
                      <div className="flex flex-col items-center justify-center gap-2 text-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <path d="M8 21h8M12 17v4" />
                        </svg>
                        <span className="text-[10px] tracking-widest uppercase">Önizləmə yoxdur</span>
                      </div>
                    )}

                    {/* ── PLAY ICON OVERLAY (only for video types that have a thumbnail) ── */}
                    {isVideoType && thumbnailSrc && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                          {/* Play triangle SVG — do not use an external icon library here */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="white"
                            className="w-5 h-5 translate-x-0.5"
                          >
                            <path d="M8 5.14v14l11-7-11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* ── STATUS BADGE (top-right corner) ── */}
                    <div className="absolute top-2 right-2">
                      <span className={[
                        'text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full',
                        d.status === 'READY'      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : '',
                        d.status === 'PENDING'    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'    : '',
                        d.status === 'PROCESSING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'       : '',
                        d.status === 'ARCHIVED'   ? 'bg-white/10 text-white/40 border border-white/10'             : '',
                      ].join(' ')}>
                        {d.status}
                      </span>
                    </div>
                  </div>

                  {/* ── CARD FOOTER ── */}
                  <div className="px-3 py-2.5 flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-white truncate leading-snug">
                      {d.title ?? 'Başlıksız'}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-white/40">
                        {d.category?.name ?? d.type ?? '—'}
                      </span>
                      <span className="text-[11px] text-white/30">
                        {d.month}/{d.year}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal — only rendered when a row is selected */}
      {selectedItem && (
        <PreviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onFeedbackSent={handleFeedbackSent}
        />
      )}
    </div>
  );
};

export default DeliverablesPage;
