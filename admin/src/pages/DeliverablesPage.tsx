import { useEffect, useMemo, useState } from 'react';
import { uploadDeliverableFile as uploadFilesWithProgress } from '../api/deliverables.api';
import { Download, Edit2, FileX, MessageCircle, Play, Plus, Search, Trash2, X } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
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

type DeliverableStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED';

interface ClientUser extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  igHighlights?: { title: string; imageUrl: string }[];
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
  clientFeedback?: string | null;
  processingDuration?: number | null;
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
              href={sanitizeUrl(activeFile?.downloadUrl || '#')}
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
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === activeIndex ? 'border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]' : 'border-transparent opacity-50 hover:opacity-100'
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
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading'>('idle');
  const [feedbackView, setFeedbackView] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<Deliverable | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'highlights'>('files');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<DeliverableFormValues>({
    defaultValues,
  });

  const clientOptions = useMemo(
    () => clients.map((client) => ({ 
      value: client.id, 
      label: client.name,
      subLabel: client.email 
    })),
    [clients],
  );

  const fetchClients = async () => {
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
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchQuery) params.set('search', searchQuery);
      const response = await api.get<ApiEnvelope<Paginated<Deliverable>>>(`/deliverables?${params.toString()}`);
      setDeliverables(response.data.data.items || []);
    } catch (err) {
      setError(requestErrorMessage(err, 'Fayllar yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients().catch((err) => setError(requestErrorMessage(err, 'Müştərilər yüklənə bilmədi.')));
    fetchCategories().catch((err) => setError(requestErrorMessage(err, 'Kateqoriyalar yüklənə bilmədi.')));
  }, []);

  useEffect(() => {
    fetchDeliverables();
  }, [searchQuery]);

  const openModal = (deliverable?: Deliverable) => {
    setEditing(deliverable || null);
    setSelectedFiles([]);
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
    setIsSaving(true);
    setUploadProgress(0);
    setUploadPhase('idle');
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

      if (selectedFiles.length > 0) {
        setUploadPhase('uploading');
        await uploadFilesWithProgress(deliverableId, selectedFiles, (percent) => {
          setUploadProgress(percent);
        });
      }

      setUploadPhase('idle');
      setIsModalOpen(false);
      await fetchDeliverables();
    } catch (err) {
      setError(requestErrorMessage(err, 'Fayl yadda saxlanıla bilmədi.'));
    } finally {
      setIsSaving(false);
      setUploadPhase('idle');
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

  const columns: TableColumn<Deliverable>[] = [
    {
      key: 'client',
      header: 'Müştəri',
      render: (deliverable) => deliverable.client?.name || 'Naməlum müştəri',
    },
    {
      key: 'title',
      header: 'Başlıq / Fayl',
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
      header: 'Növ',
      render: (deliverable) => (
        <Badge variant="info">
          {deliverable.category?.name || deliverable.type || 'Növ yoxdur'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (deliverable) => (
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-1.5">
            <Badge variant={statusVariant(deliverable.status)}>
              {statusLabels[deliverable.status] || deliverable.status}
            </Badge>
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
          {deliverable.processingDuration && deliverable.status === 'READY' && (
            <span className="text-[10px] text-faint italic ml-1">
              Emal: {Math.floor(deliverable.processingDuration / 60)}d {deliverable.processingDuration % 60}s
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'month',
      header: 'Ay/İl',
      render: (deliverable) => `${deliverable.month}/${deliverable.year}`,
    },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (deliverable) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal(deliverable)} aria-label="Faylı redaktə et">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(deliverable)} aria-label="Faylı sil">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Tabs ── */}
      <div className="flex border-b border-edge">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'files'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-heading hover:border-edge'
          }`}
        >
          Layihə Faylları
        </button>
        <button
          onClick={() => setActiveTab('highlights')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'highlights'
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
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-faint" />
        </div>
        <Input
          placeholder="Müştəri adı və ya e-poçt ilə axtarın..."
          className="pl-10"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Table columns={columns} data={deliverables} isLoading={isLoading} emptyMessage="Fayl tapılmadı." />

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
          <Input
            label="Fayllar (Birdən çox seçə bilərsiniz)"
            type="file"
            multiple
            onChange={(event) => {
              if (event.target.files) {
                setSelectedFiles(Array.from(event.target.files));
              }
            }}
          />
          <Input
            label="Tarix"
            type="date"
            error={errors.date?.message}
            {...register('date', { required: 'Tarix mütləqdir' })}
          />
          {/* Upload Progress Bar */}
          {uploadPhase !== 'idle' && (
            <div className="space-y-2 rounded-lg bg-surface-alt p-3 border border-edge">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-body">
                  {uploadPhase === 'uploading' ? 'Yüklənir...' : 'Emal olunur...'}
                </span>
                {uploadPhase === 'uploading' && (
                  <span className="tabular-nums text-muted">{uploadProgress}%</span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 bg-gray-900`}
                  style={uploadPhase === 'uploading' ? { width: `${uploadProgress}%` } : undefined}
                />
              </div>
              
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
      </>
      )}
    </div>
  );
};

export default DeliverablesPage;
