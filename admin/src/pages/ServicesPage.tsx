import { useEffect, useMemo, useState } from 'react';
import { BarChart, Camera, Edit2, Globe, Heart, Mail, Megaphone, MessageSquare, Palette, Phone, Plus, Search, Settings, Shield, Star, Trash2, User, Video, Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Textarea from '../components/ui/Textarea';
import Toggle from '../components/ui/Toggle';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';

interface Service extends Record<string, unknown> {
  id: string;
  iconName?: string | null;
  title: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

interface ServiceFormValues {
  iconName: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

const defaultValues: ServiceFormValues = {
  iconName: '',
  title: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};

const iconMap: Record<string, any> = {
  Megaphone,
  Video,
  Globe,
  Palette,
  BarChart,
  Camera,
  Mail,
  Search,
  Shield,
  Settings,
  Star,
  Heart,
  User,
  MessageSquare,
  Phone,
};

const iconFor = (iconName?: string | null) => {
  return iconMap[iconName || ''] || Wrench;
};

export const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ServiceFormValues>({
    defaultValues,
  });
  const watchedActive = watch('isActive');
  const watchedIcon = watch('iconName');


  const fetchServices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<ApiEnvelope<Paginated<Service>>>('/services?includeInactive=true&limit=100');
      setServices(response.data.data.items);
    } catch (err) {
      setError(requestErrorMessage(err, 'Xidmətlər yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => a.sortOrder - b.sortOrder),
    [services],
  );

  const openModal = (service?: Service) => {
    setEditing(service || null);
    reset(service ? {
      iconName: service.iconName || '',
      title: service.title,
      description: service.description,
      sortOrder: service.sortOrder,
      isActive: service.isActive,
    } : defaultValues);
    setIsModalOpen(true);
  };

  const saveService = async (values: ServiceFormValues) => {
    setIsSaving(true);
    try {
      const payload = {
        ...values,
        iconName: values.iconName || null,
        sortOrder: Number(values.sortOrder) || 0,
      };
      if (editing) await api.patch(`/services/${editing.id}`, payload);
      else await api.post('/services', payload);
      setIsModalOpen(false);
      await fetchServices();
    } catch (err) {
      setError(requestErrorMessage(err, 'Xidmət yadda saxlanıla bilmədi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateActive = async (service: Service, isActive: boolean) => {
    setServices((current) => current.map((item) => item.id === service.id ? { ...item, isActive } : item));
    try {
      await api.patch(`/services/${service.id}`, { isActive });
      await fetchServices();
    } catch (err) {
      setError(requestErrorMessage(err, 'Status yenilənə bilmədi.'));
      await fetchServices();
    }
  };

  const columns: TableColumn<Service>[] = [
    {
      key: 'iconName',
      header: 'İkon',
      render: (service) => {
        const Icon = iconFor(service.iconName);
        return <Icon className="h-5 w-5 text-slate-600" />;
      },
    },
    { key: 'title', header: 'Başlıq' },
    {
      key: 'description',
      header: 'Təsvir',
      render: (service) => <span className="line-clamp-1">{service.description}</span>,
    },
    {
      key: 'isActive',
      header: 'Aktiv',
      render: (service) => <Toggle checked={service.isActive} onChange={(checked) => updateActive(service, checked)} />,
    },
    { key: 'sortOrder', header: 'Sıra' },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (service) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal(service)} aria-label="Xidməti redaktə et">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(service)} aria-label="Xidməti sil">
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
          <h1 className="text-2xl font-semibold text-slate-950">Xidmətlər</h1>
          <p className="mt-1 text-sm text-slate-500">Xidmət kartlarını və ardıcıllığı idarə edin.</p>
        </div>
        <Button onClick={() => openModal()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Xidmət Əlavə Et
        </Button>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Table columns={columns} data={sortedServices} isLoading={isLoading} emptyMessage="Xidmət tapılmadı." />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Xidməti Redaktə Et' : 'Yeni Xidmət Əlavə Et'}>
        <form onSubmit={handleSubmit(saveService)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">İkon Seçin</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(iconMap).map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setValue('iconName', name)}
                  className={`flex items-center justify-center rounded-lg border p-3 transition-colors ${
                    watchedIcon === name ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                  title={name}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
            <input type="hidden" {...register('iconName')} />
          </div>
          <Input label="Başlıq" error={errors.title?.message} {...register('title', { required: 'Başlıq mütləqdir' })} />
          <Textarea label="Təsvir" error={errors.description?.message} {...register('description', { required: 'Təsvir mütləqdir' })} />
          <Input label="Sıra" type="number" {...register('sortOrder', { valueAsNumber: true })} />
          <Toggle checked={watchedActive} onChange={(checked) => setValue('isActive', checked)} label="Aktiv" />
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Ləğv Et</Button>
            <Button type="submit" isLoading={isSaving}>Yadda Saxla</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await api.delete(`/services/${deleting.id}`);
          setDeleting(null);
          await fetchServices();
        }}
        title="Xidməti sil"
        message="Bu xidmət həmişəlik silinəcək."
      />
    </div>
  );
};

export default ServicesPage;
