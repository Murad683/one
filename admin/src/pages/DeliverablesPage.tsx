import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';

type DeliverableType = 'VIDEO_1' | 'VIDEO_2' | 'DESIGNS' | 'OTHER';
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
  fileName?: string | null;
}

interface DeliverableFormValues {
  clientId: string;
  type: DeliverableType;
  fileName: string;
  date: string; // YYYY-MM-DD
}

const defaultValues: DeliverableFormValues = {
  clientId: '',
  type: 'VIDEO_1',
  fileName: '',
  date: new Date().toISOString().split('T')[0],
};

const typeOptions = [
  { value: 'VIDEO_1', label: 'Video 1' },
  { value: 'VIDEO_2', label: 'Video 2' },
  { value: 'DESIGNS', label: 'Dizaynlar' },
  { value: 'OTHER', label: 'Digər' },
];

const statusVariant = (status: DeliverableStatus) => {
  if (status === 'PENDING') return 'warning';
  if (status === 'PROCESSING') return 'info';
  if (status === 'READY') return 'success';
  return 'default';
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

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<DeliverableFormValues>({
    defaultValues,
  });

  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.id, label: `${client.name} (${client.email})` })),
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
    reset(deliverable ? {
      clientId: deliverable.clientId,
      type: deliverable.type,
      fileName: deliverable.fileName || '',
      date: `${deliverable.year}-${String(deliverable.month).padStart(2, '0')}-01`,
    } : defaultValues);
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
        fileName: values.fileName || null,
      };

      const response = editing
        ? await api.patch<ApiEnvelope<Deliverable>>(`/deliverables/${editing.id}`, payload)
        : await api.post<ApiEnvelope<Deliverable>>('/deliverables', payload);

      const deliverableId = editing?.id || response.data.data.id;

      if (selectedFile) {
        await uploadDeliverableFile(deliverableId, selectedFile);
        await api.patch(`/deliverables/${deliverableId}`, {
          fileName: values.fileName || selectedFile.name,
        });
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
      render: (deliverable) => deliverable.fileName || 'Fayl yoxdur',
    },
    {
      key: 'type',
      header: 'Növ',
      render: (deliverable) => <Badge variant="info">{deliverable.type}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (deliverable) => <Badge variant={statusVariant(deliverable.status)}>{deliverable.status}</Badge>,
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
          <Button variant="ghost" size="sm" onClick={() => openModal(deliverable)} aria-label="Edit deliverable">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(deliverable)} aria-label="Delete deliverable">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Layihə Faylları</h1>
          <p className="mt-1 text-sm text-slate-500">Müştərilərə göndərilən faylları idarə edin.</p>
        </div>
        <Button onClick={() => openModal()}>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Faylı Redaktə Et' : 'Yeni Fayl Əlavə Et'} size="lg">
        <form onSubmit={handleSubmit(saveDeliverable)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Müştəri</label>
            <input
              list="client-list"
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Müştəri seçin..."
              {...register('clientId', { required: 'Müştəri mütləqdir' })}
            />
            <datalist id="client-list">
              {clientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </datalist>
            {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
          </div>
          <Select label="Növ" options={typeOptions} {...register('type')} />
          <Input
            label="Fayl"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                setValue('fileName', file.name);
              }
            }}
          />
          <Input label="Fayl adı" {...register('fileName')} placeholder="Məs: Reels Video 1" />
          <Input label="Tarix" type="date" error={errors.date?.message} {...register('date', { required: 'Tarix mütləqdir' })} />
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setIsProjectModalOpen(false)} disabled={isSaving}>Ləğv Et</Button>
            <Button type="submit" isLoading={isSaving}>Yadda Saxla</Button>
          </div>
        </form>
      </Modal>

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
    </div>
  );
};

export default DeliverablesPage;
