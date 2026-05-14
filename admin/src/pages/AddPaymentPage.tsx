import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, CheckCircle } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { api } from '../lib/api';
import { requestErrorMessage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';
import useToastStore from '../store/useToastStore';
import Combobox from '../components/ui/Combobox';

interface ClientUser {
  id: string;
  name: string;
  email: string;
}

const toDateInput = (d: Date) => d.toISOString().split('T')[0];

const addOneMonth = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  // Handle month overflow (e.g., Jan 31 → Feb 28)
  if (d.getDate() !== day) {
    d.setDate(0); // Go to last day of previous month
  }
  return toDateInput(d);
};

export const AddPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToast = useToastStore((s) => s.addToast);

  const preselectedUserId = searchParams.get('userId') || '';

  const [clients, setClients] = useState<ClientUser[]>([]);
  const [userId, setUserId] = useState(preselectedUserId);
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(toDateInput(new Date()));
  const [nextPaymentDate, setNextPaymentDate] = useState(addOneMonth(toDateInput(new Date())));
  const [invoicePdfUrl, setInvoicePdfUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get<ApiEnvelope<Paginated<ClientUser>>>('/users?role=CLIENT&limit=100');
      setClients(res.data.data.items);
    } catch {
      try {
        const res = await api.get<ApiEnvelope<ClientUser[]>>('/admin/users');
        setClients(Array.isArray(res.data.data) ? res.data.data : []);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Auto-calculate nextPaymentDate when paidAt changes
  useEffect(() => {
    if (paidAt) {
      setNextPaymentDate(addOneMonth(paidAt));
    }
  }, [paidAt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Yalnız PDF faylları qəbul edilir.');
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<ApiEnvelope<{ url: string }>>('/admin/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setInvoicePdfUrl(res.data.data.url);
      setUploadedFileName(file.name);
    } catch (err) {
      setError(requestErrorMessage(err, 'Fayl yüklənə bilmədi.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId || !amount || !paidAt || !nextPaymentDate) {
      setError('Müştəri, məbləğ, ödəniş tarixi və növbəti ödəniş tarixi mütləqdir.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/admin/payments', {
        userId,
        amount: parseFloat(amount),
        paidAt: new Date(paidAt).toISOString(),
        nextPaymentDate: new Date(nextPaymentDate).toISOString(),
        ...(invoicePdfUrl && { invoicePdfUrl }),
        ...(note.trim() && { note: note.trim() }),
      });
      addToast('Ödəniş uğurla əlavə edildi.', 'success');
      navigate('/users');
    } catch (err) {
      setError(requestErrorMessage(err, 'Ödəniş əlavə edilə bilmədi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-heading">Ödəniş Əlavə Et</h1>
          <p className="mt-1 text-sm text-muted">Müştəri üçün yeni ödəniş qeyd edin.</p>
        </div>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-edge bg-surface p-6">
          {/* Client Select */}
          <Combobox
            label="Müştəri"
            options={clients.map(c => ({ value: c.id, label: c.name, subLabel: c.email }))}
            value={userId}
            onChange={(val) => setUserId(val)}
            placeholder="Müştəri seçin..."
          />

          {/* Amount */}
          <Input
            label="Məbləğ (AZN)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ödəniş tarixi"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Növbəti ödəniş tarixi"
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Invoice Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-body">Qaimə (PDF)</label>
            {uploadedFileName ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <FileText className="h-4 w-4 text-muted" />
                <span className="text-body truncate flex-1">{uploadedFileName}</span>
                <button
                  type="button"
                  onClick={() => { setInvoicePdfUrl(''); setUploadedFileName(''); }}
                  className="text-xs text-muted hover:text-red-600"
                >
                  Sil
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-field-border px-3 py-3 text-sm text-muted transition hover:border-slate-400 hover:bg-surface-alt">
                <Upload className="h-4 w-4" />
                {isUploading ? 'Yüklənir...' : 'PDF fayl seçin'}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading || isSubmitting}
                />
              </label>
            )}
          </div>

          {/* Note */}
          <Textarea
            label="Admin qeydi (istəyə bağlı)"
            placeholder="Əlavə qeyd..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSubmitting}
          />

          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end gap-3 border-t border-edge pt-4">
            <Button variant="secondary" onClick={() => navigate('/users')} disabled={isSubmitting}>
              Ləğv Et
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Ödənişi Yadda Saxla
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentPage;
