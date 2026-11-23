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

/** What the category holds. A new category starts with no choice, so it cannot be saved without one. */
type Kind = 'image' | 'video';

const KindSwitch = ({
  value,
  onChange,
  disabled,
}: {
  value: Kind | null;
  onChange: (k: Kind) => void;
  disabled?: boolean;
}) => (
  <div
    className="inline-flex shrink-0 rounded-lg border border-edge bg-surface-alt p-0.5"
    role="radiogroup"
    aria-label="Bu kateqoriyada nə paylaşacaqsınız?"
  >
    {(
      [
        { value: 'image', label: 'Şəkillər' },
        { value: 'video', label: 'Videolar' },
      ] as const
    ).map((o) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={active}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors duration-200 disabled:opacity-60 ${
            active ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

/** File categories (types), kept behind the "Kateqoriyalar" button so they are not changed by accident. */
const CategoryManagerModal = ({ isOpen, onClose, categories, onChanged }: CategoryManagerModalProps) => {
  // Shown inside the window: the admin has no visible toast area.
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<Kind | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editKind, setEditKind] = useState<Kind>('image');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ManagedCategory | null>(null);

  const startEdit = (c: ManagedCategory) => {
    setError('');
    setEditingId(c.id);
    setEditName(c.name);
    setEditKind(c.isVideo ? 'video' : 'image');
  };

  const add = async () => {
    if (!newName.trim() || !newKind) return;
    setAdding(true);
    setError('');
    try {
      await api.post('/deliverable-categories', { name: newName.trim(), isVideo: newKind === 'video' });
      setNewName('');
      setNewKind(null);
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
      await api.patch(`/deliverable-categories/${c.id}`, { name: editName.trim(), isVideo: editKind === 'video' });
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
                        <KindSwitch value={editKind} onChange={setEditKind} />
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

          <div className="space-y-3 border-t border-edge pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              {/* title on the wrapper: a disabled button shows no tooltip */}
              <span
                className="inline-flex shrink-0"
                title={newName.trim() && !newKind ? 'Əvvəl şəkillər, yoxsa videolar olduğunu seçin' : undefined}
              >
                <Button onClick={add} isLoading={adding} disabled={!newName.trim() || !newKind} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Əlavə et
                </Button>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-sm text-body">Bu kateqoriyada nə paylaşacaqsınız?</span>
              <KindSwitch value={newKind} onChange={setNewKind} disabled={adding} />
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </p>
          )}
          <div className="space-y-0.5 text-xs text-muted">
            <p>Videolar seçilən kateqoriyada kover şəkli əlavə etmək olur.</p>
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
