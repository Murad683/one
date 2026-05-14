import { useEffect, useState } from 'react';
import { Mail, MailOpen, Trash2, Eye } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import { useMessageStore } from '../store/messageStore';

interface ContactSubmission extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface SubmissionListResponse {
  submissions: ContactSubmission[];
  total: number;
  page: number;
  limit: number;
}

export const MessagesPage = () => {
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<ContactSubmission | null>(null);
  const [deleting, setDeleting] = useState<ContactSubmission | null>(null);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const fetchUnreadCount = useMessageStore((state) => state.fetchUnreadCount);

  const fetchMessages = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<SubmissionListResponse>(`/admin/messages?page=${page}&limit=${limit}`);
      setMessages(response.data.submissions);
      setTotal(response.data.total);
    } catch (err) {
      setError(requestErrorMessage(err, 'Mesajlar yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [page]);

  const markAsRead = async (message: ContactSubmission) => {
    if (message.isRead) return;
    try {
      await api.patch(`/contact-submissions/${message.id}`, { isRead: true });
      setMessages((current) =>
        current.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
      );
      await fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const openMessage = (message: ContactSubmission) => {
    setViewing(message);
    markAsRead(message);
  };

  const deleteMessage = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/contact-submissions/${deleting.id}`);
      setDeleting(null);
      await fetchMessages();
      await fetchUnreadCount();
    } catch (err) {
      setError(requestErrorMessage(err, 'Mesaj silinə bilmədi.'));
    }
  };

  const columns: TableColumn<ContactSubmission>[] = [
    {
      key: 'status',
      header: '',
      render: (msg) => (
        msg.isRead ? <MailOpen className="h-4 w-4 text-slate-400" /> : <Mail className="h-4 w-4 text-sky-500" />
      ),
    },
    {
      key: 'createdAt',
      header: 'Tarix',
      render: (msg) => (
        <span className={msg.isRead ? 'text-slate-500' : 'font-semibold text-slate-900'}>
          {new Date(msg.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Ad',
      render: (msg) => (
        <span className={msg.isRead ? 'text-slate-700' : 'font-bold text-slate-950'}>
          {msg.name}
        </span>
      ),
    },
    { key: 'email', header: 'E-poçt' },
    { key: 'companyName', header: 'Şirkət', render: (msg) => msg.companyName || '-' },
    { key: 'serviceName', header: 'Xidmət', render: (msg) => <Badge variant="info">{msg.serviceName || 'Ümumi'}</Badge> },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (msg) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openMessage(msg)} aria-label="Mesajı oxu">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(msg)} className="text-red-600 hover:bg-red-50" aria-label="Mesajı sil">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Gələnlər Qutusu</h1>
          <p className="mt-1 text-sm text-slate-500">Müştəri müraciətlərini idarə edin.</p>
        </div>
        <Badge variant="info" className="px-3 py-1 text-sm self-start sm:self-center">
          Cəmi {total} Mesaj
        </Badge>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Table columns={columns} data={messages} isLoading={isLoading} emptyMessage="Gələnlər qutusu boşdur." />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Əvvəlki
          </Button>
          <span className="text-xs font-medium text-slate-600">{page} / {totalPages} Səhifə</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Növbəti
          </Button>
        </div>
      )}

      {/* --- Message Viewing Modal --- */}
      <Modal isOpen={Boolean(viewing)} onClose={() => setViewing(null)} title="Mesajı Oxu" size="lg">
        {viewing && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Göndərən</span>
                <p className="text-sm font-semibold text-slate-950">{viewing.name}</p>
                <p className="text-sm text-slate-600">{viewing.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Şirkət</span>
                <p className="text-sm text-slate-950">{viewing.companyName || 'Qeyd edilməyib'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seçilən Xidmət</span>
                <p className="text-sm text-slate-950 font-medium">{viewing.serviceName || 'Ümumi Müraciət'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarix</span>
                <p className="text-sm text-slate-950">{new Date(viewing.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mesajın Mətni</span>
              <div className="rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-700 whitespace-pre-wrap min-h-40">
                {viewing.message}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setViewing(null)}>Bağla</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={deleteMessage}
        title="Mesajı sil"
        message={`${deleting?.name} tərəfindən göndərilən mesajı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
      />
    </div>
  );
};

export default MessagesPage;
