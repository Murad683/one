import { useEffect, useState } from 'react';
import { Briefcase, MessageSquare, Users, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { api } from '../lib/api';

interface ApiEnvelope<T> {
  data: T;
}



interface ContactSubmission extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DashboardStats {
  projects: number;
  services: number;
  clients: number;
  unread: number;
  recentMessages: ContactSubmission[];
}

const columns: TableColumn<ContactSubmission>[] = [
  { key: 'name', header: 'Ad' },
  { key: 'email', header: 'E-poçt' },
  {
    key: 'message',
    header: 'Mesaj',
    render: (row) => <span className="line-clamp-1">{row.message}</span>,
  },
  {
    key: 'isRead',
    header: 'Status',
    render: (row) => <Badge variant={row.isRead ? 'default' : 'info'}>{row.isRead ? 'Oxunub' : 'Yeni'}</Badge>,
  },
  {
    key: 'createdAt',
    header: 'Tarix',
    render: (row) => new Date(row.createdAt).toLocaleDateString(),
  },
];

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({
    projects: 0,
    services: 0,
    clients: 0,
    unread: 0,
    recentMessages: [],
  });
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get<ApiEnvelope<DashboardStats>>('/admin/stats');
        
        if (!isMounted) return;

        const data = response.data.data;
        setStats(data);
        setMessages(data.recentMessages);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        if (isMounted) setError('Məlumatlar yüklənə bilmədi.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">İdarəetmə Paneli</h1>
        <p className="mt-1 text-sm text-slate-500">Məzmun və müştəri aktivliyinə ümumi baxış.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Briefcase} title="Ümumi Layihələr" value={stats.projects} isLoading={isLoading} />
        <StatCard icon={Wrench} title="Aktiv Xidmətlər" value={stats.services} isLoading={isLoading} />
        <StatCard icon={Users} title="Ümumi Müştərilər" value={stats.clients} isLoading={isLoading} />
        <StatCard icon={MessageSquare} title="Oxunmamış Mesajlar" value={stats.unread} isLoading={isLoading} />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Son Mesajlar</h2>
          <p className="text-sm text-slate-500">Əlaqə formasından gələn son müraciətlər.</p>
        </div>
        <Table
          columns={columns}
          data={messages}
          isLoading={isLoading}
          emptyMessage="Hələ ki heç bir müraciət yoxdur."
        />
      </section>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  title,
  value,
  isLoading,
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  isLoading: boolean;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {isLoading ? (
          <div className="mt-2 h-7 w-14 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="text-2xl font-semibold text-slate-950">{value}</p>
        )}
      </div>
    </div>
  </div>
);

export default DashboardPage;
