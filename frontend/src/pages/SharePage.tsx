import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence } from 'framer-motion';
import { Grid3X3, Video, Image as ImageIcon } from 'lucide-react';
import { PreviewModal } from './portal/DeliverablesPage';

interface SharedDeliverable {
  id: string;
  title: string;
  type: string | null;
  category?: { id: string; name: string; isVideo: boolean } | null;
  status: string;
  month: number;
  year: number;
  files: { url: string; name: string; size: number; type: string; downloadUrl?: string | null; previewUrl?: string | null }[];
  notes: string | null;
  clientFeedback: string | null;
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
  createdAt: string;
}

interface SharedClientProfile {
  name: string;
  igUsername: string | null;
  igBio: string | null;
  igFollowers: string | null;
  igFollowing: string | null;
  igPostsCount: string | null;
  igProfilePic: string | null;
  igHighlights?: { title: string; imageUrl: string }[];
}

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// A separate, interceptor-free instance — this page has no logged-in user,
// so apiClient's Bearer-token attach and 401→/portal redirect don't apply here.
const publicApi = axios.create({ baseURL: `${BACKEND}/api/v1` });

const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  return url;
};

const resolveFileUrl = (fileUrl: string | null | undefined): string => {
  const url = sanitizeUrl(fileUrl);
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getExt = (fileName: string | null | undefined): string => fileName?.split('.').pop()?.toLowerCase() ?? '';

const isImageFile = (mimeType: string | null | undefined, fileName: string | null | undefined): boolean => {
  if (mimeType?.startsWith('image/')) return true;
  return ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(getExt(fileName));
};

const getFileUrl = (f: { url: string; downloadUrl?: string | null } | null | undefined): string => {
  if (!f) return '';
  if (f.downloadUrl) return sanitizeUrl(f.downloadUrl);
  return resolveFileUrl(f.url);
};

const SharePage = () => {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<SharedClientProfile | null>(null);
  const [items, setItems] = useState<SharedDeliverable[]>([]);
  const [selectedItem, setSelectedItem] = useState<SharedDeliverable | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const fetchPage = useCallback((currentPage: number) => {
    if (!token) return;
    if (currentPage === 1) setLoading(true);
    else setLoadingMore(true);

    publicApi
      .get(`/share/${token}?page=${currentPage}&limit=6`)
      .then((res) => {
        const data = res.data as { data: SharedDeliverable[]; meta: { hasMore: boolean; total: number; client: SharedClientProfile } };
        setItems((prev) => (currentPage === 1 ? data.data : [...prev, ...data.data]));
        setHasMore(data.meta.hasMore);
        setTotalPosts(data.meta.total);
        setClient(data.meta.client);
      })
      .catch(() => setInvalid(true))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [token]);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const igUsername = client?.igUsername || 'username';
  const igProfilePic = sanitizeUrl(client?.igProfilePic || null);
  const igBio = client?.igBio || '';
  const igFollowers = client?.igFollowers || '0';
  const igFollowing = client?.igFollowing || '0';
  const igPostsCount = client?.igPostsCount || '0';
  const igHighlights = client?.igHighlights ?? [];
  const displayPostCount = igPostsCount !== '0' ? igPostsCount : String(totalPosts);

  if (invalid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ backgroundColor: 'var(--ig-bg)', color: 'var(--ig-text)' }}>
        <p className="text-lg font-semibold">Bu link etibarsızdır və ya vaxtı bitib</p>
        <p className="text-sm" style={{ color: 'var(--ig-text-secondary)' }}>Zəhmət olmasa yeni link üçün agentliklə əlaqə saxlayın.</p>
      </div>
    );
  }

  return (
    <div className="pb-16 min-h-screen font-sans" style={{ backgroundColor: 'var(--ig-bg)', color: 'var(--ig-text)' }}>
      {/* ── Mobile Top Nav ── */}
      <div className="flex md:hidden items-center justify-center px-4 h-11 border-b" style={{ borderColor: 'var(--ig-border)' }}>
        <div className="flex items-center gap-1 font-bold text-[16px]">
          {igUsername}
          <svg aria-label="Verified" color="#0095f6" fill="#0095f6" height="12" role="img" viewBox="0 0 40 40" width="12"><path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fillRule="evenodd"></path></svg>
        </div>
      </div>

      {/* ── Profile Header ── */}
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
                  <img src={resolveFileUrl(igProfilePic)} alt={igUsername} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-white select-none">
                    {(client?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
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

          {/* Desktop Avatar */}
          <div className="hidden md:block shrink-0">
            <div
              className="w-[150px] h-[150px] rounded-full overflow-hidden flex items-center justify-center border-[1px]"
              style={{
                borderColor: 'var(--ig-border)',
                background: igProfilePic ? 'transparent' : 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
              }}
            >
              {igProfilePic ? (
                <img src={resolveFileUrl(igProfilePic)} alt={igUsername} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-bold text-white select-none">
                  {(client?.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Desktop: Username Row */}
            <div className="hidden md:flex flex-wrap items-center gap-4 mb-5">
              <h1 className="text-[20px] font-normal truncate">{igUsername}</h1>
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
              </div>
            </div>

            {/* Desktop: Stats Row */}
            <div className="hidden md:flex items-center gap-10 mb-5 text-[16px]">
              <div><span className="font-semibold">{displayPostCount}</span> posts</div>
              <div><span className="font-semibold">{igFollowers}</span> followers</div>
              <div><span className="font-semibold">{igFollowing}</span> following</div>
            </div>

            {/* Bio */}
            <div className="text-[14px]">
              <p className="font-semibold">{client?.name || 'User'}</p>
              <p className="whitespace-pre-line leading-[18px]">{igBio}</p>
            </div>

            {/* Highlights */}
            {igHighlights.length > 0 && (
              <div className="mt-4 md:mt-6 overflow-x-auto no-scrollbar">
                <div className="flex gap-4 md:gap-8 pb-1" style={{ minWidth: 'min-content' }}>
                  {igHighlights.map((h, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 shrink-0 select-none w-[72px] md:w-[85px]">
                      <div
                        className="rounded-full flex items-center justify-center shrink-0 w-[64px] h-[64px] md:w-[80px] md:h-[80px]"
                        style={{ border: '1px solid var(--ig-border)', padding: '3px' }}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ig-bg)' }}>
                          <img
                            src={resolveFileUrl(h.imageUrl)}
                            alt={h.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] md:text-[12px] text-center truncate w-full" style={{ color: 'var(--ig-text)' }}>
                        {h.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile: Buttons Row */}
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

      {/* ── Grid ── */}
      <div style={{ backgroundColor: 'var(--ig-bg)' }}>
        {loading ? (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 w-full max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[3/4] animate-pulse" style={{ backgroundColor: 'var(--ig-empty-bg)' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: 'var(--ig-text-secondary)' }}>
            <p className="text-sm tracking-wide">Hələ heç bir material yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 w-full max-w-4xl mx-auto">
            {items.map((d) => {
              const hasFile = d.files && d.files.length > 0;
              const firstFile = hasFile ? d.files[0] : null;
              const isVideoType = d.category?.isVideo === true || d.type === 'VIDEO' || (firstFile?.type && firstFile.type.startsWith('video/'));
              const firstFileUrl = getFileUrl(firstFile);
              const isFirstFileImage = firstFile ? isImageFile(firstFile.type, firstFile.name) : false;
              const resolvedThumb = d.thumbnailUrl ? resolveFileUrl(d.thumbnailUrl) : null;
              const thumbnailSrc: string | null = resolvedThumb ?? (isFirstFileImage && firstFileUrl ? firstFileUrl : null);

              return (
                <div
                  key={d.id}
                  onClick={() => hasFile && setSelectedItem(d)}
                  className={['relative group aspect-[3/4] overflow-hidden', hasFile ? 'cursor-pointer' : 'cursor-default opacity-60'].join(' ')}
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  {thumbnailSrc ? (
                    <img src={thumbnailSrc} alt={d.title} className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-faint)' }}>
                      <ImageIcon size={28} strokeWidth={1.5} />
                      <span className="text-[9px] tracking-widest uppercase">Önizləmə yoxdur</span>
                    </div>
                  )}
                  {isVideoType && (
                    <div className="absolute top-2 right-2 pointer-events-none">
                      <Video size={16} className="text-white drop-shadow-lg" strokeWidth={2} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center py-6">
            <button
              onClick={() => { const next = page + 1; setPage(next); fetchPage(next); }}
              disabled={loadingMore}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--ig-btn-gray-bg)', color: 'var(--ig-btn-gray-text)' }}
            >
              {loadingMore ? 'Yüklənir...' : 'Daha çox göstər'}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <PreviewModal
            item={{ ...selectedItem, clientFeedback: null }}
            onClose={() => setSelectedItem(null)}
            onFeedbackSent={() => {}}
            readOnly
            profileOverride={{ igUsername: client?.igUsername, igProfilePic: client?.igProfilePic, name: client?.name }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SharePage;
