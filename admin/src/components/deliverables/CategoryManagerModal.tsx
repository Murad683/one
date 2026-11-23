import { useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';

import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { api } from '../../lib/api';
import { requestErrorMessage } from '../../lib/apiHelpers';

export interface ManagedCategory {
  id: string;
  name: string;
  isVideo: boolean;
  /** Files using the category (from the API); a category with files cannot be deleted. */
  fileCount?: number;
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ManagedCategory[];
  /** After any change: the page reloads the categories and the table. */
  onChanged: () => Promise<void> | void;
}

const VideoCheckbox = ({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label htmlFor={id} className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm text-body">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-field-border text-blue-600 focus:ring-blue-600"
    />
    Video
  </label>
);

/** File categories (types), kept behind the "Kateqoriyalar" button so they are not changed by accident. */
const CategoryManagerModal = ({ isOpen, onClose, categories, onChanged }: CategoryManagerModalProps) => {
  // Shown inside the window: the admin has no visible toast area.
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newIsVideo, setNewIsVideo] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editIsVideo, setEditIsVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ManagedCategory | null>(null);

  const startEdit = (c: ManagedCategory) => {
    setError('');
    setEditingId(c.id);
    setEditName(c.name);
    setEditIsVideo(c.isVideo);
  };

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.post('/deliverable-categories', { name: newName.trim(), isVideo: newIsVideo });
      setNewName('');
      setNewIsVideo(false);
      await onChanged();
    } catch (err) {
      setError(requestErrorMessage(err, 'Kateqoriya əlavə edilə bilmədi.'));
    } finally {
      setAdding(false);
    }
  };

  const save = async (c: ManagedCategory) => {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/deliverable-categories/${c.id}`, { name: editName.trim(), isVideo: editIsVideo });
      setEditingId('');
      await onChanged();
    } catch (err) {
      setError(requestErrorMessage(err, 'Kateqoriya yenilənə bilmədi.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setError('');
    try {
      await api.delete(`/deliverable-categories/${deleting.id}`);
      await onChanged();
    } catch (err) {
      setError(requestErrorMessage(err, 'Kateqoriya silinə bilmədi.'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setError('');
          setEditingId('');
          onClose();
        }}
        title="Fayl kateqoriyaları" size="md">
        <div className="space-y-4">
          {categories.length === 0 ? (
            <p className="text-sm text-muted">Hələ kateqoriya yoxdur.</p>
          ) : (
            <ul className="divide-y divide-edge rounded-lg border border-edge">
              {categories.map((c) => {
                const count = c.fileCount ?? 0;
                const inUse = count > 0;
                return (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                    {editingId === c.id ? (
                      <>
                        <div className="min-w-0 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') save(c);
                              if (e.key === 'Escape') setEditingId('');
                            }}
                            maxLength={50}
                            aria-label="Kateqoriyanın adı"
                            autoFocus
                          />
                        </div>
                        <VideoCheckbox id={`edit-video-${c.id}`} checked={editIsVideo} onChange={setEditIsVideo} />
                        <Button size="sm" onClick={() => save(c)} isLoading={saving}>
                          Yadda saxla
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId('')}>
                          Ləğv
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
                          {c.name}
                          {c.isVideo && (
                            <span className="ml-2 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
                              Video
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{count} fayl</span>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)} aria-label={`${c.name} kateqoriyasını redaktə et`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {/* title on the wrapper: a disabled button shows no tooltip */}
                        <span
                          className="inline-flex"
                          title={inUse ? `${count} fayl var — əvvəl faylları başqa növə keçirin` : 'Sil'}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleting(c)}
                            disabled={inUse}
                            aria-label={`${c.name} kateqoriyasını sil`}
                            className="text-red-500 disabled:text-faint"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-edge pt-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Input
                placeholder="Yeni kateqoriya adı..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                maxLength={50}
                aria-label="Yeni kateqoriyanın adı"
              />
            </div>
            <VideoCheckbox id="new-category-video" checked={newIsVideo} onChange={setNewIsVideo} />
            <Button onClick={add} isLoading={adding} disabled={!newName.trim()} className="shrink-0">
              <Plus className="h-4 w-4" />
              Əlavə et
            </Button>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </p>
          )}
          <div className="space-y-0.5 text-xs text-muted">
            <p>
              <span className="font-medium text-body">Video</span> paylaşacaqsınızsa və kover şəkli əlavə etmək
              istəyirsinizsə, <span className="font-medium text-body">"Video"</span> qutusunu işarələyin.
            </p>
            <p>Faylı olan kateqoriya silinmir.</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Kateqoriyanı sil"
        message={`"${deleting?.name ?? ''}" kateqoriyası silinəcək. Davam edək?`}
        confirmText="Sil"
        cancelText="İmtina"
      />
    </>
  );
};

export default CategoryManagerModal;
