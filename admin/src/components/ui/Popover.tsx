import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The element the popover hangs from (the filter icon). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Accessible name; also shown as the title on the phone sheet. */
  title: string;
  /** Width on desktop, in px. */
  width?: number;
  children: ReactNode;
}

const SM_BREAKPOINT = 640;
const GAP = 6;
const EDGE = 8;

/**
 * Small floating panel for column filters. Rendered in a portal with
 * `position: fixed`: the table sits in an `overflow-hidden` wrapper that would
 * clip a normally positioned dropdown. On phones it becomes a bottom sheet.
 * Closes on Escape, an outside click, or when the page/table scrolls.
 */
export const Popover = ({ open, onClose, anchorRef, title, width = 280, children }: PopoverProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const isSheet = () => window.innerWidth < SM_BREAKPOINT;

  // Position imperatively (no state): measure the anchor, keep the panel inside the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const place = () => {
      if (isSheet()) {
        // Bottom sheet: the classes position it, drop any desktop coordinates.
        ['left', 'top', 'bottom', 'width', 'maxHeight'].forEach((prop) => panel.style.removeProperty(prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)));
        panel.style.visibility = 'visible';
        return;
      }
      const rect = anchor.getBoundingClientRect();
      panel.style.width = `${width}px`;
      const panelHeight = panel.offsetHeight;
      let left = rect.left;
      if (left + width > window.innerWidth - EDGE) left = Math.max(EDGE, rect.right - width);
      const below = window.innerHeight - rect.bottom - GAP - EDGE;
      const above = rect.top - GAP - EDGE;
      const flipUp = panelHeight > below && above > below;
      panel.style.left = `${left}px`;
      panel.style.top = flipUp ? '' : `${rect.bottom + GAP}px`;
      panel.style.bottom = flipUp ? `${window.innerHeight - rect.top + GAP}px` : '';
      panel.style.maxHeight = `${Math.max(160, flipUp ? above : below)}px`;
      panel.style.visibility = 'visible';
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        anchor?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    // A scrolling page or table would leave the fixed panel floating in the wrong place.
    const onScroll = (event: Event) => {
      if (isSheet()) return;
      if (panelRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[59] bg-black/40 sm:hidden" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={title}
        style={{ visibility: 'hidden' }}
        className="fixed z-[60] overflow-y-auto rounded-xl border border-edge bg-surface p-3 text-sm shadow-xl
                   max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:max-h-[80vh] max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:p-4"
      >
        <p className="mb-2 text-sm font-semibold text-heading sm:hidden">{title}</p>
        {children}
      </div>
    </>,
    document.body,
  );
};

export default Popover;
