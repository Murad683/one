import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Download, Play, X, Send, FileX, Video, Image, Grid3X3, MessageCircle } from 'lucide-react';

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
  const { user } = useAuth();
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
    setSelectedItem((prev) =>
      prev?.id === id ? { ...prev, clientFeedback: fullFeedback } : prev,
    );
  };

  const igUsername = user?.igUsername || 'username';
  const igBio = user?.igBio || 'Creative content ✨ Digital storytelling';
  const igFollowers = user?.igFollowers || '10K';
  const igFollowing = user?.igFollowing || '0';
  const igPostsCount = user?.igPostsCount || '0';
  const igProfilePic = user?.igProfilePic || null;

  // Count only READY items as "posts"
  const actualPostCount = items.filter((d) => d.status === 'READY').length;
  const displayPostCount = igPostsCount !== '0' ? igPostsCount : String(actualPostCount);

  return (
    <div className="pb-28 lg:pb-12">
      {/* ── Instagram Profile Header ── */}
      <div className="px-4 sm:px-6 md:px-10 pt-8 sm:pt-10 pb-6">
        <div className="flex items-start gap-6 sm:gap-10 md:gap-16">
          {/* Avatar */}
          <div className="shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-[150px] md:h-[150px] rounded-full overflow-hidden ring-[3px] ring-offset-2 flex items-center justify-center"
              style={{
                ringColor: 'var(--accent-text)',
                ringOffsetColor: 'var(--bg-primary)',
                background: igProfilePic ? 'transparent' : 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
              }}
            >
              {igProfilePic ? (
                <img
                  src={igProfilePic}
                  alt={igUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-2xl sm:text-3xl md:text-5xl font-bold text-white select-none"
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            {/* Username + Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
              <h1
                className="text-lg sm:text-xl font-normal truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {igUsername}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 sm:px-5 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--accent-text)',
                    color: 'var(--accent-on-accent)',
                  }}
                >
                  Follow
                </button>
                <button
                  className="px-4 sm:px-5 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg border transition-all"
                  style={{
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  Message
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 sm:gap-10 mb-4 sm:mb-5">
              <div className="text-center sm:text-left">
                <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{displayPostCount}</span>
                <span className="text-xs sm:text-sm ml-1" style={{ color: 'var(--text-muted)' }}>posts</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{igFollowers}</span>
                <span className="text-xs sm:text-sm ml-1" style={{ color: 'var(--text-muted)' }}>followers</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{igFollowing}</span>
                <span className="text-xs sm:text-sm ml-1" style={{ color: 'var(--text-muted)' }}>following</span>
              </div>
            </div>

            {/* Bio */}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {user?.name || 'User'}
              </p>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--text-secondary)' }}
              >
                {igBio}
              </p>
            </div>
          </div>
        </div>

        {/* Bio — mobile only (below avatar row) */}
        <div className="sm:hidden mt-3">
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
            {user?.name || 'User'}
          </p>
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--text-secondary)' }}
          >
            {igBio}
          </p>
        </div>

        {/* Tabs divider */}
        <div
          className="mt-6 sm:mt-8 border-t flex justify-center gap-12"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            className="flex items-center gap-1.5 py-3 text-xs uppercase tracking-widest font-medium border-t transition-colors"
            style={{
              color: 'var(--text-primary)',
              borderColor: 'var(--text-primary)',
              marginTop: '-1px',
            }}
          >
            <Grid3X3 size={12} />
            Posts
          </button>
          <button
            className="flex items-center gap-1.5 py-3 text-xs uppercase tracking-widest font-medium border-t border-transparent transition-colors"
            style={{ color: 'var(--text-ghost)', marginTop: '-1px' }}
          >
            <Video size={12} />
            Reels
          </button>
        </div>
      </div>

      <div className="px-0 sm:px-0 md:px-0">
        {loading ? (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: 'var(--text-faint)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm tracking-wide">Hələ heç bir material yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 w-full">
            {items.map((d) => {
              const hasFile = d.files && d.files.length > 0;
              const firstFile = hasFile ? d.files[0] : null;

              const isVideoType =
                d.category?.isVideo === true ||
                d.type === 'VIDEO' ||
                (firstFile?.type && firstFile.type.startsWith('video/'));

              const hasMultipleFiles = d.files && d.files.length > 1;

              const firstFileUrl = getFileUrl(firstFile);
              const isFirstFileImage = firstFile ? isImageFile(firstFile.type, firstFile.name) : false;
              const AZURE_BLOB_URL = import.meta.env.VITE_AZURE_BLOB_URL;
              const BASE_URL = AZURE_BLOB_URL || BACKEND;

              const resolvedThumb = d.thumbnailUrl
                ? (d.thumbnailUrl.startsWith('http')
                    ? d.thumbnailUrl
                    : `${BASE_URL}/${d.thumbnailUrl}`)
                : null;

              const thumbnailSrc: string | null =
                resolvedThumb ??
                (isFirstFileImage && firstFileUrl ? firstFileUrl : null);

              return (
                <div
                  key={d.id}
                  onClick={() => hasFile && setSelectedItem(d)}
                  className={[
                    'relative group aspect-[3/4] overflow-hidden',
                    hasFile ? 'cursor-pointer' : 'cursor-default opacity-60',
                  ].join(' ')}
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  {thumbnailSrc ? (
                    <img
                      src={thumbnailSrc}
                      alt={d.title}
                      className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-faint)' }}>
                      <Image size={28} strokeWidth={1.5} />
                      <span className="text-[9px] tracking-widest uppercase">Önizləmə yoxdur</span>
                    </div>
                  )}

                  {/* ── Small corner icon (video/reels or carousel/image) ── */}
                  <div className="absolute top-2 right-2 pointer-events-none">
                    {isVideoType ? (
                      <Video size={16} className="text-white drop-shadow-lg" strokeWidth={2} />
                    ) : hasMultipleFiles ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white drop-shadow-lg">
                        <rect x="3" y="3" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
                        <rect x="6" y="6" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    ) : null}
                  </div>

                  {/* ── Hover overlay with info ── */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 pointer-events-none">
                    {d.clientFeedback && (
                      <div className="flex items-center gap-1.5">
                        <MessageCircle size={18} className="text-white fill-white" />
                      </div>
                    )}
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
