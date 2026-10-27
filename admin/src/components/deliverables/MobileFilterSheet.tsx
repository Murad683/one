import { useCallback, useRef, useState } from 'react';
import { ListFilter } from 'lucide-react';
import Button from '../ui/Button';
import type { ComboboxOption } from '../ui/Combobox';
import Input from '../ui/Input';
import Popover from '../ui/Popover';
import Select from '../ui/Select';
import { SORT_OPTIONS, bakuDay, type DeliverableFilters } from '../../lib/deliverableList';

interface Props {
  filters: DeliverableFilters;
  onFiltersChange: (patch: Partial<DeliverableFilters>) => void;
  onClearFilters: () => void;
  sort: string;
  onSortChange: (value: string) => void;
  clients: ComboboxOption[];
  categories: { id: string; name: string }[];
  statusLabels: Record<string, string>;
  activeCount: number;
}

const checkboxClass = 'h-4 w-4 rounded border-field-border text-blue-600 focus:ring-blue-600';

/**
 * Phones hide most columns (and with them the sortable headers), so one button next
 * to the search opens every sort and filter option in a bottom sheet.
 */
export const MobileFilterSheet = ({
  filters,
  onFiltersChange,
  onClearFilters,
  sort,
  onSortChange,
  clients,
  categories,
  statusLabels,
  activeCount,
}: Props) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const clientOptions = [{ value: '', label: 'Hamısı' }, ...clients.map((c) => ({ value: c.value, label: c.label }))];
  const categoryOptions = [
    { value: '', label: 'Hamısı' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
    { value: 'none', label: 'Növ yoxdur' },
  ];
  const statusOptions = [{ value: '', label: 'Hamısı' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))];
  const range = (from: string, to: string) => onFiltersChange({ from, to });

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-field-border bg-field px-3 text-sm font-medium text-heading sm:hidden"
      >
        <ListFilter className="h-4 w-4" />
        Filtr / Sırala
        {activeCount > 0 && (
          <span className="rounded-full bg-blue-600 px-1.5 text-[10px] leading-4 text-white">{activeCount}</span>
        )}
      </button>
      <Popover open={open} onClose={close} anchorRef={anchorRef} title="Filtr / Sırala">
        <div className="space-y-3">
          <Select label="Sıralama" value={sort} onChange={(event) => onSortChange(event.target.value)} options={SORT_OPTIONS} />
          <Select label="Müştəri" value={filters.clientId} onChange={(event) => onFiltersChange({ clientId: event.target.value })} options={clientOptions} />
          <Select label="Növ" value={filters.categoryId} onChange={(event) => onFiltersChange({ categoryId: event.target.value })} options={categoryOptions} />
          <Select label="Status" value={filters.status} onChange={(event) => onFiltersChange({ status: event.target.value })} options={statusOptions} />
          <Input label="Ay / İl (iş ayı)" type="month" value={filters.month} onChange={(event) => onFiltersChange({ month: event.target.value })} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-body">Əlavə olunub</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => range(bakuDay(0), bakuDay(0))}>Bu gün</Button>
              <Button variant="secondary" size="sm" onClick={() => range(bakuDay(-6), bakuDay(0))}>Son 7 gün</Button>
              <Button variant="secondary" size="sm" onClick={() => range(`${bakuDay(0).slice(0, 7)}-01`, bakuDay(0))}>Bu ay</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Dan" type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => onFiltersChange({ from: event.target.value })} />
              <Input label="A" type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => onFiltersChange({ to: event.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" className={checkboxClass} checked={filters.stale} onChange={(event) => onFiltersChange({ stale: event.target.checked })} />
            Gözləmədə qalıb (2 saatdan çox)
          </label>
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" className={checkboxClass} checked={filters.hasFeedback} onChange={(event) => onFiltersChange({ hasFeedback: event.target.checked })} />
            Müştəri rəyi var
          </label>
          <div className="flex justify-between gap-2 border-t border-edge pt-3">
            <Button variant="ghost" size="sm" onClick={onClearFilters} disabled={activeCount === 0}>Təmizlə</Button>
            <Button size="sm" onClick={close}>Hazırdır</Button>
          </div>
        </div>
      </Popover>
    </>
  );
};

export default MobileFilterSheet;
