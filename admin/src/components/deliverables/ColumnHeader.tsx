import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter } from 'lucide-react';
import Popover from '../ui/Popover';
import type { SortOrder } from '../../lib/deliverableList';

interface SortHeaderProps {
  label: string;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
}

/** Column title that sorts the table when clicked; the arrow shows the current direction. */
export const SortHeader = ({ label, active, order, onClick }: SortHeaderProps) => (
  <button
    type="button"
    onClick={onClick}
    title={active ? `${label}: ${order === 'asc' ? 'artan' : 'azalan'} sıra, tərsinə çevirmək üçün basın` : `${label} üzrə sırala`}
    className={`group inline-flex items-center gap-1 text-xs font-medium transition-colors ${
      active ? 'text-heading' : 'text-muted hover:text-heading'
    }`}
  >
    {label}
    {active ? (
      order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
    ) : (
      <ArrowUpDown className="h-3 w-3 opacity-30 transition-opacity group-hover:opacity-70" />
    )}
  </button>
);

interface ColumnFilterProps {
  /** Column name, used for the accessible label ("Status filtri"). */
  label: string;
  /** True while this column has a filter applied: the icon turns blue. */
  active: boolean;
  width?: number;
  /** Panel content; call `close` to dismiss after a pick. */
  children: (close: () => void) => ReactNode;
}

/** The light funnel icon next to a column title and the popover it opens. */
export const ColumnFilter = ({ label, active, width, children }: ColumnFilterProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`${label} filtri`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={active ? `${label} filtri aktivdir` : `${label} üzrə süz`}
        className={`rounded p-0.5 transition-colors ${active ? 'text-blue-600' : 'text-faint hover:text-heading'}`}
      >
        <ListFilter className="h-3.5 w-3.5" />
      </button>
      <Popover open={open} onClose={close} anchorRef={anchorRef} title={`${label} filtri`} width={width}>
        {children(close)}
      </Popover>
    </>
  );
};
