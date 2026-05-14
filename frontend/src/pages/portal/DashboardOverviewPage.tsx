import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Package, CalendarClock, MessageCircle, FolderOpen, CreditCard } from 'lucide-react';

interface OverviewData {
  package: { name: string; price: string } | null;
  nextPaymentDate: string | null;
  openTicketCount: number;
}

/* ─── Skeleton Card ──────────────────────────── */
const SkeletonCard = () => (
  <div
    className="rounded-2xl border p-6 animate-pulse"
    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
  >
    <div className="h-3 w-20 rounded mb-4" style={{ backgroundColor: 'var(--bg-elevated)' }} />
    <div className="h-6 w-32 rounded mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
    <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
  </div>
);

const DashboardOverviewPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (apiClient.get('/dashboard/overview') as Promise<{ data: OverviewData }>)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ─── Payment urgency check ────────────────── */
  const isPaymentSoon = (() => {
    if (!data?.nextPaymentDate) return false;
    const diff = new Date(data.nextPaymentDate).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  })();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pb-28 lg:pb-12">
      {/* Greeting */}
      <div className="pt-12 pb-8 px-6 md:px-10">
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Xoş gəldiniz, {user?.name} 👋
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Sizin hesabınızın son vəziyyəti aşağıda göstərilir.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="px-6 md:px-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Active Package */}
            <div
              className="rounded-2xl border p-6 transition-colors"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                borderTopColor: 'var(--card-border-top)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Package size={14} style={{ color: 'var(--accent-text)' }} />
                <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-ghost)' }}>
                  Aktiv Paket
                </span>
              </div>
              <p className="font-heading text-xl font-semibold mb-1" style={{ color: data?.package ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {data?.package?.name ?? 'Fərdi Paket'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {data?.package?.price ? `${data.package.price}` : 'Fərdi qiymət'}
              </p>
            </div>

            {/* Card 2: Next Payment */}
            <div
              className="rounded-2xl border p-6 transition-colors"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                borderTopColor: 'var(--card-border-top)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock size={14} style={{ color: 'var(--accent-text)' }} />
                <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-ghost)' }}>
                  Növbəti Ödəniş
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-xl font-semibold" style={{ color: data?.nextPaymentDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {data?.nextPaymentDate ? formatDate(data.nextPaymentDate) : 'Məlumat yoxdur'}
                </p>
                {isPaymentSoon && (
                  <span
                    className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                  >
                    Yaxında
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: Open Tickets */}
            <div
              className="rounded-2xl border p-6 transition-colors"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                borderTopColor: 'var(--card-border-top)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={14} style={{ color: 'var(--accent-text)' }} />
                <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-ghost)' }}>
                  Açıq Sorğular
                </span>
              </div>
              <p className="font-heading text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {data?.openTicketCount ?? 0}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                aktiv dəstək sorğusu
              </p>
            </div>
          </div>
        )}

        {/* Quick Links */}
        {!loading && (
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Link
              to="/portal/panel/deliverables"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border text-sm font-medium transition-all hover:opacity-80"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <FolderOpen size={15} />
              Çatdırılmalarımı gör
            </Link>
            <Link
              to="/portal/panel/billing"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border text-sm font-medium transition-all hover:opacity-80"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <CreditCard size={15} />
              Ödəniş tarixçəsi
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverviewPage;
