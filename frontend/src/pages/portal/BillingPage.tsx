import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Receipt, FileDown } from 'lucide-react';

interface Payment {
  id: number;
  amount: string;
  currency: string;
  paidAt: string;
  nextPaymentDate: string;
  invoicePdfUrl: string | null;
  note: string | null;
}

/* ─── Skeleton Row ───────────────────────────── */
const SkeletonRow = () => (
  <div className="flex items-center justify-between py-5 animate-pulse">
    <div className="flex flex-col gap-2">
      <div className="h-4 w-24 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="h-3 w-36 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
    </div>
    <div className="h-4 w-16 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
  </div>
);

const BillingPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (apiClient.get('/dashboard/payments') as Promise<{ data: Payment[] }>)
      .then((res) => setPayments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatAmount = (amount: string, currency: string) =>
    `${parseFloat(amount).toFixed(2)} ${currency === 'AZN' ? '₼' : currency}`;

  return (
    <div className="pb-28 lg:pb-12">
      {/* Page Header */}
      <div className="pt-12 pb-8 px-6 md:px-10">
        <p className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--accent-text)' }}>
          Şəxsi Kabinet
        </p>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Ödəniş Tarixçəsi
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Bütün ödənişlərinizin qeydi.
        </p>
      </div>

      <div className="px-6 md:px-10">
        {loading ? (
          <div
            className="rounded-2xl border divide-y"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
            }}
          >
            <div className="px-6"><SkeletonRow /></div>
            <div className="px-6"><SkeletonRow /></div>
            <div className="px-6"><SkeletonRow /></div>
          </div>
        ) : payments.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24">
            <Receipt size={40} style={{ color: 'var(--text-ghost)' }} className="mb-4" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Hələ ki heç bir ödəniş qeydə alınmayıb.
            </p>
          </div>
        ) : (
          /* Payments Table */
          <div className="overflow-x-auto no-scrollbar">
            <div
              className="rounded-2xl border min-w-[640px]"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
            >
              {/* Table Header */}
              <div
                className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-widest font-medium border-b"
                style={{ color: 'var(--text-ghost)', borderColor: 'var(--border-subtle)' }}
              >
                <span className="col-span-3">Tarix</span>
                <span className="col-span-2">Məbləğ</span>
                <span className="col-span-3">Növbəti Ödəniş</span>
                <span className="col-span-2">Qeyd</span>
                <span className="col-span-2 text-right">Qaimə</span>
              </div>

              {/* Rows */}
              {payments.map((p, i) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center"
                  style={{
                    borderBottom: i < payments.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <span className="col-span-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatDate(p.paidAt)}
                  </span>
                  <span className="col-span-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {formatAmount(p.amount, p.currency)}
                  </span>
                  <span className="col-span-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(p.nextPaymentDate)}
                  </span>
                  <span className="col-span-2 text-xs truncate" style={{ color: 'var(--text-faint)' }}>
                    {p.note ?? '—'}
                  </span>
                  <div className="col-span-2 text-right">
                    {p.invoicePdfUrl ? (
                      <a
                        href={`http://localhost:5000${p.invoicePdfUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{
                          color: 'var(--accent-text)',
                          backgroundColor: 'var(--glow-accent-subtle)',
                        }}
                      >
                        <FileDown size={12} />
                        Yüklə
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
