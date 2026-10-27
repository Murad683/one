import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MAX_PARALLEL_UPLOADS, useDeliverableUpload } from '../context/deliverableUpload';
import { Download, Edit2, FileX, Image, Link2, MessageCircle, Play, Plus, Search, Trash2, Video, X, Copy } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Combobox from '../components/ui/Combobox';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';
import { HighlightsManager } from '../components/deliverables/HighlightsManager';
import { ColumnFilter, SortHeader } from '../components/deliverables/ColumnHeader';
import {
  AddedFilterPanel,
  CategoryFilterPanel,
  ClientFilterPanel,
  StatusFilterPanel,
} from '../components/deliverables/DeliverableColumnFilters';
import ActiveFilterChips from '../components/deliverables/ActiveFilterChips';
import MobileFilterSheet from '../components/deliverables/MobileFilterSheet';
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
  igHighlights?: { title: string; imageUrl: string }[];
  shareUrl?: string | null;
  shareTokenExpiresAt?: string | null;
  /** The client has a real mailbox, so the retention warnings reach them. */
  canReceiveNotices?: boolean;
}

interface DeliverableCategory extends Record<string, unknown> {
  id: string;
  name: string;
  isVideo: boolean;
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
  files: { url: string; name: string; size: number; type: string; downloadUrl?: string | null; previewUrl?: string | null }[];
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
  clientFeedback?: string | null;
  processingDuration?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // Video retention (null while the rule does not apply or is switched off).
  expiresAt?: string | null;
  hiddenAt?: string | null;
  mediaDeletedAt?: string | null;
}

interface DeliverableFormValues {
  title: string;
  clientId: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
}

const defaultValues: DeliverableFormValues = {
  title: '',
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
          {url && (
            <a
              href={sanitizeUrl(item.originalUrl || activeFile?.downloadUrl || '#')}
              download={activeFile?.name || 'file'}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-surface/10 hover:bg-surface/20 rounded-lg transition-colors backdrop-blur-md"
            >
              <Download className="h-4 w-4" />
              Yüklə
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
  // Only the newest request may update the table (filters change faster than the API answers).
  const requestId = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isNewCategoryVideo, setIsNewCategoryVideo] = useState(false);
  const [renamingId, setRenamingId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [deleteCategory, setDeleteCategory] = useState<DeliverableCategory | null>(null);
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
  const [feedbackView, setFeedbackView] = useState<string | null>(null);
  const [sharingClient, setSharingClient] = useState<ClientUser | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [revokingShareLink, setRevokingShareLink] = useState(false);
  const [previewItem, setPreviewItem] = useState<Deliverable | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'highlights'>('files');
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
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

  const fetchDeliverables = async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError('');
    try {
      const params = buildListParams({ page, pageSize, sort, search: debouncedSearch, filters });
      const response = await api.get<ApiEnvelope<Paginated<Deliverable>>>(`/deliverables?${params.toString()}`);
      if (currentRequest !== requestId.current) return;
      const data = response.data.data;
      setDeliverables(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
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
    if ((selectedFiles.length > 0 || selectedThumbnail) && !upload.canStart) {
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
      const thumbToUpload = selectedThumbnail;

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

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await api.post('/deliverable-categories', {
      name: newCategory.trim(),
      isVideo: isNewCategoryVideo
    });
    setNewCategory('');
    setIsNewCategoryVideo(false);
    await fetchCategories();
  };

  const saveRename = async (category: DeliverableCategory) => {
    if (!renameValue.trim()) return;
    await api.patch(`/deliverable-categories/${category.id}`, { name: renameValue.trim() });
    setRenamingId('');
    setRenameValue('');
    await fetchCategories();
  };

  const openShareModal = (client: ClientUser) => {
    setSharingClient(client);
    setShareUrl(client.shareUrl ?? null);
    setShareExpiresAt(client.shareTokenExpiresAt ?? null);
  };

  const generateShareLink = async () => {
    if (!sharingClient) return;
    setIsGeneratingLink(true);
    try {
      const response = await api.post<ApiEnvelope<{ token: string; url: string; expiresAt: string }>>(
        `${shareLinkBase}/${sharingClient.id}/share-link`,
      );
      setShareUrl(response.data.data.url);
      setShareExpiresAt(response.data.data.expiresAt);
    } catch (err) {
      setError(requestErrorMessage(err, 'Link yaradıla bilmədi.'));
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const confirmRevokeShareLink = async () => {
    if (!sharingClient) return;
    await api.delete(`${shareLinkBase}/${sharingClient.id}/share-link`);
    setRevokingShareLink(false);
    setShareUrl(null);
    setShareExpiresAt(null);
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
          <span className="text-faint text-xs italic">{deliverable.title || 'Başlıksız'} (Fayl yoxdur)</span>
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
        <ColumnFilter label="Status" active={Boolean(filters.status || filters.stale || filters.hasFeedback || filters.retention)} width={300}>
          {(close) => <StatusFilterPanel statusLabels={statusLabels} filters={filters} onChange={updateFilters} close={close} />}
        </ColumnFilter>,
      ),
      ariaSort: ariaSortFor('status'),
      hideOnMobile: true,
      render: (deliverable) => {
        const isStale = isStalePending(deliverable);
        const retention = retentionNote(deliverable);

        return (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5">
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
              {isStale && (
                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-sm" title="2 saatdan çoxdur gözləmədədir">
                  Gözləmədə qalıb
                </span>
              )}
              {deliverable.clientFeedback && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeedbackView(deliverable.clientFeedback!);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 hover:bg-sky-100 transition"
                  title="Rəyi göstər"
                >
                  <MessageCircle className="h-3 w-3" />
                  Rəy
                </button>
              )}
            </div>
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
              title="Müştərinin paylaşım linki"
            >
              <Link2 className="h-4 w-4" />
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
          {!isCreator && (
          <section className="space-y-4 pt-2">
            <div>
              <h2 className="text-xl font-semibold text-heading">Fayl Kateqoriyaları (Növlər)</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(categories) && categories.map((category) => (
                <div key={category.id} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm shadow-sm ring-1 ring-edge">
                  {renamingId === category.id ? (
                    <>
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveRename(category);
                          if (event.key === 'Escape') setRenamingId('');
                        }}
                        className="w-32 rounded border border-field-border bg-field px-2 py-1 text-sm text-heading outline-none"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => saveRename(category)}>Yadda Saxla</Button>
                    </>
                  ) : (
                    <>
                      <span>{category.name} {category.isVideo && <span className="text-[10px] text-blue-500 font-bold">(VIDEO)</span>}</span>
                      <button type="button" onClick={() => { setRenamingId(category.id); setRenameValue(category.name); }}>
                        <Edit2 className="h-3.5 w-3.5 text-muted" />
                      </button>
                      <button type="button" onClick={() => setDeleteCategory(category)}>
                        <X className="h-3.5 w-3.5 text-muted" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row max-w-2xl gap-3 w-full bg-surface-alt p-4 rounded-xl border border-edge">
              <Input
                placeholder="Yeni növ adı (məs: Drone Çəkiliş)..."
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  id="isVideo"
                  checked={isNewCategoryVideo}
                  onChange={(e) => setIsNewCategoryVideo(e.target.checked)}
                  className="h-4 w-4 rounded border-field-border text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="isVideo" className="text-sm font-medium text-body">Video kateqoriyasıdır?</label>
              </div>
              <Button onClick={addCategory} className="shrink-0">
                <Plus className="h-4 w-4" />
                Əlavə Et
              </Button>
            </div>
          </section>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
            <div>
              <h1 className="text-2xl font-semibold text-heading">Layihə Faylları</h1>
              <p className="mt-1 text-sm text-muted">Müştərilərə göndərilən faylları idarə edin.</p>
            </div>
            <Button onClick={() => openModal()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Fayl Əlavə Et
            </Button>
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
            rowClassName={(row) => (isStalePending(row) ? 'bg-red-50/50 hover:bg-red-50' : row.mediaDeletedAt ? 'opacity-60' : '')}
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
              {isSelectedCategoryVideo && (
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

          <ConfirmDialog
            isOpen={Boolean(deleteCategory)}
            onClose={() => setDeleteCategory(null)}
            onConfirm={async () => {
              if (!deleteCategory) return;
              await api.delete(`/deliverable-categories/${deleteCategory.id}`);
              setDeleteCategory(null);
              await fetchCategories();
              await fetchDeliverables();
            }}
            title="Kateqoriyanı sil"
            message="Bu kateqoriyaya aid bütün fayllar kateqoriyasız qalacaq."
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
            message="Bu fayl və ona bağlı məlumatlar həmişəlik silinəcək."
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
                className="rounded-lg bg-surface-alt p-4 text-sm text-body leading-relaxed whitespace-pre-wrap border border-edge-light max-h-[60vh] overflow-y-auto"
              >
                {feedbackView}
              </div>
              <div className="flex justify-end border-t border-edge pt-3">
                <Button variant="secondary" onClick={() => setFeedbackView(null)}>
                  Bağla
                </Button>
              </div>
            </div>
          </Modal>

          {/* ── Share Link Modal ── */}
          <Modal
            isOpen={Boolean(sharingClient)}
            onClose={() => setSharingClient(null)}
            title={sharingClient ? `${sharingClient.name} — Paylaşım Linki` : 'Paylaşım Linki'}
            size="sm"
          >
            <div className="space-y-4">
              {shareUrl ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-body">Aktiv link</label>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={shareUrl}
                        className="flex-1 rounded-lg border border-field-border bg-surface-alt px-3 py-2 text-sm text-body outline-none"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(shareUrl)}
                        title="Kopyala"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {shareExpiresAt && (
                      <p className="text-xs text-muted">
                        Bitmə tarixi: {new Date(shareExpiresAt).toLocaleString('az-AZ')}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between gap-2 border-t border-edge pt-4">
                    <Button variant="danger" size="sm" onClick={() => setRevokingShareLink(true)}>
                      Ləğv et
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={isCreator ? () => setConfirmRegenerate(true) : generateShareLink}
                      isLoading={isGeneratingLink}
                    >
                      Yenilə
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    Bu müştərinin bütün layihə fayllarını əhatə edən, login tələb etməyən paylaşım linki yaradılacaq (7 gün etibarlı, istənilən vaxt ləğv edilə bilər).
                  </p>
                  <div className="flex justify-end border-t border-edge pt-4">
                    <Button onClick={generateShareLink} isLoading={isGeneratingLink}>
                      Link yarat
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Modal>

          <ConfirmDialog
            isOpen={confirmRegenerate}
            onClose={() => setConfirmRegenerate(false)}
            onConfirm={async () => {
              setConfirmRegenerate(false);
              await generateShareLink();
            }}
            title="Paylaşım linkini yenilə"
            message="Yeni link yaradılacaq və köhnə link işləməyəcək. Kimsə köhnə linki istifadə edirsə, o artıq açılmayacaq. Davam edək?"
          />

          <ConfirmDialog
            isOpen={revokingShareLink}
            onClose={() => setRevokingShareLink(false)}
            onConfirm={confirmRevokeShareLink}
            title="Paylaşım linkini ləğv et"
            message="Bu link artıq işləməyəcək. Davam etmək istədiyinizə əminsiniz?"
          />

        </>
      )}
    </div>
  );
};

export default DeliverablesPage;
