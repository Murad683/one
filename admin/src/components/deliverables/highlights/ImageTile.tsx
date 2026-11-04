import { useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Download, Loader2, MoreHorizontal, RotateCw, Star, Trash2, X } from 'lucide-react';
import Popover from '../../ui/Popover';
import type { DraftItem } from './useHighlightDraft';

interface ImageTileProps {
  item: DraftItem;
  index: number;
  isCover: boolean;
  onCover: () => void;
  onRemove: () => void;
  onRetry: () => void;
}

const MenuButton = ({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-surface-hover ${
      danger ? 'text-red-500' : 'text-heading'
    }`}
  >
    {children}
  </button>
);

/** One image of the draft: order number, "Kover" badge, a ⋯ menu, and upload progress while it is new. */
export const ImageTile = ({ item, index, isCover, onCover, onRemove, onRetry }: ImageTileProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const src = item.kind === 'saved' ? item.url : item.preview;
  const waiting = item.kind === 'new' && (item.status === 'queued' || item.status === 'uploading');
  const failed = item.kind === 'new' && item.status === 'error';
  const canBeCover = !isCover && !waiting && !failed;
  // Only images already saved can be downloaded (a new one is still a draft).
  const downloadUrl = item.kind === 'saved' ? item.downloadUrl : null;

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-edge bg-surface-alt shadow-sm">
      {src && <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />}

      <span className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/60 px-1.5 text-xs font-semibold text-white">
        {index + 1}
      </span>

      {isCover && !failed && (
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white shadow">
          Kover
        </span>
      )}

      {!failed && (
        <>
          <button
            ref={anchor}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`${index + 1}-ci şəkil: əməliyyatlar`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
          <Popover open={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={anchor} title={`${index + 1}-ci şəkil`} width={190}>
            <div role="menu" className="-m-1 flex flex-col">
              {canBeCover && (
                <MenuButton
                  onClick={() => {
                    setMenuOpen(false);
                    onCover();
                  }}
                >
                  <Star size={16} aria-hidden="true" />
                  Kover et
                </MenuButton>
              )}
              {downloadUrl && (
                <MenuButton
                  onClick={() => {
                    setMenuOpen(false);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download size={16} aria-hidden="true" />
                  Yüklə
                </MenuButton>
              )}
              <MenuButton
                danger
                onClick={() => {
                  setMenuOpen(false);
                  onRemove();
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                Sil
              </MenuButton>
            </div>
          </Popover>
        </>
      )}

      {waiting && item.kind === 'new' && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-black/55 p-2 text-white">
          <span className="flex items-center gap-1.5 text-xs">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            {item.status === 'queued' ? 'Növbədə…' : 'Yüklənir…'}
          </span>
          <span className="h-1 overflow-hidden rounded-full bg-white/30">
            <span
              className="block h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.round((item.status === 'queued' ? 0 : item.progress) * 100)}%` }}
            />
          </span>
        </div>
      )}

      {failed && item.kind === 'new' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/80 p-2 text-center text-white">
          <AlertCircle size={20} aria-hidden="true" />
          <span className="line-clamp-3 text-xs">{item.message}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs font-medium hover:bg-white/30"
            >
              <RotateCw size={12} aria-hidden="true" />
              Yenidən
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs font-medium hover:bg-white/30"
            >
              <X size={12} aria-hidden="true" />
              Çıxar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageTile;
