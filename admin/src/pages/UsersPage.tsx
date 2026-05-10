import { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';

interface ClientUser extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT';
  createdAt: string;
}

interface UserFormValues {
  name: string;
  email: string;
  password: string;
}

const defaultValues: UserFormValues = {
  name: '',
  email: '',
  password: '',
};

export const UsersPage = () => {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ClientUser | null>(null);
  const [deleting, setDeleting] = useState<ClientUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormValues>({
    defaultValues,
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<ApiEnvelope<Paginated<ClientUser>>>('/users?role=CLIENT&limit=100');
      setUsers(response.data.data.items);
    } catch (err) {
      setError(requestErrorMessage(err, 'Müştərilər yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = (user?: ClientUser) => {
    setEditing(user || null);
    reset(user ? {
      name: user.name,
      email: user.email,
      password: '',
    } : defaultValues);
    setIsModalOpen(true);
  };

  const saveUser = async (values: UserFormValues) => {
    setIsSaving(true);
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, {
          name: values.name,
          email: values.email,
          ...(values.password ? { password: values.password } : {}),
        });
      } else {
        await api.post('/auth/register', {
          role: 'CLIENT',
          name: values.name,
          email: values.email,
          password: values.password,
        });
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setError(requestErrorMessage(err, 'İstifadəçi yadda saxlanıla bilmədi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const columns: TableColumn<ClientUser>[] = [
    { key: 'name', header: 'Ad' },
    { key: 'email', header: 'E-poçt' },
    {
      key: 'createdAt',
      header: 'Yaradılma tarixi',
      render: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (user) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal(user)} aria-label="Edit client">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(user)} className="text-red-600 hover:bg-red-50 hover:text-red-700" aria-label="Delete client">
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
          <h1 className="text-2xl font-semibold text-slate-950">Müştərilər</h1>
          <p className="mt-1 text-sm text-slate-500">Müştəri portalı istifadəçilərini idarə edin.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4" />
          İstifadəçi Əlavə Et
        </Button>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Table columns={columns} data={users} isLoading={isLoading} emptyMessage="Müştəri tapılmadı." />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Müştərini Redaktə Et' : 'Yeni Müştəri Əlavə Et'}>
        <form onSubmit={handleSubmit(saveUser)} className="space-y-4">
          <Input label="Ad Soyad" error={errors.name?.message} {...register('name', { required: 'Ad mütləqdir' })} />
          <Input
            label="E-poçt"
            type="text"
            inputMode="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'E-poçt mütləqdir',
              pattern: { value: /^\S+@\S+$/i, message: 'Düzgün e-poçt ünvanı daxil edin' },
            })}
          />
          <Input
            label="Şifrə"
            type="password"
            error={errors.password?.message}
            {...register('password', {
              validate: (value) => Boolean(editing) || value.length >= 8 || 'Şifrə ən azı 8 simvol olmalıdır',
            })}
          />
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
          try {
            await api.delete(`/users/${deleting.id}`);
            setDeleting(null);
            await fetchUsers();
          } catch (err) {
            setError(requestErrorMessage(err, 'İstifadəçi silinə bilmədi.'));
          }
        }}
        title="Müştərini sil"
        message={`${deleting?.name} adlı müştərini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
      />
    </div>
  );
};

export default UsersPage;
