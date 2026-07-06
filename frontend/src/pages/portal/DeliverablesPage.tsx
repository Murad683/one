import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cinematicEasing } from '../../utils/animations';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { X, FileX, Video, Image, Grid3X3, MessageCircle, Heart, Send, Bookmark, MoreHorizontal } from 'lucide-react';

interface Deliverable {
  id: string;
  title: string;
  type: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string; isVideo: boolean } | null;
  status: string;
  month: number;
  year: number;
  files: { url: string; name: string; size: number; type: string; downloadUrl?: string | null; previewUrl?: string | null }[];
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

const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return '/placeholder.jpg';
  }
  return url;
};

const resolveFileUrl = (fileUrl: string | null | undefined): string => {
  const url = sanitizeUrl(fileUrl);
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  let normalized = url.replace(/\\/g, '/');
  if (normalized.startsWith('uploads/')) {
    normalized = normalized.replace('uploads/', '');
  } else if (normalized.includes('/uploads/')) {
    normalized = normalized.split('/uploads/').pop() || normalized;
  }

  let finalUrl = `${BACKEND}/api/v1/uploads/${normalized}`;
  const token = localStorage.getItem('token');
  if (token) {
    finalUrl += `?token=${token}`;
  }
  return sanitizeUrl(finalUrl);
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
  if (f.downloadUrl) return sanitizeUrl(f.downloadUrl);
  if (!f.url) return '';
  
  const safeUrl = sanitizeUrl(f.url);
  if (safeUrl.startsWith('http')) return safeUrl;
  
  const normalized = safeUrl.replace(/\\/g, '/');
  if (normalized.includes('/uploads/')) {
    const idx = normalized.indexOf('/uploads/');
    return sanitizeUrl(`${BACKEND}${normalized.substring(idx)}`);
  }
  
  if (normalized.startsWith('uploads/')) {
    return sanitizeUrl(`${BACKEND}/${normalized}`);
  }

  return safeUrl;
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
        <video controls autoPlay playsInline preload="metadata" className="w-full h-full object-contain" src={url}>
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
  const [showComments, setShowComments] = useState(false);

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
      if (e.key === 'Escape') {
        if (showComments) setShowComments(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    document.body.classList.add('lock-scroll');
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('lock-scroll');
    };
  }, [onClose, showComments]);

  const igUsername = user?.igUsername || 'username';
  const igProfilePic = sanitizeUrl(user?.igProfilePic || null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--modal-backdrop)' }}
      onClick={() => { if (!showComments) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: cinematicEasing }}
        className="relative w-full max-w-[470px] h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-none md:rounded-xl border-x-0 md:border-x md:border-y"
        style={{
          backgroundColor: 'var(--ig-bg)',
          color: 'var(--ig-text)',
          borderColor: 'var(--ig-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop close button outside */}
        <button
          onClick={onClose}
          className="hidden md:flex absolute -right-12 top-0 z-50 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={24} />
        </button>

        {/* 1. Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b shrink-0" style={{ borderColor: 'var(--ig-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-orange-500 flex items-center justify-center p-[2px]">
              <div className="w-full h-full rounded-full border-2 border-transparent overflow-hidden relative" style={{ backgroundColor: 'var(--ig-bg)' }}>
                {igProfilePic ? (
                  <img src={resolveFileUrl(igProfilePic)} alt={igUsername} className="w-full h-full object-cover absolute inset-0 rounded-full" style={{ border: '2px solid var(--ig-bg)' }} />
                ) : (
                  <span className="text-white text-[10px] font-bold z-10">{user?.name?.charAt(0) || 'U'}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold leading-none">{igUsername}</span>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-blue-500" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-8.1 7.9z"/></svg>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <button className="p-1 hover:opacity-70 transition-opacity">
               <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* 2. Media Area */}
        <div className="w-full relative flex items-center justify-center bg-black aspect-[4/5] overflow-hidden shrink-0">
          {activeFile ? (
            <MediaPreview url={activeFile?.previewUrl || url} mimeType={activeFile.type} fileName={activeFile.name} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">Media tapılmadı</div>
          )}

          {/* 1/X Pagination Badge */}
          {item.files && item.files.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm z-10 pointer-events-none">
              {activeIndex + 1}/{item.files.length}
            </div>
          )}

          {/* Next/Prev invisible click areas */}
          {item.files && item.files.length > 1 && (
            <>
              <div className="absolute inset-y-0 left-0 w-1/2 cursor-pointer z-0" onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))} />
              <div className="absolute inset-y-0 right-0 w-1/2 cursor-pointer z-0" onClick={() => setActiveIndex(prev => Math.min(item.files.length - 1, prev + 1))} />
            </>
          )}
        </div>

        {/* Actions bar below media */}
        <div className="flex flex-col pb-3 pt-2 shrink-0">
           <div className="flex items-center justify-between px-3 mb-2">
             <div className="flex items-center gap-4">
               <button className="hover:opacity-60 transition-opacity"><Heart size={24} strokeWidth={1.5} /></button>
               <button className="hover:opacity-60 transition-opacity" onClick={() => setShowComments(true)}><MessageCircle size={24} strokeWidth={1.5} /></button>
               <button className="hover:opacity-60 transition-opacity"><Send size={24} strokeWidth={1.5} /></button>
             </div>
             
             {/* Dots if multiple files */}
             {item.files && item.files.length > 1 ? (
               <div className="flex items-center gap-1">
                 {item.files.map((_, idx) => (
                   <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === activeIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                 ))}
               </div>
             ) : <div/>}

             <button className="hover:opacity-60 transition-opacity">
               {activeFile?.downloadUrl ? (
                 <a href={activeFile.downloadUrl} download={activeFile.name} title="Yüklə"><Bookmark size={24} strokeWidth={1.5} /></a>
               ) : (
                 <Bookmark size={24} strokeWidth={1.5} />
               )}
             </button>
           </div>

           {/* Caption & Status */}
           <div className="px-3 text-sm flex flex-col gap-1">
             <div>
               <span className="font-semibold mr-2">one_agency</span>
               <span>{item.notes || 'Yeni material çatdırıldı!'}</span>
             </div>
           </div>

           {/* View Comments Link */}
           <div className="px-3 mt-2 cursor-pointer mb-1" onClick={() => setShowComments(true)}>
             <span className="text-sm" style={{ color: 'var(--ig-text-secondary)' }}>
               {feedbackHistory ? 'Rəylərə bax' : 'Rəy yaz...'}
             </span>
           </div>

           <div className="px-3 text-[10px] uppercase tracking-wide" style={{ color: 'var(--ig-text-secondary)' }}>
             {statusConfig[item.status]?.label} • {item.month}/{item.year}
           </div>
        </div>

        {/* Mobile bottom padding filler just in case */}
        <div className="md:hidden pb-[env(safe-area-inset-bottom)]" />

        {/* Comments Modal (Bottom Sheet style) */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-12 md:top-0 z-50 flex flex-col rounded-t-xl md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: 'var(--ig-bg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--ig-border)' }}>
                <div className="w-8" />
                <h3 className="text-sm font-semibold">Rəylər</h3>
                <button onClick={() => setShowComments(false)} className="p-1 hover:opacity-70"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {/* Caption again in comments */}
                <div className="flex gap-3 mb-6">
                   <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden flex items-center justify-center border" style={{ borderColor: 'var(--ig-border)', backgroundColor: 'var(--ig-bg)' }}>
                     <span className="text-[10px] font-bold" style={{ color: 'var(--ig-text)' }}>ONE</span>
                   </div>
                   <div className="flex-1">
                     <p className="text-sm">
                       <span className="font-semibold mr-2">one_agency</span>
                       {item.notes || 'Yeni material çatdırıldı!'}
                     </p>
                   </div>
                </div>

                {/* Client Comments */}
                {feedbackHistory && (
                  <div className="flex gap-3">
                     <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-orange-500 flex items-center justify-center">
                       {igProfilePic ? (
                         <img src={resolveFileUrl(igProfilePic)} alt={igUsername} className="w-full h-full object-cover" />
                       ) : (
                         <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || 'U'}</span>
                       )}
                     </div>
                     <div className="flex-1">
                       <p className="text-sm whitespace-pre-wrap">
                         <span className="font-semibold mr-2">{igUsername}</span>
                         {feedbackHistory}
                       </p>
                     </div>
                  </div>
                )}
              </div>

              <div className="border-t p-3 shrink-0 flex flex-col mb-[env(safe-area-inset-bottom)]" style={{ borderColor: 'var(--ig-border)' }}>
                 {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ig-btn-gray-bg)' }}>
                     {igProfilePic ? <img src={resolveFileUrl(igProfilePic)} alt="avatar" className="w-full h-full object-cover" /> : null}
                   </div>
                   <input
                     type="text"
                     value={newMessage}
                     onChange={(e) => setNewMessage(e.target.value)}
                     placeholder="Rəy yazın..."
                     disabled={isSending}
                     className="flex-1 bg-transparent text-sm focus:outline-none"
                     style={{ color: 'var(--ig-text)' }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         handleSendFeedback();
                       }
                     }}
                   />
                   <button
                     onClick={handleSendFeedback}
                     disabled={isSending || !newMessage.trim()}
                     className="text-sm font-semibold transition-opacity disabled:opacity-40 text-blue-500"
                   >
                     {isSending ? '...' : 'Göndər'}
                   </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);

  const fetchItems = useCallback((currentPage: number) => {
    if (currentPage === 1) setLoading(true);
    else setLoadingMore(true);

    (apiClient.get(`/dashboard/deliverables?page=${currentPage}&limit=6`) as Promise<{ data: Deliverable[], meta?: { total: number, hasMore: boolean } }>)
      .then((res) => {
        setItems(prev => currentPage === 1 ? res.data : [...prev, ...res.data]);
        if (res.meta) {
          setHasMore(res.meta.hasMore);
          setTotalPosts(res.meta.total);
        } else {
          setHasMore(false);
          setTotalPosts(res.data.length);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    fetchItems(page);
  }, [page, fetchItems]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore]);

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
  const igProfilePic = sanitizeUrl(user?.igProfilePic || null);
  const igHighlights: { title: string; imageUrl: string }[] = Array.isArray(user?.igHighlights) ? user.igHighlights : [];

  const displayPostCount = igPostsCount !== '0' ? igPostsCount : String(totalPosts);

  return (
    <div className="pb-28 lg:pb-12 min-h-screen font-sans" style={{ backgroundColor: 'var(--ig-bg)', color: 'var(--ig-text)' }}>
      
      {/* ── Mobile Top Nav ── */}
      <div className="flex md:hidden items-center justify-between px-4 h-11 border-b" style={{ borderColor: 'var(--ig-border)' }}>
        <button className="p-1 -ml-1">
          <svg aria-label="Back" color="currentColor" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><path d="M21 17.502a.997.997 0 0 1-.707-.293L12 8.913l-8.293 8.296a1 1 0 1 1-1.414-1.414l9-9.004a1.03 1.03 0 0 1 1.414 0l9 9.004A1 1 0 0 1 21 17.502Z" transform="rotate(-90 12 12)"></path></svg>
        </button>
        <div className="flex items-center gap-1 font-bold text-[16px]">
          {igUsername}
          <svg aria-label="Verified" color="#0095f6" fill="#0095f6" height="12" role="img" viewBox="0 0 40 40" width="12"><path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fillRule="evenodd"></path></svg>
        </div>
        <button className="p-1 -mr-1">
          <svg aria-label="More options" color="currentColor" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" r="1.5"></circle><circle cx="6" cy="12" r="1.5"></circle><circle cx="18" cy="12" r="1.5"></circle></svg>
        </button>
      </div>

      {/* ── Instagram Profile Header ── */}
      <div className="px-4 sm:px-6 md:px-10 pt-4 md:pt-10 pb-6 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-16">
          
          {/* Mobile: Avatar + Stats Row */}
          <div className="flex items-center gap-6 md:hidden">
            <div className="shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center border-[2px]"
                style={{
                  borderColor: 'var(--ig-border)',
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
                  <span className="text-2xl sm:text-3xl font-bold text-white select-none">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </div>
            {/* Mobile Stats */}
            <div className="flex-1 flex justify-around items-center">
              <div className="flex flex-col items-center">
                <span className="text-[16px] font-semibold">{displayPostCount}</span>
                <span className="text-[13px]" style={{ color: 'var(--ig-text)' }}>posts</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[16px] font-semibold">{igFollowers}</span>
                <span className="text-[13px]" style={{ color: 'var(--ig-text)' }}>followers</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[16px] font-semibold">{igFollowing}</span>
                <span className="text-[13px]" style={{ color: 'var(--ig-text)' }}>following</span>
              </div>
            </div>
          </div>

          {/* Desktop Avatar (Hidden on Mobile) */}
          <div className="hidden md:block shrink-0">
            <div
              className="w-[150px] h-[150px] rounded-full overflow-hidden flex items-center justify-center border-[1px]"
              style={{
                borderColor: 'var(--ig-border)',
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
                <span className="text-5xl font-bold text-white select-none">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>

          {/* Info (Desktop handles everything, Mobile handles Bio + Buttons here) */}
          <div className="flex-1 min-w-0">
            
            {/* Desktop: Username + Buttons Row (Hidden on mobile) */}
            <div className="hidden md:flex flex-wrap items-center gap-4 mb-5">
              <h1 className="text-[20px] font-normal truncate">
                {igUsername}
              </h1>
              <svg aria-label="Verified" color="#0095f6" fill="#0095f6" height="18" role="img" viewBox="0 0 40 40" width="18"><path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fillRule="evenodd"></path></svg>
              <div className="flex items-center gap-2">
                <button className="px-5 py-1.5 text-[14px] font-semibold rounded-lg transition-all bg-[#0095F6] text-white hover:bg-[#1877F2]">
                  Follow
                </button>
                <button 
                  className="px-5 py-1.5 text-[14px] font-semibold rounded-lg transition-all"
                  style={{ backgroundColor: 'var(--ig-btn-gray-bg)', color: 'var(--ig-btn-gray-text)' }}
                >
                  Message
                </button>
                <button 
                  className="p-2 rounded-lg transition-all"
                  style={{ backgroundColor: 'var(--ig-btn-gray-bg)', color: 'var(--ig-btn-gray-text)' }}
                >
                  <svg aria-label="Discover People" color="currentColor" fill="currentColor" height="16" role="img" viewBox="0 0 24 24" width="16"><path d="M19.006 8.252H21.25a1.25 1.25 0 0 0 0-2.5h-2.244V3.5a1.25 1.25 0 1 0-2.5 0v2.252H14.25a1.25 1.25 0 0 0 0 2.5h2.256v2.248a1.25 1.25 0 1 0 2.5 0v-2.248Z"></path><path d="M22 19.25a2.75 2.75 0 0 1-2.75 2.75H4.75A2.75 2.75 0 0 1 2 19.25v-.403A6.837 6.837 0 0 1 8.815 12h6.37A6.837 6.837 0 0 1 22 18.847v.403ZM12 10.5a4 4 0 1 0-4-4 4.005 4.005 0 0 0 4 4Z"></path></svg>
                </button>
              </div>
            </div>

            {/* Desktop: Stats Row (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-10 mb-5 text-[16px]">
              <div><span className="font-semibold">{displayPostCount}</span> posts</div>
              <div><span className="font-semibold">{igFollowers}</span> followers</div>
              <div><span className="font-semibold">{igFollowing}</span> following</div>
            </div>

            {/* Bio (Both Mobile & Desktop) */}
            <div className="text-[14px]">
              <p className="font-semibold">{user?.name || 'User'}</p>
              <p className="whitespace-pre-line leading-[18px]">{igBio}</p>
            </div>

            {/* ── Instagram Highlights Row ── */}
            {igHighlights.length > 0 && (
              <div className="mt-4 md:mt-6 overflow-x-auto no-scrollbar">
                <div className="flex gap-4 md:gap-8 pb-1" style={{ minWidth: 'min-content' }}>
                  {igHighlights.map((h, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 shrink-0 select-none w-[72px] md:w-[85px]">
                      {/* Outer grey ring */}
                      <div
                        className="rounded-full flex items-center justify-center shrink-0 w-[64px] h-[64px] md:w-[80px] md:h-[80px]"
                        style={{
                          border: '1px solid var(--ig-border)',
                          padding: '3px',
                        }}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ig-bg)' }}>
                          <img
                            src={resolveFileUrl(h.imageUrl)}
                            alt={h.title}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                      </div>
                      <span
                        className="text-[11px] md:text-[12px] text-center truncate w-full"
                        style={{ color: 'var(--ig-text)' }}
                      >
                        {h.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile: Buttons Row (Hidden on Desktop) */}
            <div className="flex md:hidden items-center gap-2 mt-4">
              <button className="flex-1 py-1.5 text-[14px] font-semibold rounded-lg transition-all bg-[#0095F6] text-white">
                Follow
              </button>
              <button 
                className="flex-1 py-1.5 text-[14px] font-semibold rounded-lg transition-all"
                style={{ backgroundColor: 'var(--ig-btn-gray-bg)', color: 'var(--ig-btn-gray-text)' }}
              >
                Message
              </button>
              <button 
                className="p-1.5 rounded-lg transition-all"
                style={{ backgroundColor: 'var(--ig-btn-gray-bg)', color: 'var(--ig-btn-gray-text)' }}
              >
                <svg aria-label="Discover People" color="currentColor" fill="currentColor" height="16" role="img" viewBox="0 0 24 24" width="16"><path d="M19.006 8.252H21.25a1.25 1.25 0 0 0 0-2.5h-2.244V3.5a1.25 1.25 0 1 0-2.5 0v2.252H14.25a1.25 1.25 0 0 0 0 2.5h2.256v2.248a1.25 1.25 0 1 0 2.5 0v-2.248Z"></path><path d="M22 19.25a2.75 2.75 0 0 1-2.75 2.75H4.75A2.75 2.75 0 0 1 2 19.25v-.403A6.837 6.837 0 0 1 8.815 12h6.37A6.837 6.837 0 0 1 22 18.847v.403ZM12 10.5a4 4 0 1 0-4-4 4.005 4.005 0 0 0 4 4Z"></path></svg>
              </button>
            </div>

          </div>
        </div>

        {/* Tabs divider */}
        <div className="mt-8 border-t flex justify-center gap-12" style={{ borderColor: 'var(--ig-border)' }}>
          <button 
            className="flex items-center gap-1.5 py-4 text-[12px] uppercase tracking-widest font-semibold border-t-[1px] -mt-[1px]"
            style={{ borderColor: 'var(--ig-text)', color: 'var(--ig-text)' }}
          >
            <Grid3X3 size={12} />
            Posts
          </button>
          <button 
            className="flex items-center gap-1.5 py-4 text-[12px] uppercase tracking-widest font-semibold border-t-[1px] border-transparent -mt-[1px]"
            style={{ color: 'var(--ig-text-secondary)' }}
          >
            <Video size={12} />
            Reels
          </button>
        </div>
      </div>

      <div className="px-0 sm:px-0 md:px-0" style={{ backgroundColor: 'var(--ig-bg)' }}>
        {loading ? (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 w-full max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse"
                style={{ backgroundColor: 'var(--ig-empty-bg)' }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: 'var(--ig-text-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm tracking-wide">Hələ heç bir material yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 w-full max-w-4xl mx-auto">
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

              const resolvedThumb = d.thumbnailUrl ? resolveFileUrl(d.thumbnailUrl) : null;

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
        
        {loadingMore && (
          <div className="flex justify-center items-center py-6">
            <div className="w-6 h-6 border-2 border-[var(--ig-text-secondary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Sentinel element for infinite scrolling */}
        <div ref={lastElementRef} className="h-10 w-full" />
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
