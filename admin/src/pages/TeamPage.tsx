import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';

import Toggle from '../components/ui/Toggle';
import { api } from '../lib/api';
import { assetUrl, requestErrorMessage, uploadImage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';

interface TeamMember extends Record<string, unknown> {
  id: string;
  avatarUrl?: string | null;
  name: string;
  role: string;
  isActive: boolean;
  sortOrder: number;
}

interface TeamFormValues {
  avatarUrl: string;
  name: string;
  role: string;
  sortOrder: number;
  isActive: boolean;
}

const defaultValues: TeamFormValues = {
  avatarUrl: '',
  name: '',
  role: '',
  sortOrder: 0,
  isActive: true,
};

export const TeamPage = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TeamFormValues>({
    defaultValues,
  });
  const watchedActive = watch('isActive');

  const fetchMembers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<ApiEnvelope<Paginated<TeamMember>>>('/team?includeInactive=true&limit=100');
      setMembers(response.data.data.items);
    } catch (err) {
      setError(requestErrorMessage(err, 'Komanda üzvləri yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.sortOrder - b.sortOrder), [members]);

  const openModal = (member?: TeamMember) => {
    setEditing(member || null);
    setSelectedFile(null);
    setPreviewUrl(assetUrl(member?.avatarUrl));
    reset(member ? {
      avatarUrl: member.avatarUrl || '',
      name: member.name,
      role: member.role,
      sortOrder: member.sortOrder,
      isActive: member.isActive,
    } : defaultValues);
    setIsModalOpen(true);
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const saveMember = async (values: TeamFormValues) => {
    setIsSaving(true);
    try {
      let avatarUrl = values.avatarUrl || null;
      if (selectedFile) {
        const upload = await uploadImage(selectedFile, 'avatars');
        avatarUrl = upload.fileUrl;
      }

      const payload = {
        avatarUrl,
        name: values.name,
        role: values.role,
        sortOrder: Number(values.sortOrder) || 0,
        isActive: values.isActive,
      };

      if (editing) await api.patch(`/team/${editing.id}`, payload);
      else await api.post('/team', payload);
      setIsModalOpen(false);
      await fetchMembers();
    } catch (err) {
      setError(requestErrorMessage(err, 'Məlumat yadda saxlanıla bilmədi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateActive = async (member: TeamMember, isActive: boolean) => {
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, isActive } : item));
    try {
      await api.patch(`/team/${member.id}`, { isActive });
      await fetchMembers();
    } catch (err) {
      setError(requestErrorMessage(err, 'Status yenilənə bilmədi.'));
      await fetchMembers();
    }
  };

  const columns: TableColumn<TeamMember>[] = [
    {
      key: 'avatarUrl',
      header: 'Avatar',
      render: (member) =>
        member.avatarUrl ? (
          <img src={assetUrl(member.avatarUrl)} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-5 w-5" />
          </div>
        ),
    },
    { key: 'name', header: 'Ad Soyad' },
    { key: 'role', header: 'Vəzifə' },
    {
      key: 'isActive',
      header: 'Aktiv',
      render: (member) => <Toggle checked={member.isActive} onChange={(checked) => updateActive(member, checked)} />,
    },
    { key: 'sortOrder', header: 'Sıra' },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (member) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal(member)} aria-label="Üzvü redaktə et">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(member)} aria-label="Üzvü sil">
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
          <h1 className="text-2xl font-semibold text-slate-950">Komandamız</h1>
          <p className="mt-1 text-sm text-slate-500">Komanda üzvlərini idarə edin.</p>
        </div>
        <Button onClick={() => openModal()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Üzv Əlavə Et
        </Button>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Table columns={columns} data={sortedMembers} isLoading={isLoading} emptyMessage="Komanda üzvü tapılmadı." />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Üzvü Redaktə Et' : 'Yeni Üzv Əlavə Et'}>
        <form onSubmit={handleSubmit(saveMember)} className="space-y-4">
          <div className="space-y-2">
            <Input label="Avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFileChange(event.target.files?.[0])} />
            {previewUrl && <img src={previewUrl} alt="" className="h-20 w-20 rounded-full object-cover" />}
          </div>
          <Input label="Ad Soyad" error={errors.name?.message} {...register('name', { required: 'Ad mütləqdir' })} />
          <Input label="Vəzifə" error={errors.role?.message} {...register('role', { required: 'Vəzifə mütləqdir' })} />
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
          await api.delete(`/team/${deleting.id}`);
          setDeleting(null);
          await fetchMembers();
        }}
        title="Üzvü sil"
        message="Bu üzv həmişəlik silinəcək."
      />
    </div>
  );
};

export default TeamPage;
