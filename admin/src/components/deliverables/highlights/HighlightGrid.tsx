import { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, Plus } from 'lucide-react';
import { MAX_HIGHLIGHTS, TITLE_MAX, type HighlightSummary } from '../../../api/highlights.api';
import Button from '../../ui/Button';
import { useReorder } from './useReorder';

interface HighlightGridProps {
  highlights: HighlightSummary[];
  onOpen: (id: string) => void;
  onCreate: (title: string) => Promise<void>;
  onReorder: (next: HighlightSummary[]) => void;
}

/** Screen 1: the client's highlights as circles (cover, title, image count), plus "new highlight". */
export const HighlightGrid = ({ highlights, onOpen, onCreate, onReorder }: HighlightGridProps) => {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { dragProps, dragIndex, overIndex, move } = useReorder(highlights, onReorder);

  const submit = async () => {
    const clean = title.trim();
    if (!clean || creating) return;
    setCreating(true);
    try {
      await onCreate(clean);
      setAdding(false);
      setTitle('');
    } finally {
      setCreating(false);
    }
  };

  const full = highlights.length >= MAX_HIGHLIGHTS;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-6 rounded-xl border border-edge bg-surface-alt p-4">
        {highlights.map((highlight, index) => (
          <div
            key={highlight.id}
            {...dragProps(index)}
            className={`flex w-24 flex-col items-center gap-1.5 rounded-lg p-1 transition ${
              dragIndex === index ? 'opacity-40' : ''
            } ${overIndex === index && dragIndex !== null && dragIndex !== index ? 'bg-accent/10 ring-1 ring-accent' : ''}`}
          >
            <button
              type="button"
              onClick={() => onOpen(highlight.id)}
              aria-label={`${highlight.title} highlight-ını aç`}
              className="group flex flex-col items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-edge bg-surface shadow-sm transition group-hover:border-accent">
                {highlight.coverUrl ? (
                  <img src={highlight.coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <ImageIcon size={20} className="text-faint" aria-hidden="true" />
                )}
              </span>
              <span className="w-full truncate text-center text-xs font-medium text-body" title={highlight.title}>
                {highlight.title}
              </span>
              <span className="text-xs text-muted">{highlight.itemCount} şəkil</span>
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`${highlight.title}: sola çək`}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-surface text-muted transition hover:text-heading disabled:opacity-30"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === highlights.length - 1}
                aria-label={`${highlight.title}: sağa çək`}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-surface text-muted transition hover:text-heading disabled:opacity-30"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        {!full && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-24 flex-col items-center gap-1.5 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-muted transition hover:border-accent hover:text-accent">
              <Plus size={22} aria-hidden="true" />
            </span>
            <span className="w-full text-center text-xs font-medium text-body">Yeni highlight</span>
          </button>
        )}

        {!full && adding && (
          <form
            className="flex w-full flex-wrap items-end gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="flex flex-col gap-1 text-sm text-muted">
              Başlıq yazın (müştəri bunu dairənin altında görəcək)
              <input
                autoFocus
                type="text"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Məsələn: Menyu"
                className="h-10 w-64 max-w-full rounded-lg border border-field-border bg-surface px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <Button type="submit" disabled={!title.trim() || creating}>
              {creating ? <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" /> : null}
              Yarat
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setTitle('');
              }}
              disabled={creating}
            >
              Ləğv et
            </Button>
          </form>
        )}

        {highlights.length === 0 && !adding && (
          <p className="basis-full text-sm text-muted">
            Bu müştərinin hələ highlight-ı yoxdur. "Yeni highlight" ilə başlayın.
          </p>
        )}
      </div>

      {full && <p className="text-sm text-muted">Bir müştəridə ən çox {MAX_HIGHLIGHTS} highlight ola bilər.</p>}
      <p className="text-sm text-muted">
        Dəyişdirmək üçün highlight-a basın. Sıranı dəyişmək üçün sürüşdürün və ya ox düymələrindən istifadə edin. Dəyişikliklər avtomatik yadda saxlanır.
      </p>
    </div>
  );
};
