import { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import Badge from '../components/ui/Badge';
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

interface PackagePlan extends Record<string, unknown> {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  features: string[];
  youtubeUrl?: string | null;
  buttonText: string;
  buttonUrl: string;
  isPopular: boolean;
  isActive: boolean;
}

interface PackageFormValues {
  name: string;
  description: string;
  priceLabel: string;
  features: { value: string }[];
  youtubeUrl: string;
  isPopular: boolean;
  isActive: boolean;
}

const defaultValues: PackageFormValues = {
  name: '',
  description: '',
  priceLabel: '',
  features: [{ value: '' }],
  youtubeUrl: '',
  isPopular: false,
  isActive: true,
};


export const PackagesPage = () => {
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PackagePlan | null>(null);
  const [deleting, setDeleting] = useState<PackagePlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PackageFormValues>({
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'features' });

  const watchedPopular = watch('isPopular');
  const watchedActive = watch('isActive');

  const fetchPackages = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<ApiEnvelope<Paginated<PackagePlan>>>('/packages?includeInactive=true&limit=100');
      setPackages(response.data.data.items);
    } catch (err) {
      setError(requestErrorMessage(err, 'Paketlər yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openModal = (pkg?: PackagePlan) => {
    setEditing(pkg || null);
    reset(pkg ? {
      name: pkg.name,
      description: pkg.description,
      priceLabel: pkg.priceLabel,
      features: pkg.features.map((f) => ({ value: f })),
      youtubeUrl: pkg.youtubeUrl || '',
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
    } : defaultValues);
    setIsModalOpen(true);
  };

  const savePackage = async (values: PackageFormValues) => {
    setIsSaving(true);
    try {
      const payload = {
        name: values.name,
        description: values.description,
        priceLabel: values.priceLabel,
        features: values.features.map((f) => f.value.trim()).filter(Boolean),
        youtubeUrl: values.youtubeUrl || null,
        buttonText: 'Planı Seç',
        buttonUrl: '/elaqe',
        isPopular: values.isPopular,
        isActive: values.isActive,
      };

      if (editing) await api.patch(`/packages/${editing.id}`, payload);
      else await api.post('/packages', payload);
      setIsModalOpen(false);
      await fetchPackages();
    } catch (err) {
      setError(requestErrorMessage(err, 'Paket yadda saxlanıla bilmədi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateActive = async (pkg: PackagePlan, isActive: boolean) => {
    setPackages((current) => current.map((item) => item.id === pkg.id ? { ...item, isActive } : item));
    try {
      await api.patch(`/packages/${pkg.id}`, { isActive });
      await fetchPackages();
    } catch (err) {
      setError(requestErrorMessage(err, 'Status yenilənə bilmədi.'));
      await fetchPackages();
    }
  };

  const columns: TableColumn<PackagePlan>[] = [
    { key: 'name', header: 'Ad' },
    { key: 'priceLabel', header: 'Qiymət' },
    {
      key: 'isPopular',
      header: 'Populyar',
      render: (pkg) => pkg.isPopular ? <Badge variant="warning">Ən Populyar</Badge> : <Badge>Standart</Badge>,
    },
    {
      key: 'isActive',
      header: 'Aktiv',
      render: (pkg) => <Toggle checked={pkg.isActive} onChange={(checked) => updateActive(pkg, checked)} />,
    },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (pkg) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal(pkg)} aria-label="Edit package">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(pkg)} aria-label="Delete package">
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
          <h1 className="text-2xl font-semibold text-slate-950">Paketlər</h1>
          <p className="mt-1 text-sm text-slate-500">Qiymət paketlərini idarə edin.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4" />
          Paket Əlavə Et
        </Button>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Table columns={columns} data={packages} isLoading={isLoading} emptyMessage="Paket tapılmadı." />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Paketi Redaktə Et' : 'Yeni Paket Əlavə Et'} size="lg">
        <form onSubmit={handleSubmit(savePackage)} className="space-y-4">
          <Input label="Ad" error={errors.name?.message} {...register('name', { required: 'Ad mütləqdir' })} />
          <Textarea label="Təsvir" rows={3} {...register('description')} />
          <Input label="Qiymət (məs: 200 AZN-dən)" error={errors.priceLabel?.message} {...register('priceLabel', { required: 'Qiymət mütləqdir' })} />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Üstünlüklər</label>
              <Button size="sm" variant="secondary" onClick={() => append({ value: '' })}>
                <Plus className="h-4 w-4" />
                Əlavə Et
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input className="flex-1" {...register(`features.${index}.value` as any)} placeholder="Üstünlük mətni..." />
                <Button variant="ghost" size="sm" onClick={() => remove(index)} aria-label="Remove feature">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Input label="YouTube Video Linki" {...register('youtubeUrl')} />
          <div className="space-y-2">
            <Toggle checked={watchedPopular} onChange={(checked) => setValue('isPopular', checked)} label="Ən Populyar kimi işarələ" />
            {watchedPopular && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Yalnız bir paket "Ən Populyar" ola bilər.
              </p>
            )}
          </div>
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
          await api.delete(`/packages/${deleting.id}`);
          setDeleting(null);
          await fetchPackages();
        }}
        title="Paketi sil"
        message="Bu paket həmişəlik silinəcək."
      />
    </div>
  );
};

export default PackagesPage;
