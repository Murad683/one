import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cinematicEasing } from '../../utils/animations';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Download, Play, X, FileX, Video, Image, Grid3X3, MessageCircle } from 'lucide-react';

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

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const resolveFileUrl = (fileUrl: string | null | undefined): string => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http') || fileUrl.startsWith('blob:')) return fileUrl;
  
  const normalized = fileUrl.replace(/\\/g, '/');
  if (normalized.includes('/uploads/')) {
    const idx = normalized.indexOf('/uploads/');
    return `${BACKEND}${normalized.substring(idx)}`;
  }
  
  if (normalized.startsWith('uploads/')) {
    return `${BACKEND}/${normalized}`;
  }

  return `${BACKEND}/uploads/${normalized}`;
};

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
      <div className="w-full h-full bg-black flex items-center justify-center relative">
        <video controls autoPlay className="w-full h-full object-contain" src={url}>
          Brauzeriniz video formatını dəstəkləmir.
        </video>
      </div>
    );
  }

  if (isImageFile(mimeType, fileName)) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center relative">
        <img
          src={url}
          alt="Önizləmə"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // PDF, ZIP, AI, etc. — no inline preview
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center py-12 gap-3"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      <FileX size={36} style={{ color: 'var(--text-ghost)' }} />
      <p className="text-xs text-center px-6" style={{ color: 'var(--text-muted)' }}>
        Bu fayl növü üçün önizləmə yoxdur. Zəhmət olmasa yükləyin.
      </p>
    </div>
  );
};

/* ─── Preview Modal (Instagram Style) ────────── */
const PreviewModal = ({
  item,
  onClose,
  onFeedbackSent,
}: {
  item: Deliverable;
  onClose: () => void;
  onFeedbackSent: (id: string, fullFeedback: string) => void;
}) => {
  const { user } = useAuth();
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    document.body.classList.add('lock-scroll');
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('lock-scroll');
    };
  }, [onClose]);

  const igUsername = user?.igUsername || 'username';
  const igProfilePic = user?.igProfilePic || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 md:p-8"
      style={{ backgroundColor: 'var(--modal-backdrop)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: cinematicEasing }}
        className="relative w-full max-w-6xl h-full md:h-[85vh] md:max-h-[800px] rounded-none sm:rounded-xl md:rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--card-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile close button overlay */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 z-50 p-2 rounded-full backdrop-blur-md bg-black/40 text-white border border-white/10"
        >
          <X size={20} />
        </button>

        {/* Desktop close button */}
        <button
          onClick={onClose}
          className="hidden md:flex absolute top-4 right-4 z-50 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer hover:bg-white/10"
          style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', borderWidth: '1px' }}
        >
          <X size={20} />
        </button>

        {/* LEFT COLUMN: MEDIA VIEWER */}
        <div className="flex-1 bg-black flex flex-col relative h-[50vh] md:h-full overflow-hidden">
          {activeFile ? (
            <MediaPreview url={url} mimeType={activeFile.type} fileName={activeFile.name} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">Media tapılmadı</div>
          )}
          
          {/* Multi-file thumbnails */}
          {item.files && item.files.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex gap-2 justify-center px-4">
              {item.files.map((f, idx) => (
                <button
                  key={f.url}
                  onClick={() => setActiveIndex(idx)}
                  className={`shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                    idx === activeIndex ? 'border-white shadow-md scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {isImageFile(f.type, f.name) ? (
                    <img src={getFileUrl(f)} className="w-full h-full object-cover" alt={f.name} />
                  ) : isVideoFile(f.type, f.name) ? (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><Play className="h-4 w-4 text-white" /></div>
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><FileX className="h-4 w-4 text-white" /></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: COMMENTS & DETAILS */}
        <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col h-[50vh] md:h-full border-t md:border-t-0 md:border-l" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sm:py-4 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-orange-500 flex items-center justify-center">
                {igProfilePic ? (
                  <img src={igProfilePic} alt={igUsername} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{igUsername}</p>
                <p className="text-[11px] leading-tight" style={{ color: 'var(--text-faint)' }}>{item.title || item.category?.name || 'Post'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              {url && (
                <a
                  href={activeFile?.downloadUrl || url}
                  download={activeFile?.name || 'file'}
                  className="p-1.5 md:mr-10 rounded-lg transition-colors hover:opacity-80 flex items-center"
                  style={{ color: 'var(--text-primary)' }}
                  title="Yüklə"
                >
                  <Download size={20} />
                </a>
              )}
            </div>
          </div>

          {/* Body (Scrollable Comments) */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* "Caption" / Original Note */}
            <div className="flex gap-3 mb-6">
               <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden flex items-center justify-center border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}>
                 <span className="text-[10px] font-bold" style={{ color: 'var(--accent-text)' }}>ONE</span>
               </div>
               <div className="flex-1">
                 <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                   <span className="font-semibold mr-2">one_agency</span>
                   {item.notes || 'Yeni material çatdırıldı!'}
                 </p>
                 <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
                   Status: {statusConfig[item.status]?.label} • {item.month}/{item.year}
                 </p>
               </div>
            </div>

            {/* Client Comments */}
            {feedbackHistory && (
              <div className="flex gap-3">
                 <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-orange-500 flex items-center justify-center">
                   {igProfilePic ? (
                     <img src={igProfilePic} alt={igUsername} className="w-full h-full object-cover" />
                   ) : (
                     <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || 'U'}</span>
                   )}
                 </div>
                 <div className="flex-1">
                   <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                     <span className="font-semibold mr-2">{igUsername}</span>
                     {feedbackHistory}
                   </p>
                 </div>
              </div>
            )}
          </div>

          {/* Footer (Add Comment) */}
          <div className="border-t p-4 shrink-0 flex flex-col" style={{ borderColor: 'var(--border-subtle)' }}>
             {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
             <div className="flex items-center gap-2">
               <textarea
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 placeholder="Add a comment..."
                 rows={1}
                 disabled={isSending}
                 className="flex-1 bg-transparent text-sm resize-none focus:outline-none max-h-20"
                 style={{ color: 'var(--text-primary)' }}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSendFeedback();
                   }
                 }}
               />
               <button
                 onClick={handleSendFeedback}
                 disabled={isSending || !newMessage.trim()}
                 className="text-sm font-semibold transition-opacity disabled:opacity-40"
                 style={{ color: 'var(--accent-text)' }}
               >
                 {isSending ? '...' : 'Post'}
               </button>
             </div>
          </div>
        </div>
      </motion.div>
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
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-[150px] md:h-[150px] rounded-full overflow-hidden flex items-center justify-center border-[3px]"
              style={{
                borderColor: 'var(--accent-text)',
                background: igProfilePic ? 'transparent' : 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
              }}
            >
              {igProfilePic ? (
                <img
                  src={resolveFileUrl(igProfilePic)}
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
      <AnimatePresence>
        {selectedItem && (
          <PreviewModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onFeedbackSent={handleFeedbackSent}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliverablesPage;
