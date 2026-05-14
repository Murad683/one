import { useEffect, useState } from 'react';
import { Plus, Trash2, ShieldCheck, Mail, User as UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { User } from '@/types';
import useAuthStore from '@/store/useAuthStore';

interface AdminFormValues {
  name: string;
  email: string;
  password?: string;
}

const defaultValues: AdminFormValues = {
  name: '',
  email: '',
  password: '',
};

export const AdminManagementPage = () => {
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user: currentUser } = useAuthStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminFormValues>({
    defaultValues,
  });

  const fetchAdmins = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<{ data: User[] }>('/admin/team');
      setAdmins(response.data.data);
    } catch (err) {
      setError(requestErrorMessage(err, 'Admin siyahısını yükləmək mümkün olmadı.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const openModal = () => {
    reset(defaultValues);
    setIsModalOpen(true);
  };

  const createAdmin = async (values: AdminFormValues) => {
    setIsSaving(true);
    setError('');
    try {
      await api.post('/admin/team', values);
      setIsModalOpen(false);
      await fetchAdmins();
    } catch (err) {
      setError(requestErrorMessage(err, 'Admin yaradıla bilmədi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const columns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'Ad Soyad',
      render: (admin) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <UserIcon className="h-4 w-4" />
          </div>
          <span className="font-medium text-slate-900">{admin.name}</span>
        </div>
      ),
    },
    { 
      key: 'email', 
      header: 'E-poçt',
      render: (admin) => (
        <div className="flex items-center gap-2 text-slate-500">
          <Mail className="h-3.5 w-3.5" />
          {admin.email}
        </div>
      )
    },
    {
      key: 'role',
      header: 'Rolu',
      render: (admin) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
          admin.role === 'SUPER_ADMIN' 
            ? 'bg-purple-50 text-purple-700' 
            : 'bg-blue-50 text-blue-700'
        }`}>
          <ShieldCheck className="h-3 w-3" />
          {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Qeydiyyat',
      render: (admin) => new Date(admin.createdAt).toLocaleDateString('az-AZ'),
    },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (admin) => (
        <div className="flex gap-2">
          {admin.role !== 'SUPER_ADMIN' && admin.id !== currentUser?.id && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleting(admin)} 
              aria-label="Admini sil"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Komanda İdarəetməsi</h1>
          <p className="mt-1 text-sm text-slate-500">Sistem administratorlarını idarə edin.</p>
        </div>
        <Button onClick={openModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Yeni Admin
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          {error}
        </div>
      )}

      <Table 
        columns={columns} 
        data={admins} 
        isLoading={isLoading} 
        emptyMessage="Administrator tapılmadı." 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Yeni Admin Əlavə Et"
      >
        <form onSubmit={handleSubmit(createAdmin)} className="space-y-4 pt-2">
          <Input 
            label="Ad Soyad" 
            placeholder="Məs: Əli Məmmədov"
            error={errors.name?.message} 
            {...register('name', { required: 'Ad mütləqdir' })} 
          />
          <Input 
            label="E-poçt" 
            type="email"
            placeholder="admin@bakutech.az"
            error={errors.email?.message} 
            {...register('email', { 
              required: 'E-poçt mütləqdir',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Düzgün e-poçt ünvanı daxil edin"
              }
            })} 
          />
          <Input 
            label="Şifrə" 
            type="password"
            placeholder="••••••••"
            error={errors.password?.message} 
            {...register('password', { 
              required: 'Şifrə mütləqdir',
              minLength: { value: 8, message: 'Şifrə ən azı 8 simvol olmalıdır' }
            })} 
          />
          
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Ləğv Et
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Admin Yarat
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/admin/team/${deleting.id}`);
            await fetchAdmins();
          } catch (err) {
            setError(requestErrorMessage(err, 'Admin silinə bilmədi.'));
          } finally {
            setDeleting(null);
          }
        }}
        title="Admini sil"
        message={`"${deleting?.name}" adlı administratoru silmək istədiyinizə əminsiniz? Bu hərəkət geri qaytarıla bilməz.`}
        confirmText="Sil"
        cancelText="Ləğv et"
        variant="danger"
      />
    </div>
  );
};

export default AdminManagementPage;
