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
  const igProfilePic = sanitizeUrl(user?.igProfilePic || null);

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
  const igProfilePic = sanitizeUrl(user?.igProfilePic || null);
  const igHighlights: { title: string; imageUrl: string }[] = Array.isArray(user?.igHighlights) ? user.igHighlights : [];

  // Count only READY items as "posts"
  const actualPostCount = items.filter((d) => d.status === 'READY').length;
  const displayPostCount = igPostsCount !== '0' ? igPostsCount : String(actualPostCount);

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
