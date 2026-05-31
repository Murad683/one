import React, { useState, useRef, useEffect } from 'react';
import { Plus, Save, X, UploadCloud } from 'lucide-react';
import Button from '../ui/Button';
import Combobox from '../ui/Combobox';
import { api } from '../../lib/api';
import { requestErrorMessage } from '../../lib/apiHelpers';

interface HighlightItem {
  title: string;
  imageUrl: string;
  _file?: File;
  _preview?: string;
}

interface ClientUser {
  id: string;
  name: string;
  email: string;
  igHighlights?: { title: string; imageUrl: string }[];
}

interface HighlightsManagerProps {
  clients: ClientUser[];
  onRefreshClients: () => void;
}

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const resolveFileUrl = (fileUrl: string | null | undefined): string => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http')) return fileUrl;
  
  let normalized = fileUrl.replace(/\\/g, '/');
  if (normalized.startsWith('uploads/')) {
    normalized = normalized.replace('uploads/', '');
  } else if (normalized.includes('/uploads/')) {
    normalized = normalized.split('/uploads/').pop() || normalized;
  }

  return `${BACKEND}/api/v1/uploads/${normalized}?portal=admin`;
};

export const HighlightsManager: React.FC<HighlightsManagerProps> = ({ clients, onRefreshClients }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [newHighlightTitle, setNewHighlightTitle] = useState('');
  const [newHighlightFile, setNewHighlightFile] = useState<File | null>(null);
  const [newHighlightPreview, setNewHighlightPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const highlightFileRef = useRef<HTMLInputElement>(null);

  const clientOptions = clients.map((client) => ({ 
    value: client.id, 
    label: client.name,
    subLabel: client.email 
  }));

  const selectedClient = clients.find(c => c.id === selectedClientId);

  useEffect(() => {
    if (selectedClient) {
      const existing = selectedClient.igHighlights;
      if (Array.isArray(existing) && existing.length > 0) {
        setHighlights(existing.map((h) => ({ title: h.title, imageUrl: h.imageUrl })));
      } else {
        setHighlights([]);
      }
      setNewHighlightTitle('');
      setNewHighlightFile(null);
      setNewHighlightPreview(null);
      setError('');
      setSuccess('');
    } else {
      setHighlights([]);
    }
  }, [selectedClient]);

  const handleHighlightFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewHighlightFile(file);
      setNewHighlightPreview(URL.createObjectURL(file));
    }
  };

  const addHighlight = () => {
    if (!newHighlightFile || !newHighlightTitle.trim()) return;
    if (highlights.length >= 20) {
      setError('Maksimum 20 highlight əlavə edə bilərsiniz.');
      return;
    }

    setHighlights((prev) => [
      ...prev,
      {
        title: newHighlightTitle.trim(),
        imageUrl: '',
        _file: newHighlightFile,
        _preview: newHighlightPreview || undefined,
      },
    ]);
    setNewHighlightTitle('');
    setNewHighlightFile(null);
    setNewHighlightPreview(null);
    if (highlightFileRef.current) highlightFileRef.current.value = '';
    setError('');
  };

  const removeHighlight = (index: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedClientId) return;
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const finalHighlights: { title: string; imageUrl: string }[] = [];
      for (const h of highlights) {
        if (h._file) {
          const hlData = new FormData();
          hlData.append('file', h._file);
          const hlRes = await api.post('/uploads/highlights', hlData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const uploadedUrl = hlRes.data?.data?.url || hlRes.data?.url || hlRes.data?.data?.storageKey || '';
          finalHighlights.push({ title: h.title, imageUrl: uploadedUrl });
        } else {
          finalHighlights.push({ title: h.title, imageUrl: h.imageUrl });
        }
      }

      await api.patch(`/users/${selectedClientId}`, {
        igHighlights: finalHighlights,
      });

      setSuccess('Highlightlar uğurla yadda saxlanıldı!');
      onRefreshClients();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(requestErrorMessage(err, 'Xəta baş verdi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
          Instagram Önə Çıxanlar (Highlights)
        </h3>
        
        <div className="max-w-md mb-6">
          <Combobox
            label="Müştəri Seçin"
            options={clientOptions}
            value={selectedClientId}
            onChange={setSelectedClientId}
            placeholder="Müştəri axtar..."
          />
        </div>

        {selectedClient ? (
          <div className="space-y-6 border-t border-edge pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-heading">{selectedClient.name}</h4>
                <p className="text-sm text-muted">{selectedClient.email}</p>
              </div>
              <span className="text-xs font-medium text-muted bg-surface-alt px-2 py-1 rounded-md border border-edge">
                {highlights.length} / 20 Limit
              </span>
            </div>

            {/* Existing Highlights */}
            {highlights.length > 0 ? (
              <div className="flex flex-wrap gap-4 p-4 bg-surface-alt rounded-xl border border-edge">
                {highlights.map((h, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 relative group w-20">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-edge bg-surface shadow-sm flex items-center justify-center p-[2px]">
                        <div className="w-full h-full rounded-full overflow-hidden">
                           <img
                            src={h._preview || resolveFileUrl(h.imageUrl)}
                            alt={h.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHighlight(idx)}
                        disabled={isSubmitting}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
                        title="Sil"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <span className="text-xs text-center truncate w-full font-medium text-body" title={h.title}>
                      {h.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-surface-alt rounded-xl border border-edge border-dashed">
                <p className="text-muted text-sm">Bu müştəri üçün hələ highlight əlavə edilməyib.</p>
              </div>
            )}

            {/* Add New Highlight */}
            {highlights.length < 20 && (
              <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex-1 w-full space-y-1.5">
                  <label className="text-sm font-medium text-body">Yeni Şəkil Seçin</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-edge bg-white cursor-pointer transition-all hover:opacity-80 shadow-sm"
                      onClick={() => highlightFileRef.current?.click()}
                    >
                      {newHighlightPreview ? (
                        <img src={newHighlightPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <UploadCloud size={18} className="text-muted" />
                      )}
                    </div>
                    <input
                      type="file"
                      ref={highlightFileRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleHighlightFileChange}
                      disabled={isSubmitting}
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newHighlightTitle}
                        onChange={(e) => setNewHighlightTitle(e.target.value.slice(0, 30))}
                        placeholder="Başlıq daxil edin..."
                        disabled={isSubmitting}
                        className="w-full bg-white border border-field-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={addHighlight} 
                  disabled={isSubmitting || !newHighlightFile || !newHighlightTitle.trim()}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <Plus size={16} className="mr-2" />
                  Siyahıya Əlavə Et
                </Button>
              </div>
            )}

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
            {success && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">{success}</div>}

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} isLoading={isSubmitting} disabled={isSubmitting}>
                <Save size={16} className="mr-2" />
                Yadda Saxla
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-muted border border-edge border-dashed rounded-xl bg-surface-alt">
            Zəhmət olmasa highlightlarını idarə etmək üçün yuxarıdan müştəri seçin.
          </div>
        )}
      </div>
    </div>
  );
};
