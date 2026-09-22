import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence } from 'framer-motion';
import { Video, Image as ImageIcon } from 'lucide-react';
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
        const data = res.data as { data: SharedDeliverable[]; meta: { hasMore: boolean; client: SharedClientProfile } };
        setItems((prev) => (currentPage === 1 ? data.data : [...prev, ...data.data]));
        setHasMore(data.meta.hasMore);
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
      {/* ── Profile Header ── */}
      <div className="px-4 sm:px-6 md:px-10 pt-8 md:pt-10 pb-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-6 md:gap-16">
          <div className="shrink-0">
            <div
              className="w-20 h-20 md:w-[120px] md:h-[120px] rounded-full overflow-hidden flex items-center justify-center border-[1px]"
              style={{
                borderColor: 'var(--ig-border)',
                background: igProfilePic ? 'transparent' : 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
              }}
            >
              {igProfilePic ? (
                <img src={resolveFileUrl(igProfilePic)} alt={igUsername} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl md:text-4xl font-bold text-white select-none">
                  {(client?.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-[18px] md:text-[20px] font-semibold truncate">{client?.name || igUsername}</h1>
            <p className="text-sm" style={{ color: 'var(--ig-text-secondary)' }}>{client?.igBio}</p>
          </div>
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
