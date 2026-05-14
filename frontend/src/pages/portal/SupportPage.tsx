import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Send, MessageCircle, CheckCircle2 } from 'lucide-react';

interface Ticket {
  id: number;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Açıq', color: 'var(--accent-text)', bg: 'var(--glow-accent-subtle)' },
  IN_PROGRESS: { label: 'Baxılır', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
  CLOSED: { label: 'Bağlı', color: 'var(--text-faint)', bg: 'var(--bg-elevated)' },
};

const SupportPage = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTickets = () => {
    (apiClient.get('/dashboard/tickets') as Promise<{ data: Ticket[] }>)
      .then((res) => setTickets(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!subject.trim() || !body.trim()) {
      setError('Mövzu və mesaj sahələri mütləqdir.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/dashboard/tickets', { subject, body });
      setSubject('');
      setBody('');
      setSuccess('Sorğunuz göndərildi. Tezliklə sizinlə əlaqə saxlanılacaq.');
      fetchTickets();
      // Auto-clear success after 5s
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      setError('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('az-AZ', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="pb-28 lg:pb-12">
      {/* Page Header */}
      <div className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6 md:px-10">
        <p className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--accent-text)' }}>
          Şəxsi Kabinet
        </p>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Dəstək
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Sualınız var? Komandamızla əlaqə saxlayın.
        </p>
      </div>

      <div className="px-4 sm:px-6 md:px-10">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Ticket Form — left / top */}
          <div className="xl:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border p-4 sm:p-6"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
            >
              <p className="text-[11px] uppercase tracking-widest font-medium mb-5" style={{ color: 'var(--text-ghost)' }}>
                Yeni Müraciət
              </p>

              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Mövzu"
                disabled={submitting}
                className="w-full rounded-xl py-3 px-4 text-sm mb-3 focus:outline-none transition-all disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Mesajınızı bura yazın..."
                rows={6}
                disabled={submitting}
                className="w-full rounded-xl py-3 px-4 text-sm mb-4 resize-none focus:outline-none transition-all disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />

              {error && (
                <p className="text-xs mb-3 py-2 px-3 rounded-lg" style={{ color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.06)' }}>
                  {error}
                </p>
              )}

              {success && (
                <div
                  className="flex items-center gap-2 text-xs mb-3 py-2.5 px-3 rounded-lg"
                  style={{ color: 'var(--accent-text)', backgroundColor: 'var(--glow-accent-subtle)' }}
                >
                  <CheckCircle2 size={14} />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-sm font-semibold rounded-full transition-all hover:opacity-90 disabled:opacity-50"
                style={{ color: 'var(--accent-on-accent)' }}
              >
                <Send size={14} />
                {submitting ? 'Göndərilir...' : 'Göndər'}
              </button>
            </form>
          </div>

          {/* Tickets List — right / bottom */}
          <div className="xl:col-span-3">
            <p className="text-[11px] uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--text-ghost)' }}>
              Əvvəlki Sorğular
            </p>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="rounded-2xl border p-5 animate-pulse"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                  >
                    <div className="h-4 w-32 rounded mb-3" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                    <div className="h-3 w-full rounded mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                    <div className="h-3 w-2/3 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <MessageCircle size={36} style={{ color: 'var(--text-ghost)' }} className="mb-4" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Hələ ki heç bir sorğunuz yoxdur.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => {
                  const status = statusConfig[t.status] ?? statusConfig.OPEN;
                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border p-5"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {t.subject}
                        </p>
                        <span
                          className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                          style={{ color: status.color, backgroundColor: status.bg }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                        {t.body.length > 100 ? `${t.body.slice(0, 100)}...` : t.body}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                        {formatDate(t.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
