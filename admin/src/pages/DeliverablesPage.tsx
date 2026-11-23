import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MAX_PARALLEL_UPLOADS, useDeliverableUpload } from '../context/deliverableUpload';
import { Archive, Download, Edit2, FileX, Image, Link2, Loader2, MessageCircle, Play, Plus, Search, Tags, Trash2, Video, X } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ShareLinkModal, { ShareStatusDot } from '../components/shared/ShareLinkModal';
import type { ShareLinkInfo } from '../lib/shareLink';
import { shareStatusLine } from '../lib/shareLink';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { useReplyStore } from '../store/replyStore';
import Combobox from '../components/ui/Combobox';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';
import { HighlightsManager } from '../components/deliverables/HighlightsManager';
import CategoryManagerModal from '../components/deliverables/CategoryManagerModal';
import { ColumnFilter, SortHeader } from '../components/deliverables/ColumnHeader';
import {
  AddedFilterPanel,
  CategoryFilterPanel,
  ClientFilterPanel,
  StatusFilterPanel,
} from '../components/deliverables/DeliverableColumnFilters';
import ActiveFilterChips from '../components/deliverables/ActiveFilterChips';
import MobileFilterSheet from '../components/deliverables/MobileFilterSheet';
import UploadStateNote from '../components/deliverables/UploadStateNote';
import { isUploadProblem, type UploadState } from '../lib/uploadState';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  PAGE_SIZES,
  buildListParams,
  countActiveFilters,
  describeFilters,
  emptyFilters,
  formatAddedDay,
  formatAddedDateTime,
  nextSort,
  parseSort,
  type DeliverableFilters,
  type SortKey,
} from '../lib/deliverableList';
import { needsRealEmail, retentionLockReason, retentionNote } from '../lib/retention';

const isStalePending = (deliverable: Partial<Deliverable>) => {
  if (deliverable.status !== 'PENDING' || !deliverable.createdAt) return false;
  const createdTime = new Date(deliverable.createdAt).getTime();
  return Date.now() - createdTime > 2 * 60 * 60 * 1000;
};

// A file still being processed must not be replaced: the server rejects it too
// (409). A PROCESSING row untouched for 2 h is treated as stuck, so replacing it
// is allowed again — same threshold as isStalePending.
const isProcessingBusy = (deliverable: Partial<Deliverable> | null) => {
  if (!deliverable || deliverable.status !== 'PROCESSING' || !deliverable.updatedAt) return false;
  return Date.now() - new Date(deliverable.updatedAt).getTime() < 2 * 60 * 60 * 1000;
};

type DeliverableStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED';

interface ClientUser extends Record<string, unknown> {
  id: string;
  name: string;
  email?: string;
  /** Highlights on the client's profile (rows, or the older one-image form until first edited). */
  highlightCount?: number;
  shareUrl?: string | null;
  shareTokenExpiresAt?: string | null;
  shareLastViewedAt?: string | null;
  /** The client has a real mailbox, so the retention warnings reach them. */
  canReceiveNotices?: boolean;
}

interface DeliverableCategory extends Record<string, unknown> {
  id: string;
  name: string;
  isVideo: boolean;
  /** Files using it (API); a category with files cannot be deleted. */
  fileCount?: number;
}

interface Deliverable extends Record<string, unknown> {
  id: string;
  clientId: string;
  client?: ClientUser;
  type?: string | null;
  categoryId?: string | null;
  category?: DeliverableCategory | null;
  status: DeliverableStatus;
  month: number;
  year: number;
  title: string;
  files: { url: string; name: string; size: number; type: string; downloadUrl?: string | null; previewUrl?: string | null; originalDownloadUrl?: string | null }[];
  thumbnailUrl?: string | null;
  thumbnailDownloadUrl?: string | null;
  originalUrl?: string | null;
  clientFeedback?: string | null;
  notes?: string | null;
  staffReply?: string | null;
  staffReplyAt?: string | null;
  processingDuration?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // Video retention (null while the rule does not apply or is switched off).
  expiresAt?: string | null;
  hiddenAt?: string | null;
  mediaDeletedAt?: string | null;
  // Upload tracking (backend/src/services/deliverableUpload.service.ts).
  createdBy?: { id: string; name: string } | null;
  uploadState?: UploadState | null;
  uploadProgress?: number | null;
  uploadReason?: string | null;
  uploadAt?: string | null;
}

interface DeliverableFormValues {
  title: string;
  notes: string;
  clientId: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
}

const defaultValues: DeliverableFormValues = {
  title: '',
  notes: '',
  clientId: '',
  categoryId: '',
  date: new Date().toISOString().split('T')[0],
};



const statusLabels: Record<DeliverableStatus, string> = {
  PENDING: 'Gözləmədə',
  PROCESSING: 'Hazırlanır',
  READY: 'Hazırdır',
  FAILED: 'Xəta',
  ARCHIVED: 'Arxivlənib',
};

const statusVariant = (status: DeliverableStatus) => {
  if (status === 'PENDING') return 'warning';
  if (status === 'PROCESSING') return 'info';
  if (status === 'READY') return 'success';
  if (status === 'FAILED') return 'danger';
  return 'default';
};

// ─── Media helpers ────────────────────────────
const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getExt = (fileName: string | null | undefined): string =>
  fileName?.split('.').pop()?.toLowerCase() ?? '';

const isVideoFile = (mimeType: string | null | undefined, fileName: string | null | undefined): boolean => {
  if (mimeType?.startsWith('video/')) return true;
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(getExt(fileName));
};

const isImageFile = (mimeType: string | null | undefined, fileName: string | null | undefined): boolean => {
  if (mimeType?.startsWith('image/')) return true;
  return ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(getExt(fileName));
};

const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('blob:')) {
    return '/placeholder.jpg';
  }
  if (!lower.startsWith('https://') && !lower.startsWith('/')) {
    if (lower.startsWith('http://localhost') || lower.startsWith('http://127.0.0.1')) {
      return url;
    }
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

  let finalUrl = `${BACKEND}/api/v1/uploads/${normalized}?portal=admin`;
  const token = localStorage.getItem('adminToken');
  if (token) {
    finalUrl += `&adminToken=${token}`;
  }
  return sanitizeUrl(finalUrl);
};

// ─── Admin Custom Media Preview Overlay ─────────
const PreviewOverlay = ({
  item,
  onClose,
}: {
  item: Deliverable;
  onClose: () => void;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFile = item.files?.[activeIndex];
  // Same rule as the client portal: the file's own original, else (first file only) the post's
  // original, else the file as shown. Older posts only have an original for the first image.
  const activeDownloadUrl =
    activeFile?.originalDownloadUrl || (activeIndex === 0 ? item.originalUrl : null) || activeFile?.downloadUrl || '';
  const hasMultipleFiles = (item.files?.length ?? 0) > 1;
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState('');
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  const saveUrl = (href: string, fileName?: string) => {
    const link = document.createElement('a');
    link.href = href;
    if (fileName) link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    if (zipBusy) return;
    setZipBusy(true);
    setZipError('');
    try {
      // Time limit so "Hazırlanır…" can never spin forever when the storage is slow.
      const response = await api.post<ApiEnvelope<{ ticket: string }>>(`/deliverables/${item.id}/zip-ticket`, undefined, { timeout: 60000 });
      saveUrl(`${BACKEND}/api/v1/downloads/${response.data.data.ticket}`);
      setDownloadMenuOpen(false);
    } catch (err) {
      const timedOut = (err as { code?: string })?.code === 'ECONNABORTED';
      setZipError(requestErrorMessage(err, timedOut ? 'Hazırlanması çox çəkdi, yenidən cəhd edin.' : 'ZIP hazırlana bilmədi. Yenidən cəhd edin.'));
    } finally {
      setZipBusy(false);
    }
  };

  // Close the download menu on an outside click or Esc (Esc closes only the menu, not the preview).
  useEffect(() => {
    if (!downloadMenuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setDownloadMenuOpen(false);
      }
    };
    // Capture phase: the header stops mousedown from bubbling to keep the preview open.
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [downloadMenuOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const url = sanitizeUrl(activeFile?.downloadUrl || resolveFileUrl(activeFile?.url));
  if (!url || !activeFile) return null;



  const renderMedia = () => {
    if (isVideoFile(activeFile.type, activeFile.name)) {
      return (
        <video controls autoPlay={false} playsInline preload="metadata" className="max-h-[75vh] max-w-full shadow-2xl outline-none" src={activeFile.previewUrl || url} key={url}>
          Brauzeriniz video formatını dəstəkləmir.
        </video>
      );
    }
    if (isImageFile(activeFile.type, activeFile.name)) {
      return (
        <img
          src={url}
          alt="Önizləmə"
          className="object-contain max-h-[75vh] max-w-full shadow-2xl"
          key={url}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full text-center">
        <FileX className="h-16 w-16 text-muted mb-4" />
        <p className="text-sm text-faint">
          Bu fayl növü üçün önizləmə yoxdur. Zəhmət olmasa yükləyin.
        </p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-sidebar-active/95 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      {/* Header Controls - High Z-index */}
      <div
        className="flex items-center justify-between p-4 md:px-8 absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/50 to-transparent"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-white drop-shadow-md">
            {item.title || item.category?.name || item.type || 'Fayl'}
          </p>
          <Badge variant="info">{statusLabels[item.status] || item.status}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {url && !hasMultipleFiles && (
            <a
              href={sanitizeUrl(activeDownloadUrl || '#')}
              download={activeFile?.name || 'file'}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-surface/10 hover:bg-surface/20 rounded-lg transition-colors backdrop-blur-md"
            >
              <Download className="h-4 w-4" />
              Yüklə
            </a>
          )}
          {url && hasMultipleFiles && (
            <div ref={downloadMenuRef} className="relative">
              <button
                type="button"
                onClick={() => { setZipError(''); setDownloadMenuOpen((open) => !open); }}
                aria-haspopup="menu"
                aria-expanded={downloadMenuOpen}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-surface/10 hover:bg-surface/20 rounded-lg transition-colors backdrop-blur-md"
              >
                <Download className="h-4 w-4" />
                Yüklə
              </button>
              {downloadMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-lg border border-edge bg-surface py-1 shadow-xl"
                >
                  <a
                    role="menuitem"
                    href={sanitizeUrl(activeDownloadUrl || '#')}
                    download={activeFile?.name || 'file'}
                    onClick={() => setDownloadMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-heading transition hover:bg-surface-hover"
                  >
                    <Download className="h-4 w-4 text-faint" />
                    Bu faylı yüklə
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleDownloadAll}
                    disabled={zipBusy}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-heading transition hover:bg-surface-hover disabled:opacity-60"
                  >
                    {zipBusy ? <Loader2 className="h-4 w-4 animate-spin text-faint" /> : <Archive className="h-4 w-4 text-faint" />}
                    {zipBusy ? 'Hazırlanır…' : `Hamısını yüklə (${item.files.length}, ZIP)`}
                  </button>
                  {zipError && (
                    <p className="px-3 pb-2 pt-1 text-xs leading-snug text-red-500" role="alert">{zipError}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {item.thumbnailDownloadUrl && (
            <a
              href={sanitizeUrl(item.thumbnailDownloadUrl)}
              download="kover"
              title="Koveri yüklə"
              aria-label="Koveri yüklə"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-surface/10 hover:bg-surface/20 rounded-lg transition-colors backdrop-blur-md"
            >
              <Image className="h-4 w-4" />
              Kover
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-faint hover:text-white hover:bg-surface/10 transition-colors backdrop-blur-md"
            aria-label="Bağla"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Centered Media Container */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 overflow-hidden w-full pt-16"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {renderMedia()}
        {/* Thumbnails strip if multiple files */}
        {item.files && item.files.length > 1 && (
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2 max-w-3xl w-full justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {item.files.map((f, idx) => (
              <button
                key={f.url}
                onClick={() => setActiveIndex(idx)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === activeIndex ? 'border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
              >
                {isImageFile(f.type, f.name) ? (
                  <img src={sanitizeUrl(f.downloadUrl || resolveFileUrl(f.url))} className="w-full h-full object-cover" alt={f.name} />
                ) : isVideoFile(f.type, f.name) ? (
                  <div className="w-full h-full bg-black flex items-center justify-center"><Play className="h-6 w-6 text-white" /></div>
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center"><FileX className="h-6 w-6 text-white" /></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DeliverablesPage = () => {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [categories, setCategories] = useState<DeliverableCategory[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 400);
  const [filters, setFilters] = useState<DeliverableFilters>(emptyFilters);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // Uploads that need attention (cut off, not processed, cancelled): drives the strip above the table.
  const [problemCount, setProblemCount] = useState(0);
  const reuploadInput = useRef<HTMLInputElement>(null);
  const reuploadTarget = useRef<Deliverable | null>(null);
  const [resumingId, setResumingId] = useState('');
  // Only the newest request may update the table (filters change faster than the API answers).
  const requestId = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // File categories live behind the "Kateqoriyalar" button (they were deleted by accident from the open chip row).
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [deleting, setDeleting] = useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Errors from saving the form are shown inside the modal: the page-level banner
  // sits behind the modal overlay and would go unnoticed.
  const [modalError, setModalError] = useState('');
  // Uploads run in an app-level context so they survive leaving this page.
  const upload = useDeliverableUpload();
  // Why a row cannot be edited or deleted right now: an upload from this tab is in
  // flight, or the server is still processing it. Replacing/removing the file
  // mid-way used to leave orphaned files in storage.
  const busyReason = (d: Deliverable | null): string | null => {
    if (!d) return null;
    if (upload.uploadFor(d.id)) return 'Fayl yüklənir. Yükləmə bitəndən sonra redaktə edin və ya silin.';
    if (isProcessingBusy(d)) return 'Fayl emal olunur (1–5 dəqiqə). Emal bitəndən sonra redaktə edin və ya silin.';
    return null;
  };
  const [feedbackView, setFeedbackView] = useState<Deliverable | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [sharingClient, setSharingClient] = useState<ClientUser | null>(null);
  const [previewItem, setPreviewItem] = useState<Deliverable | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'highlights'>('files');
  // Creators (videographers) get a restricted view: own uploads, no client
  // emails, no category management; they use /creator/* endpoints for clients.
  const isCreator = useAuthStore((state) => state.user?.role === 'CREATOR');
  const shareLinkBase = isCreator ? '/creator/clients' : '/users';

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<DeliverableFormValues>({
    defaultValues,
  });

  const watchedCategoryId = watch('categoryId');
  const isSelectedCategoryVideo = useMemo(() => {
    if (!watchedCategoryId) return false;
    const cat = categories.find(c => c.id === watchedCategoryId);
    return cat?.isVideo ?? false;
  }, [watchedCategoryId, categories]);
  // The cover field: a video category, or a video among the chosen / current files (so a wrong
  // category never hides it).
  const showCoverField =
    isSelectedCategoryVideo ||
    selectedFiles.some((f) => isVideoFile(f.type, f.name)) ||
    (editing?.files ?? []).some((f) => isVideoFile(f.type, f.name));

  const thumbnailPreview = useMemo(() => {
    if (!selectedThumbnail) return null;
    return URL.createObjectURL(selectedThumbnail);
  }, [selectedThumbnail]);

  const clientOptions = useMemo(
    () => clients.map((client) => ({
      value: client.id,
      label: client.name,
      subLabel: client.email
    })),
    [clients],
  );

  const fetchClients = async () => {
    if (useAuthStore.getState().user?.role === 'CREATOR') {
      const response = await api.get<ApiEnvelope<ClientUser[]>>('/creator/clients');
      setClients(response.data.data);
      return;
    }
    const response = await api.get<ApiEnvelope<Paginated<ClientUser>>>('/users?role=CLIENT&limit=100');
    setClients(response.data.data.items);
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get<ApiEnvelope<DeliverableCategory[]>>('/deliverable-categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchDeliverables = async (silent = false) => {
    const currentRequest = ++requestId.current;
    if (!silent) setIsLoading(true);
    setError('');
    try {
      const params = buildListParams({ page, pageSize, sort, search: debouncedSearch, filters });
      const response = await api.get<ApiEnvelope<Paginated<Deliverable>>>(`/deliverables?${params.toString()}`);
      if (currentRequest !== requestId.current) return;
      const data = response.data.data;
      setDeliverables(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      setProblemCount((data as { problemCount?: number }).problemCount ?? 0);
      // The last row of the last page was removed: step back one page.
      if ((data.items || []).length === 0 && page > 1 && (data.total ?? 0) > 0) setPage(page - 1);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError(requestErrorMessage(err, 'Fayllar yüklənə bilmədi.'));
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  };
  // Callbacks that outlive this render (an upload finishing later) must refetch with
  // the filters of the moment, not those captured when the upload started.
  const fetchRef = useRef(fetchDeliverables);
  useEffect(() => {
    fetchRef.current = fetchDeliverables;
  });

  // Another admin's (or another tab's) upload is only known to the server: refresh the rows quietly
  // while one is in flight so its percentage and its end show up without a manual reload.
  const serverUploadRunning = deliverables.some((d) => d.uploadState === 'uploading' && !upload.uploadFor(d.id));
  useEffect(() => {
    if (!serverUploadRunning) return;
    const timer = setInterval(() => void fetchRef.current(true), 20000);
    return () => clearInterval(timer);
  }, [serverUploadRunning]);

  // "Yenidən yüklə" on a row whose upload did not finish: pick the file, then the usual upload starts.
  const askReupload = (d: Deliverable) => {
    reuploadTarget.current = d;
    reuploadInput.current?.click();
  };
  const onReuploadPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = reuploadTarget.current;
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    reuploadTarget.current = null;
    if (!target || picked.length === 0) return;
    if (!upload.canStart) {
      setError(`Eyni anda ən çox ${MAX_PARALLEL_UPLOADS} yükləmə ola bilər. Əvvəlkilərdən biri bitəndən sonra yenidən cəhd edin.`);
      return;
    }
    setError('');
    upload.start(target.id, picked, null, () => {
      fetchRef.current();
    });
  };
  const resumeUpload = async (d: Deliverable) => {
    setResumingId(d.id);
    setError('');
    let failure = '';
    try {
      await api.post(`/deliverables/${d.id}/resume-finalize`);
    } catch (err) {
      failure = requestErrorMessage(err, 'Emal başladıla bilmədi. Faylı yenidən yükləyin.');
    }
    setResumingId('');
    await fetchDeliverables(true); // clears the banner first, so the message is set after it
    if (failure) setError(failure);
  };
  // What the server says about the row's upload, unless this very tab is uploading it (that card is live).
  const noteFor = (d: Deliverable) => {
    if (!d.uploadState || upload.uploadFor(d.id)) return null;
    return (
      <UploadStateNote
        state={d.uploadState}
        progress={d.uploadProgress}
        reason={d.uploadReason}
        at={d.uploadAt}
        uploader={!isCreator ? d.createdBy?.name : null}
        busy={resumingId === d.id}
        onReupload={() => askReupload(d)}
        onResume={() => void resumeUpload(d)}
      />
    );
  };

  // Any filter/search/sort/page-size change goes back to page 1.
  const updateFilters = (patch: Partial<DeliverableFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const clearAllFilters = () => {
    setFilters(emptyFilters);
    setSearchQuery('');
    setPage(1);
  };
  const filtersActive = countActiveFilters(filters) > 0 || Boolean(debouncedSearch);

  useEffect(() => {
    fetchClients().catch((err) => setError(requestErrorMessage(err, 'Müştərilər yüklənə bilmədi.')));
    fetchCategories().catch((err) => setError(requestErrorMessage(err, 'Kateqoriyalar yüklənə bilmədi.')));
  }, []);

  useEffect(() => {
    fetchDeliverables();
  }, [page, pageSize, sort, filters, debouncedSearch]);

  const openFeedback = (d: Deliverable) => {
    setFeedbackView(d);
    setReplyText(d.staffReply ?? '');
    setReplyError('');
  };

  const sendReply = async () => {
    if (!feedbackView) return;
    setReplySaving(true);
    setReplyError('');
    try {
      await api.patch(`/deliverables/${feedbackView.id}/reply`, { reply: replyText.trim() });
      setFeedbackView(null);
      await fetchDeliverables(true);
      useReplyStore.getState().fetchUnansweredCount().catch(() => {});
    } catch (err) {
      setReplyError(requestErrorMessage(err, 'Cavab göndərilə bilmədi.'));
    } finally {
      setReplySaving(false);
    }
  };

  const openModal = (deliverable?: Deliverable) => {
    if (deliverable && (busyReason(deliverable) || deliverable.mediaDeletedAt)) return;
    setEditing(deliverable || null);
    setModalError('');
    setSelectedFiles([]);
    setSelectedThumbnail(null);
    reset(
      deliverable
        ? {
          title: deliverable.title,
          notes: deliverable.notes ?? '',
          clientId: deliverable.clientId,
          categoryId: deliverable.categoryId || '',
          date: `${deliverable.year}-${String(deliverable.month).padStart(2, '0')}-01`,
        }
        : defaultValues,
    );
    setIsModalOpen(true);
  };

  const saveDeliverable = async (values: DeliverableFormValues) => {
    // The record is created before the upload starts, so refuse here (not after
    // the POST) when all upload slots are taken — otherwise a file-less
    // "Gözləmədə" record would be left behind.
    if ((selectedFiles.length > 0 || (showCoverField && selectedThumbnail)) && !upload.canStart) {
      setModalError(
        `Eyni anda ən çox ${MAX_PARALLEL_UPLOADS} yükləmə ola bilər. Əvvəlkilərdən biri bitəndən sonra yenidən yadda saxlayın.`,
      );
      return;
    }
    setIsSaving(true);
    setError('');
    setModalError('');
    try {
      const date = new Date(values.date);
      const payload = {
        title: values.title,
        notes: values.notes.trim(),
        clientId: values.clientId,
        categoryId: values.categoryId || null,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      };

      const response = editing
        ? await api.patch<ApiEnvelope<Deliverable>>(`/deliverables/${editing.id}`, payload)
        : await api.post<ApiEnvelope<Deliverable>>('/deliverables', payload);

      const deliverableId = editing?.id || response.data.data.id;
      const filesToUpload = [...selectedFiles];
      // A cover picked earlier is dropped when the field is hidden now (e.g. the video was swapped for an image).
      const thumbToUpload = showCoverField ? selectedThumbnail : null;

      if (filesToUpload.length === 0 && !thumbToUpload) {
        setIsModalOpen(false);
        setIsSaving(false);
        await fetchDeliverables();
        return;
      }

      // The record exists — hand the (potentially long) upload to the app-level
      // background task and free the modal so the admin can keep working, even
      // on other pages.
      // Refetch when it finishes or fails (a no-op if the admin left the page;
      // the list is fetched again on return).
      upload.start(deliverableId, filesToUpload, thumbToUpload, () => {
        fetchRef.current();
      });
      setIsModalOpen(false);
      setIsSaving(false);
      await fetchDeliverables();
    } catch (err) {
      setModalError(requestErrorMessage(err, 'Fayl yadda saxlanıla bilmədi.'));
      setIsSaving(false);
    }
  };

  // The client list (fetchClients) carries the freshest link state, including the last view;
  // the client embedded in a deliverable row is only the fallback.
  const clientLink = (client: ClientUser): ClientUser => ({ ...client, ...(clients.find((c) => c.id === client.id) ?? {}) });

  const openShareModal = (client: ClientUser) => setSharingClient(clientLink(client));

  const handleShareLinkChanged = (clientId: string, link: ShareLinkInfo) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...link } : c)));
    fetchClients().catch(() => undefined);
  };

  // Column headers sort on click; the funnel next to a title filters that column.
  const sortState = parseSort(sort);
  const sortBy = (key: SortKey) => {
    setSort(nextSort(sort, key));
    setPage(1);
  };
  const ariaSortFor = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sortState.key === key ? (sortState.order === 'asc' ? 'ascending' : 'descending') : 'none';
  const headerFor = (key: SortKey, label: string, filter?: ReactNode) => (
    <span className="inline-flex items-center gap-1.5">
      <SortHeader label={label} active={sortState.key === key} order={sortState.order} onClick={() => sortBy(key)} />
      {filter}
    </span>
  );
  const filterChips = describeFilters(filters, { clients: clientOptions, categories, statusLabels });

  const columns: TableColumn<Deliverable>[] = [
    {
      key: 'client',
      header: headerFor(
        'client',
        'Müştəri',
        <ColumnFilter label="Müştəri" active={Boolean(filters.clientId)} width={300}>
          {(close) => <ClientFilterPanel clients={clientOptions} value={filters.clientId} onChange={updateFilters} close={close} />}
        </ColumnFilter>,
      ),
      ariaSort: ariaSortFor('client'),
      render: (deliverable) => (
        <div className="flex flex-col">
          <span>{deliverable.client?.name || 'Naməlum müştəri'}</span>
          {/* Phones hide the title column: keep the file name visible under the client. */}
          <span className="max-w-[180px] truncate text-xs text-muted sm:hidden">{deliverable.title || 'Başlıqsız'}</span>
          {isUploadProblem(deliverable.uploadState) && <div className="mt-1.5 sm:hidden">{noteFor(deliverable)}</div>}
        </div>
      ),
    },
    {
      key: 'title',
      header: headerFor('title', 'Başlıq / Fayl'),
      ariaSort: ariaSortFor('title'),
      hideOnMobile: true,
      render: (deliverable) => {
        const hasFiles = deliverable.files && deliverable.files.length > 0;
        const primaryFile = hasFiles ? deliverable.files[0] : null;
        return hasFiles ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewItem(deliverable);
            }}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline text-left transition-colors"
            title="Önizləməyə bax"
          >
            {(primaryFile && (isVideoFile(primaryFile.type, primaryFile.name) ||
              isImageFile(primaryFile.type, primaryFile.name))) && (
                <Play className="h-3 w-3 shrink-0" />
              )}
            <span className="truncate max-w-[160px] font-medium">
              {deliverable.title || 'Başlıksız'} {deliverable.files.length > 1 && <span className="text-xs text-muted">({deliverable.files.length})</span>}
            </span>
          </button>
        ) : (
          <span className="text-faint text-xs italic">{deliverable.title || 'Başlıksız'}{!deliverable.uploadState && ' (Fayl yoxdur)'}</span>
        );
      },
    },
    {
      key: 'categoryId',
      header: headerFor(
        'category',
        'Növ',
        <ColumnFilter label="Növ" active={Boolean(filters.categoryId)}>
          {(close) => <CategoryFilterPanel categories={categories} value={filters.categoryId} onChange={updateFilters} close={close} />}
        </ColumnFilter>,
      ),
      ariaSort: ariaSortFor('category'),
      render: (deliverable) => (
        <Badge variant="info">
          {deliverable.category?.name || deliverable.type || 'Növ yoxdur'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: headerFor(
        'status',
        'Status',
        <ColumnFilter label="Status" active={Boolean(filters.status || filters.stale || filters.hasFeedback || filters.uploadProblem || filters.retention)} width={300}>
          {(close) => <StatusFilterPanel statusLabels={statusLabels} filters={filters} onChange={updateFilters} close={close} />}
        </ColumnFilter>,
      ),
      ariaSort: ariaSortFor('status'),
      hideOnMobile: true,
      render: (deliverable) => {
        const isStale = isStalePending(deliverable) && !deliverable.uploadState;
        const retention = retentionNote(deliverable);
        const uploadNote = noteFor(deliverable);

        return (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5">
              {/* A file-less row whose upload has its own badge below shows only that one. */}
              {!(uploadNote && deliverable.status === 'PENDING') && (
              <span
                title={
                  (deliverable.processingDuration ?? 0) > 0 && deliverable.status === 'READY'
                    ? `Emal müddəti: ${Math.floor(deliverable.processingDuration! / 60)} dəq ${deliverable.processingDuration! % 60} san`
                    : undefined
                }
              >
                <Badge variant={statusVariant(deliverable.status)}>
                  {statusLabels[deliverable.status] || deliverable.status}
                </Badge>
              </span>
              )}
              {isStale && (
                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-sm" title="2 saatdan çoxdur gözləmədədir. Yükləmə tamamlanmayıb, faylı yenidən yükləyin.">
                  Gözləmədə qalıb
                </span>
              )}
              {(deliverable.clientFeedback || deliverable.staffReply) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFeedback(deliverable);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset transition ${
                    deliverable.clientFeedback && !deliverable.staffReply
                      ? 'bg-orange-50 text-orange-700 ring-orange-600/20 hover:bg-orange-100'
                      : 'bg-sky-50 text-sky-700 ring-sky-600/20 hover:bg-sky-100'
                  }`}
                  title="Rəyi göstər"
                >
                  <MessageCircle className="h-3 w-3" />
                  Rəy
                </button>
              )}
            </div>
            {uploadNote}
            {upload.uploadFor(deliverable.id) && (
              <span className="text-[10px] text-faint italic ml-1">
                Fayl yüklənir… {upload.uploadFor(deliverable.id)!.pct}%
              </span>
            )}
            {deliverable.status === 'PROCESSING' && (
              <span className="text-[10px] text-faint italic ml-1">Emal gedir, 1–5 dəqiqə çəkə bilər.</span>
            )}
            {!isCreator && needsRealEmail(deliverable, deliverable.client?.canReceiveNotices) && (
              <span
                className="text-[10px] ml-1 text-red-600"
                title="Bu müştərinin e-poçtu real deyil (və ya mail çatmır), ona görə silinmə xəbərdarlığı gedə bilməz. Müştərilər bölməsində real e-poçtu yazın."
              >
                Müştərinin real e-poçtu yoxdur, xəbərdarlıq getməyəcək
              </span>
            )}
            {retention && (
              <span
                className={`text-[10px] ml-1 ${retention.tone === 'warning' ? 'text-amber-600' : 'text-faint'} ${retention.tone === 'deleted' ? 'font-medium' : 'italic'}`}
                title={deliverable.expiresAt ? `Müştəri bu videonu ${formatAddedDay(deliverable.expiresAt)} tarixinə qədər görür` : undefined}
              >
                {retention.text}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'createdAt',
      header: headerFor(
        'createdAt',
        'Əlavə olunub',
        <ColumnFilter label="Əlavə olunub" active={Boolean(filters.from || filters.to)} width={300}>
          {(close) => <AddedFilterPanel from={filters.from} to={filters.to} onChange={updateFilters} close={close} />}
        </ColumnFilter>,
      ),
      ariaSort: ariaSortFor('createdAt'),
      render: (deliverable) => (
        <span className="whitespace-nowrap text-muted" title={formatAddedDateTime(deliverable.createdAt) || undefined}>
          {formatAddedDay(deliverable.createdAt) || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (deliverable) => {
        const reason = busyReason(deliverable);
        const editReason = reason ?? (deliverable.mediaDeletedAt ? retentionLockReason(deliverable) : null);
        return (
        <div className="flex gap-2">
          {/* title sits on the wrapper: disabled buttons don't show their own tooltip */}
          <span className="inline-flex" title={editReason ?? undefined}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal(deliverable)}
              disabled={Boolean(editReason)}
              aria-label="Faylı redaktə et"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </span>
          {deliverable.client && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openShareModal(deliverable.client!)}
              aria-label="Müştərinin paylaşım linki"
              title={`Müştərinin paylaşım linki — ${shareStatusLine(clientLink(deliverable.client))}`}
              className="relative"
            >
              <Link2 className="h-4 w-4" />
              <ShareStatusDot link={clientLink(deliverable.client)} />
            </Button>
          )}
          <span className="inline-flex" title={reason ?? undefined}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleting(deliverable)}
              disabled={Boolean(reason)}
              aria-label="Faylı sil"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>
        </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Tabs ── */}
      <div className="flex border-b border-edge">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'files'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-heading hover:border-edge'
            }`}
        >
          Layihə Faylları
        </button>
        <button
          onClick={() => setActiveTab('highlights')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'highlights'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-heading hover:border-edge'
            }`}
        >
          Önə Çıxanlar (Highlights)
        </button>
      </div>

      {activeTab === 'highlights' ? (
        <HighlightsManager clients={clients} onRefreshClients={fetchClients} />
      ) : (
        <>
          <input ref={reuploadInput} type="file" multiple className="hidden" onChange={onReuploadPicked} aria-hidden="true" tabIndex={-1} />
          {(problemCount > 0 || filters.uploadProblem) && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400 ring-1 ring-inset ring-amber-500/20"
            >
              <span>
                {problemCount > 0
                  ? `${problemCount} yükləmə diqqət tələb edir`
                  : 'Diqqət tələb edən yükləmə qalmayıb'}
              </span>
              <button
                type="button"
                className="font-medium underline-offset-2 hover:underline"
                onClick={() => updateFilters({ uploadProblem: !filters.uploadProblem })}
              >
                {filters.uploadProblem ? 'Hamısını göstər' : 'Göstər'}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
            <div>
              <h1 className="text-2xl font-semibold text-heading">Layihə Faylları</h1>
              <p className="mt-1 text-sm text-muted">Müştərilərə göndərilən faylları idarə edin.</p>
            </div>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              {!isCreator && (
                <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)} className="w-full sm:w-auto">
                  <Tags className="h-4 w-4" />
                  Kateqoriyalar
                </Button>
              )}
              <Button onClick={() => openModal()} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Fayl Əlavə Et
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-faint" />
                </div>
                <Input
                  placeholder={isCreator ? 'Müştəri adı və ya başlıq ilə axtarın...' : 'Müştəri, e-poçt və ya başlıq ilə axtarın...'}
                  className="pl-10 pr-9"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Axtarış"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                    }}
                    aria-label="Axtarışı sil"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-faint hover:text-heading"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <MobileFilterSheet
                filters={filters}
                onFiltersChange={updateFilters}
                onClearFilters={() => updateFilters(emptyFilters)}
                sort={sort}
                onSortChange={(value) => {
                  setSort(value);
                  setPage(1);
                }}
                clients={clientOptions}
                categories={categories}
                statusLabels={statusLabels}
                activeCount={countActiveFilters(filters)}
              />
            </div>
            <ActiveFilterChips chips={filterChips} onClearOne={updateFilters} onClearAll={clearAllFilters} />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Table
            minimal
            columns={columns}
            data={deliverables}
            isLoading={isLoading}
            emptyMessage={filtersActive ? 'Filtrə uyğun fayl tapılmadı.' : 'Fayl tapılmadı.'}
            rowClassName={(row) => (isUploadProblem(row.uploadState) ? 'bg-amber-500/5' : isStalePending(row) ? 'bg-red-500/10 hover:bg-red-500/15' : row.mediaDeletedAt ? 'opacity-60' : '')}
          />
          <div className="flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>{filtersActive ? `Tapıldı: ${total} fayl` : `Cəmi: ${total} fayl`}</span>
            {total > 0 && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <label className="flex items-center gap-2">
                  Səhifədə
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(parseInt(event.target.value, 10));
                      setPage(1);
                    }}
                    className="rounded-md border border-field-border bg-field px-2 py-1 text-xs text-heading outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
                      ‹ Əvvəlki
                    </Button>
                    <span className="font-medium text-body">{page} / {totalPages}</span>
                    <Button variant="ghost" size="sm" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
                      Növbəti ›
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Create / Edit Modal ── */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editing ? 'Faylı Redaktə Et' : 'Yeni Fayl Əlavə Et'}
            size="lg"
          >
            <form onSubmit={handleSubmit(saveDeliverable)} className="space-y-4">
              <Input
                label="Başlıq"
                placeholder="Faylın başlığını daxil edin..."
                error={errors.title?.message}
                {...register('title', { required: 'Başlıq mütləqdir' })}
              />
              <Textarea
                label="Müştəriyə qeyd (istəyə bağlı)"
                placeholder="Müştəri bu mətni materialın altında görəcək..."
                maxLength={2000}
                {...register('notes')}
              />
              <Controller
                name="clientId"
                control={control}
                rules={{ required: 'Müştəri mütləqdir' }}
                render={({ field }) => (
                  <Combobox
                    label="Müştəri"
                    options={clientOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.clientId?.message}
                  />
                )}
              />
              <Select
                label="Növ"
                options={[
                  { value: '', label: 'Kateqoriya seçin' },
                  ...(Array.isArray(categories) ? categories.map(c => ({ value: c.id, label: c.name })) : [])
                ]}
                error={errors.categoryId?.message}
                {...register('categoryId', { required: 'Növ seçmək mütləqdir' })}
              />
              {/* Existing files list (edit mode) */}
              {editing && editing.files && editing.files.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-body">Mövcud fayllar</label>
                  <div className="space-y-1.5">
                    {editing.files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg bg-surface-alt px-3 py-2 border border-edge">
                        {isVideoFile(f.type, f.name) ? (
                          <Video className="h-4 w-4 text-blue-400 shrink-0" />
                        ) : isImageFile(f.type, f.name) ? (
                          <Image className="h-4 w-4 text-green-400 shrink-0" />
                        ) : (
                          <FileX className="h-4 w-4 text-muted shrink-0" />
                        )}
                        <span className="text-sm text-body truncate flex-1">{f.name}</span>
                        <span className="text-xs text-muted shrink-0">
                          {f.size < 1024 * 1024
                            ? `${(f.size / 1024).toFixed(0)} KB`
                            : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Input
                label={editing && editing.files?.length > 0 ? 'Faylı əvəz et' : 'Fayllar (Birdən çox seçə bilərsiniz)'}
                type="file"
                multiple
                disabled={Boolean(busyReason(editing) || retentionLockReason(editing))}
                onChange={(event) => {
                  if (event.target.files) {
                    setSelectedFiles(Array.from(event.target.files));
                  }
                }}
              />
              {busyReason(editing) && (
                <p className="-mt-2 text-xs text-amber-500">
                  Bu fayl hazırda yüklənir və ya emal olunur. Bitəndən sonra faylı əvəz edə bilərsiniz.
                </p>
              )}
              {retentionLockReason(editing) && (
                <p className="-mt-2 text-xs text-amber-500">
                  {retentionLockReason(editing)} Lazımdırsa yeni fayl yaradın.
                </p>
              )}
              {editing && editing.files?.length > 0 && !retentionLockReason(editing) && (
                <p className="-mt-2 text-xs text-muted">
                  Yeni fayl seçsəniz, yuxarıdakı mövcud fayllar yeni fayl hazır olan kimi silinəcək (əlavə olunmur).
                </p>
              )}
              <Input
                label="Tarix"
                type="date"
                error={errors.date?.message}
                {...register('date', { required: 'Tarix mütləqdir' })}
              />
              {/* Thumbnail Upload - only for video categories */}
              {showCoverField && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-body">
                    {editing?.thumbnailUrl ? 'Hazırkı kover' : 'Kover şəkli (isteğe bağlı)'}
                  </label>
                  {/* Show existing thumbnail when editing */}
                  {editing?.thumbnailUrl && !selectedThumbnail && (
                    <div className="mt-1">
                      <img
                        src={sanitizeUrl(editing.thumbnailUrl)}
                        alt="Hazırkı kover"
                        className="h-28 w-auto rounded-lg border border-edge object-cover shadow-sm"
                      />
                    </div>
                  )}
                  {/* Show new thumbnail preview */}
                  {thumbnailPreview && (
                    <div className="relative mt-2 inline-block">
                      <img
                        src={thumbnailPreview}
                        alt="Yeni kover önizləməsi"
                        className="h-28 w-auto rounded-lg border border-accent object-cover shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedThumbnail(null)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
                        aria-label="Koveri sil"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(busyReason(editing) || retentionLockReason(editing))}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setSelectedThumbnail(file);
                    }}
                  />
                  <p className="text-xs text-muted">
                    {editing?.thumbnailUrl
                      ? 'Yeni kover seçsəniz, mövcud kover əvəz olunacaq.'
                      : 'Əgər yüklənməsə, videonun içindən avtomatik çəkiləcək.'}
                  </p>
                </div>
              )}
              {modalError && (
                <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {modalError}
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-edge pt-4">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                  Ləğv Et
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  Yadda Saxla
                </Button>
              </div>
            </form>
          </Modal>

          <CategoryManagerModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            categories={categories}
            onChanged={async () => {
              await fetchCategories();
              await fetchDeliverables(true);
            }}
          />

          {/* ── Delete Confirm ── */}
          <ConfirmDialog
            isOpen={Boolean(deleting)}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              if (!deleting) return;
              await api.delete(`/deliverables/${deleting.id}`);
              setDeleting(null);
              await fetchDeliverables();
            }}
            title="Faylı sil"
            message={
              deleting && isUploadProblem(deleting.uploadState)
                ? 'Bu fayl və ona bağlı məlumatlar həmişəlik silinəcək. Yarımçıq qalmış yükləmə və serverdə qalan hissələr də silinəcək.'
                : 'Bu fayl və ona bağlı məlumatlar həmişəlik silinəcək.'
            }
          />

          {/* ── Admin Custom File Preview Overlay ── */}
          {previewItem && (
            <PreviewOverlay item={previewItem} onClose={() => setPreviewItem(null)} />
          )}

          {/* ── Feedback View Modal ── */}
          <Modal
            isOpen={Boolean(feedbackView)}
            onClose={() => setFeedbackView(null)}
            title="Müştəri Rəyi"
            size="sm"
          >
            <div className="flex flex-col gap-4">
              <div
                className="rounded-lg bg-surface-alt p-4 text-sm text-body leading-relaxed whitespace-pre-wrap border border-edge-light max-h-[40vh] overflow-y-auto"
              >
                {feedbackView?.clientFeedback || <span className="italic text-faint">Müştəri rəyini silib</span>}
              </div>
              <Textarea
                label="Cavabınız"
                placeholder="Müştəriyə cavabınızı yazın..."
                maxLength={5000}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              {replyError && <p className="text-sm text-red-500">{replyError}</p>}
              <div className="flex justify-end gap-2 border-t border-edge pt-3">
                <Button variant="secondary" onClick={() => setFeedbackView(null)}>
                  Bağla
                </Button>
                <Button onClick={sendReply} isLoading={replySaving}>
                  Cavabı göndər
                </Button>
              </div>
            </div>
          </Modal>

          {/* ── Share Link Modal ── */}
          <ShareLinkModal
            client={sharingClient}
            apiBase={shareLinkBase}
            onClose={() => setSharingClient(null)}
            onChanged={handleShareLinkChanged}
          />

        </>
      )}
    </div>
  );
};

export default DeliverablesPage;
