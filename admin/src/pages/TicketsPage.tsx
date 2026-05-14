import { useEffect, useState, useCallback } from 'react';

import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { ApiEnvelope } from '../lib/apiHelpers';
import useToastStore from '../store/useToastStore';

interface Ticket extends Record<string, unknown> {
  id: number;
  subject: string;
  body: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
  user: { id: string; name: string; email: string };
}

const statusLabels: Record<string, string> = {
  OPEN: 'Açıq',
  IN_PROGRESS: 'İcrada',
  CLOSED: 'Bağlı',
};

const statusVariants: Record<string, 'success' | 'warning' | 'default'> = {
  OPEN: 'success',
  IN_PROGRESS: 'warning',
  CLOSED: 'default',
};

export const TicketsPage = () => {
  const addToast = useToastStore((s) => s.addToast);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get<ApiEnvelope<Ticket[]>>('/admin/tickets');
      setTickets(res.data.data);
    } catch (err) {
      setError(requestErrorMessage(err, 'Sorğular yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    setUpdatingId(ticketId);
    try {
      await api.patch(`/admin/tickets/${ticketId}/status`, { status: newStatus });
      addToast('Status yeniləndi.', 'success');
      await fetchTickets();
    } catch (err) {
      addToast(requestErrorMessage(err, 'Status yenilənə bilmədi.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' });

  const columns: TableColumn<Ticket>[] = [
    {
      key: 'user',
      header: 'Müştəri',
      render: (t) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{t.user.name}</p>
          <p className="text-xs text-slate-500">{t.user.email}</p>
        </div>
      ),
    },
    { key: 'subject', header: 'Mövzu' },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Badge variant={statusVariants[t.status] ?? 'default'}>
          {statusLabels[t.status] ?? t.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Tarix',
      render: (t) => <span className="text-sm text-slate-600">{formatDate(t.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Dəyişdir',
      render: (t) => (
        <select
          value={t.status}
          onChange={(e) => handleStatusChange(t.id, e.target.value)}
          disabled={updatingId === t.id}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 disabled:opacity-50"
        >
          <option value="OPEN">Açıq</option>
          <option value="IN_PROGRESS">İcrada</option>
          <option value="CLOSED">Bağlı</option>
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Dəstək Sorğuları</h1>
        <p className="mt-1 text-sm text-slate-500">Müştəri dəstək biletlərini idarə edin.</p>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Table columns={columns} data={tickets} isLoading={isLoading} emptyMessage="Heç bir dəstək sorğusu tapılmadı." />
    </div>
  );
};

export default TicketsPage;
