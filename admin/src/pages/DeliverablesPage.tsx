import { useEffect, useMemo, useState } from 'react';
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

type DeliverableType = 'VIDEO' | 'SMM_DESIGN' | 'BRANDING' | 'REPORT' | 'OTHER';
type DeliverableStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ARCHIVED';

interface ClientUser extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
}

interface Deliverable extends Record<string, unknown> {
  id: string;
  clientId: string;
  client?: ClientUser;
  type: DeliverableType;
  status: DeliverableStatus;
  month: number;
  year: number;
  fileUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  clientFeedback?: string | null;
}

interface DeliverableFormValues {
  clientId: string;
  type: DeliverableType;
  date: string; // YYYY-MM-DD
}

const defaultValues: DeliverableFormValues = {
  clientId: '',
  type: 'VIDEO',
  date: new Date().toISOString().split('T')[0],
};

const typeOptions = [
  { value: 'VIDEO', label: 'Video Material' },
  { value: 'SMM_DESIGN', label: 'SMM Dizayn' },
  { value: 'BRANDING', label: 'Brendinq / Loqo' },
  { value: 'REPORT', label: 'Hesabat / Sənəd' },
  { value: 'OTHER', label: 'Digər' },
];

const typeLabels: Record<string, string> = {
  VIDEO: 'Video Material',
  SMM_DESIGN: 'SMM Dizayn',
  BRANDING: 'Brendinq / Loqo',
  REPORT: 'Hesabat / Sənəd',
  OTHER: 'Digər',
};

const statusLabels: Record<DeliverableStatus, string> = {
  PENDING: 'Gözləmədə',
  PROCESSING: 'Hazırlanır',
  READY: 'Hazırdır',
  ARCHIVED: 'Arxivlənib',
};

const statusVariant = (status: DeliverableStatus) => {
  if (status === 'PENDING') return 'warning';
  if (status === 'PROCESSING') return 'info';
  if (status === 'READY') return 'success';
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

const resolveFileUrl = (fileUrl: string | null | undefined): string => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http')) return fileUrl;
  if (fileUrl.startsWith('/uploads/')) return `${BACKEND}${fileUrl}`;
  const idx = fileUrl.replace(/\\/g, '/').indexOf('/uploads/');
  if (idx !== -1) return `${BACKEND}${fileUrl.replace(/\\/g, '/').substring(idx)}`;
  return `${BACKEND}/uploads/${fileUrl}`;
};

// ─── Admin Custom Media Preview Overlay ─────────
const PreviewOverlay = ({
  item,
  onClose,
}: {
  item: Deliverable;
  onClose: () => void;
}) => {
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

  const url = resolveFileUrl(item.fileUrl);
  if (!url) return null;

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

  const renderMedia = () => {
    if (isVideoFile(item.mimeType, item.fileName)) {
      return (
        <video controls autoPlay={false} className="max-h-[85vh] max-w-full shadow-2xl outline-none" src={url}>
          Brauzeriniz video formatını dəstəkləmir.
        </video>
      );
    }
    if (isImageFile(item.mimeType, item.fileName)) {
      return (
        <img
          src={url}
          alt="Önizləmə"
          className="object-contain max-h-[85vh] max-w-full shadow-2xl"
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full text-center">
        <FileX className="h-16 w-16 text-slate-500 mb-4" />
        <p className="text-sm text-slate-300">
          Bu fayl növü üçün önizləmə yoxdur. Zəhmət olmasa yükləyin.
        </p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      {/* Header Controls - High Z-index */}
      <div
        className="flex items-center justify-between p-4 md:px-8 absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/50 to-transparent"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-white drop-shadow-md">
            {item.fileName || typeLabels[item.type] || item.type}
          </p>
          <Badge variant="info">{statusLabels[item.status] || item.status}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {url && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-md"
            >
              <Download className="h-4 w-4" />
              Yüklə
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
            aria-label="Bağla"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Centered Media Container */}
      <div
        className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {renderMedia()}
      </div>
    </div>
  );
};

export const DeliverablesPage = () => {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [deleting, setDeleting] = useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackView, setFeedbackView] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<Deliverable | null>(null);

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

  const fetchDeliverables = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchQuery) params.set('search', searchQuery);
      const response = await api.get<ApiEnvelope<Paginated<Deliverable>>>(`/deliverables?${params.toString()}`);
      setDeliverables(response.data.data.items);
    } catch (err) {
      setError(requestErrorMessage(err, 'Fayllar yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients().catch((err) => setError(requestErrorMessage(err, 'Müştərilər yüklənə bilmədi.')));
  }, []);

  useEffect(() => {
    fetchDeliverables();
  }, [searchQuery]);

  const openModal = (deliverable?: Deliverable) => {
    setEditing(deliverable || null);
    setSelectedFile(null);
    reset(
      deliverable
        ? {
            clientId: deliverable.clientId,
            type: deliverable.type,
            date: `${deliverable.year}-${String(deliverable.month).padStart(2, '0')}-01`,
          }
        : defaultValues,
    );
    setIsModalOpen(true);
  };

  const uploadDeliverableFile = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await api.patch(`/deliverables/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const saveDeliverable = async (values: DeliverableFormValues) => {
    setIsSaving(true);
    try {
      const date = new Date(values.date);
      const payload = {
        clientId: values.clientId,
        type: values.type,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      };

      const response = editing
        ? await api.patch<ApiEnvelope<Deliverable>>(`/deliverables/${editing.id}`, payload)
        : await api.post<ApiEnvelope<Deliverable>>('/deliverables', payload);

      const deliverableId = editing?.id || response.data.data.id;

      if (selectedFile) {
        await uploadDeliverableFile(deliverableId, selectedFile);
      }

      setIsModalOpen(false);
      await fetchDeliverables();
    } catch (err) {
      setError(requestErrorMessage(err, 'Fayl yadda saxlanıla bilmədi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const columns: TableColumn<Deliverable>[] = [
    {
      key: 'client',
      header: 'Müştəri',
      render: (deliverable) => deliverable.client?.name || 'Naməlum müştəri',
    },
    {
      key: 'fileName',
      header: 'Fayl adı',
      render: (deliverable) =>
        deliverable.fileUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewItem(deliverable);
            }}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline text-left transition-colors"
            title="Önizləməyə bax"
          >
            {(isVideoFile(deliverable.mimeType, deliverable.fileName) ||
              isImageFile(deliverable.mimeType, deliverable.fileName)) && (
              <Play className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate max-w-[160px]">
              {deliverable.fileName || 'Faylı göstər'}
            </span>
          </button>
        ) : (
          <span className="text-slate-400 text-xs italic">Fayl yoxdur</span>
        ),
    },
    {
      key: 'type',
      header: 'Növ',
      render: (deliverable) => (
        <Badge variant="info">{typeLabels[deliverable.type] ?? deliverable.type}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (deliverable) => (
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Layihə Faylları</h1>
          <p className="mt-1 text-sm text-slate-500">Müştərilərə göndərilən faylları idarə edin.</p>
        </div>
        <Button onClick={() => openModal()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Fayl Əlavə Et
        </Button>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" />
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
          <Select label="Növ" options={typeOptions} {...register('type')} />
          <Input
            label="Fayl"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setSelectedFile(file);
            }}
          />
          <Input
            label="Tarix"
            type="date"
            error={errors.date?.message}
            {...register('date', { required: 'Tarix mütləqdir' })}
          />
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Ləğv Et
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Yadda Saxla
            </Button>
          </div>
        </form>
      </Modal>

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
            className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100 max-h-[60vh] overflow-y-auto"
          >
            {feedbackView}
          </div>
          <div className="flex justify-end border-t border-slate-200 pt-3">
            <Button variant="secondary" onClick={() => setFeedbackView(null)}>
              Bağla
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeliverablesPage;
