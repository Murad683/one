import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { FolderOpen, Download, Play, X, Send, FileX } from 'lucide-react';

interface Deliverable {
  id: string;
  type: string;
  status: string;
  month: number;
  year: number;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: string | null;
  mimeType: string | null;
  notes: string | null;
  clientFeedback: string | null;
  downloadUrl?: string | null;
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

const BACKEND = 'http://localhost:5000';

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

const getFileUrl = (d: { fileUrl: string | null; downloadUrl?: string | null }): string => {
  if (d.downloadUrl) return d.downloadUrl;
  if (!d.fileUrl) return '';
  if (d.fileUrl.startsWith('http')) return d.fileUrl;
  if (d.fileUrl.startsWith('/uploads/')) return `${BACKEND}${d.fileUrl}`;
  const uploadsIdx = d.fileUrl.replace(/\\/g, '/').indexOf('/uploads/');
  if (uploadsIdx !== -1) return `${BACKEND}${d.fileUrl.replace(/\\/g, '/').substring(uploadsIdx)}`;
  return `${BACKEND}/uploads/${d.fileUrl}`;
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

  const url = getFileUrl(item);

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

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = item.fileName || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--modal-backdrop)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--card-border)',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.fileName || typeLabels[item.type] || item.type}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {typeLabels[item.type]} — {statusConfig[item.status]?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-text)', backgroundColor: 'var(--glow-accent-subtle)' }}
              >
                <Download size={12} />
                Yüklə
              </button>
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
          <MediaPreview url={url} mimeType={item.mimeType} fileName={item.fileName} />

          {/* Feedback Section */}
          <div className="px-6 py-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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

  const handleDownload = async (d: Deliverable, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getFileUrl(d);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = d.fileName || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  const monthNames = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
    'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
  ];

  return (
    <div className="pb-28 lg:pb-12">
      {/* Page Header */}
      <div className="pt-12 pb-8 px-6 md:px-10">
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

      <div className="px-6 md:px-10">
        {loading ? (
          <div
            className="rounded-2xl border divide-y"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
          >
            <div className="px-6">
              <SkeletonRow />
            </div>
            <div className="px-6">
              <SkeletonRow />
            </div>
            <div className="px-6">
              <SkeletonRow />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <FolderOpen size={40} style={{ color: 'var(--text-ghost)' }} className="mb-4" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Hələ ki heç bir material yüklənməyib.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <div
              className="rounded-2xl border min-w-[640px]"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
              {/* Table Header */}
              <div
                className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-widest font-medium border-b"
                style={{ color: 'var(--text-ghost)', borderColor: 'var(--border-subtle)' }}
              >
                <span className="col-span-3">Növ</span>
                <span className="col-span-2">Dövr</span>
                <span className="col-span-3">Fayl</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-2 text-right">Əməliyyat</span>
              </div>

              {/* Rows */}
              {items.map((d, i) => {
                const status = statusConfig[d.status] ?? statusConfig.PENDING;
                const hasFile = !!d.fileUrl;
                const isMedia =
                  hasFile &&
                  (isVideoFile(d.mimeType, d.fileName) || isImageFile(d.mimeType, d.fileName));

                return (
                  <div
                    key={d.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderBottom:
                        i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      cursor: hasFile ? 'pointer' : 'default',
                    }}
                    onClick={() => hasFile && setSelectedItem(d)}
                  >
                    <span
                      className="col-span-3 text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {typeLabels[d.type] ?? d.type}
                    </span>
                    <span className="col-span-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {monthNames[d.month - 1]} {d.year}
                    </span>
                    <div className="col-span-3 flex items-center gap-1.5">
                      {isMedia && <Play size={11} style={{ color: 'var(--accent-text)' }} />}
                      <span
                        className="text-xs truncate"
                        style={{ color: hasFile ? 'var(--text-secondary)' : 'var(--text-faint)' }}
                      >
                        {d.fileName ?? '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full inline-block"
                        style={{ color: status.color, backgroundColor: status.bg }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      {hasFile ? (
                        <button
                          onClick={(e) => handleDownload(d, e)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                          style={{
                            color: 'var(--accent-text)',
                            backgroundColor: 'var(--glow-accent-subtle)',
                          }}
                        >
                          <Download size={12} />
                          Yüklə
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                          —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
