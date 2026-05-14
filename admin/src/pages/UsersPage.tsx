import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Plus, Trash2, Package } from 'lucide-react';
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
import useToastStore from '../store/useToastStore';

interface PackageInfo {
  id: string;
  name: string;
  priceLabel: string;
}

interface ClientUser extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT';
  createdAt: string;
  package?: PackageInfo | null;
  _count?: { payments: number };
}

interface Payment extends Record<string, unknown> {
  id: string;
  amount: number;
  paidAt: string;
  nextPaymentDate: string;
  invoicePdfUrl?: string | null;
  note?: string | null;
}

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  packageId: string;
}

const defaultValues: UserFormValues = {
  name: '',
  email: '',
  password: '',
  packageId: '',
};

export const UsersPage = () => {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ClientUser | null>(null);
  const [deleting, setDeleting] = useState<ClientUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Package assignment state
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Payment history state
  const [viewingPaymentsUser, setViewingPaymentsUser] = useState<ClientUser | null>(null);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormValues>({
    defaultValues,
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<ApiEnvelope<ClientUser[]>>('/admin/users');
      setUsers(response.data.data);
    } catch (err) {
      // Fallback to old endpoint if admin/users fails
      try {
        const response = await api.get<ApiEnvelope<Paginated<ClientUser>>>('/users?role=CLIENT&limit=100');
        setUsers(response.data.data.items);
      } catch (err2) {
        setError(requestErrorMessage(err2, 'Müştərilər yüklənə bilmədi.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const response = await api.get<ApiEnvelope<Paginated<PackageInfo>>>('/packages?limit=100');
      setPackages(response.data.data.items);
    } catch {
      // Packages may not have paginated response
      try {
        const response = await api.get<ApiEnvelope<PackageInfo[]>>('/packages');
        setPackages(Array.isArray(response.data.data) ? response.data.data : []);
      } catch { /* ignore */ }
    }
  }, []);

  const fetchUserPayments = useCallback(async (userId: string) => {
    setIsPaymentsLoading(true);
    try {
      const response = await api.get<ApiEnvelope<Payment[]>>(`/admin/payments/user/${userId}`);
      setUserPayments(response.data.data);
    } catch (err) {
      addToast(requestErrorMessage(err, 'Ödəniş tarixçəsi yüklənə bilmədi.'), 'error');
    } finally {
      setIsPaymentsLoading(false);
    }
  }, [addToast]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!viewingPaymentsUser) return;
    try {
      await api.delete(`/admin/payments/${paymentId}`);
      addToast('Ödəniş silindi.', 'success');
      fetchUserPayments(viewingPaymentsUser.id);
      fetchUsers(); // Update payment count in main table
    } catch (err) {
      addToast(requestErrorMessage(err, 'Ödəniş silinə bilmədi.'), 'error');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPackages();
  }, [fetchUsers, fetchPackages]);

  const openModal = (user?: ClientUser) => {
    setEditing(user || null);
    reset(user ? { name: user.name, email: user.email, password: '', packageId: user.package?.id ?? '' } : defaultValues);
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
          ...(values.packageId && { packageId: values.packageId }),
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

  const handleAssignPackage = async (userId: string) => {
    setIsAssigning(true);
    try {
      await api.patch(`/admin/users/${userId}/package`, {
        packageId: selectedPackageId || null,
      });
      addToast('Paket uğurla təyin edildi.', 'success');
      setAssigningUser(null);
      setSelectedPackageId('');
      await fetchUsers();
    } catch (err) {
      addToast(requestErrorMessage(err, 'Paket təyin edilə bilmədi.'), 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const columns: TableColumn<ClientUser>[] = [
    { key: 'name', header: 'Ad' },
    { key: 'email', header: 'E-poçt' },
    {
      key: 'package',
      header: 'Paket',
      render: (user) => {
        // Package assignment inline UI
        if (assigningUser === user.id) {
          return (
            <div className="flex items-center gap-2">
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="rounded-lg border border-field-border bg-surface px-2 py-1.5 text-xs"
              >
                <option value="">Paketi sil</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Button size="sm" onClick={() => handleAssignPackage(user.id)} isLoading={isAssigning}>
                ✓
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAssigningUser(null)}>
                ✕
              </Button>
            </div>
          );
        }
        return (
          <span className={user.package ? 'text-body' : 'text-faint italic'}>
            {user.package?.name ?? 'Təyin edilməyib'}
          </span>
        );
      },
    },
    {
      key: '_count',
      header: 'Ödəniş sayı',
      render: (user) => (
        <button
          onClick={() => {
            setViewingPaymentsUser(user);
            fetchUserPayments(user.id);
          }}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline transition-colors"
          title="Ödəniş tarixçəsinə bax"
        >
          {user._count?.payments ?? 0}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (user) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAssigningUser(user.id);
              setSelectedPackageId(user.package?.id ?? '');
            }}
            title="Paket Təyin Et"
          >
            <Package className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/payments/new?userId=${user.id}`)}
            title="Ödəniş Əlavə Et"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openModal(user)} title="Redaktə Et">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(user)} className="text-red-600 hover:bg-red-50 hover:text-red-700" title="Sil">
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
          <h1 className="text-2xl font-semibold text-heading">Müştərilər</h1>
          <p className="mt-1 text-sm text-muted">Müştəri portalı istifadəçilərini idarə edin.</p>
        </div>
        <Button onClick={() => openModal()} className="w-full sm:w-auto">
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
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-body">Paket Seçin</label>
            <select
              {...register('packageId')}
              className="block w-full rounded-lg border border-field-border bg-surface px-3 py-2 text-sm text-heading outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">Təyin edilməyib / Fərdi</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 border-t border-edge pt-4">
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

      {/* Payment History Modal */}
      <Modal
        isOpen={Boolean(viewingPaymentsUser)}
        onClose={() => setViewingPaymentsUser(null)}
        title={viewingPaymentsUser ? `${viewingPaymentsUser.name} - Ödəniş Tarixçəsi` : 'Ödəniş Tarixçəsi'}
        size="xl"
      >
        <div className="space-y-4">
          <Table
            columns={[
              {
                key: 'paidAt',
                header: 'Tarix',
                render: (p) => new Date(p.paidAt).toLocaleDateString('az-AZ'),
              },
              {
                key: 'amount',
                header: 'Məbləğ',
                render: (p) => <span className="font-medium text-slate-900">{p.amount} AZN</span>,
              },
              {
                key: 'nextPaymentDate',
                header: 'Növbəti Ödəniş',
                render: (p) => new Date(p.nextPaymentDate).toLocaleDateString('az-AZ'),
              },
              {
                key: 'actions',
                header: 'Əməliyyatlar',
                render: (p) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingPaymentId(p.id)}
                    className="text-red-600 hover:bg-red-50"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ),
              },
            ]}
            data={userPayments}
            isLoading={isPaymentsLoading}
            emptyMessage="Hələlik ödəniş yoxdur"
          />
          <div className="flex justify-end border-t border-edge-light pt-4">
            <Button variant="secondary" onClick={() => setViewingPaymentsUser(null)}>
              Bağla
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingPaymentId)}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={() => deletingPaymentId && handleDeletePayment(deletingPaymentId)}
        title="Ödənişi sil"
        message="Bu ödəniş qeydi həmişəlik silinəcək. Davam etmək istədiyinizə əminsiniz?"
      />
    </div>
  );
};

export default UsersPage;
