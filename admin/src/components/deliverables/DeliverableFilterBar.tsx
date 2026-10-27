import { useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import Button from '../ui/Button';
import Combobox from '../ui/Combobox';
import type { ComboboxOption } from '../ui/Combobox';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  PAGE_SIZES,
  SORT_OPTIONS,
  bakuDay,
  countActiveFilters,
  type DeliverableFilters as Filters,
} from '../../lib/deliverableList';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
  sort: string;
  onSortChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  clients: ComboboxOption[];
  categories: { id: string; name: string }[];
  statusLabels: Record<string, string>;
  isCreator: boolean;
}

const checkboxClass = 'h-4 w-4 rounded border-field-border text-blue-600 focus:ring-blue-600';

/**
 * Compact filter bar for the deliverables table: search + sort + page size on the
 * first row, the common filters below, the rest behind "Daha çox filtr".
 */
export const DeliverableFilterBar = ({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onClear,
  sort,
  onSortChange,
  pageSize,
  onPageSizeChange,
  clients,
  categories,
  statusLabels,
  isCreator,
}: Props) => {
  const advancedActive = Boolean(filters.from || filters.to || filters.stale || filters.hasFeedback);
  const [showMore, setShowMore] = useState(advancedActive);
  const activeCount = countActiveFilters(filters);
  const anyActive = activeCount > 0 || Boolean(search);

  const clientOptions: ComboboxOption[] = [{ value: '', label: 'Hamısı' }, ...clients];
  const categoryOptions = [
    { value: '', label: 'Hamısı' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
    { value: 'none', label: 'Növ yoxdur' },
  ];
  const statusOptions = [
    { value: '', label: 'Hamısı' },
    ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
  ];

  const setRange = (from: string, to: string) => onFiltersChange({ from, to });

  return (
    <div className="space-y-3 rounded-xl border border-edge bg-surface-alt p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-faint" />
          </div>
          <Input
            placeholder={isCreator ? 'Müştəri adı və ya başlıq ilə axtarın...' : 'Müştəri, e-poçt və ya başlıq ilə axtarın...'}
            className="pl-10"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Axtarış"
          />
        </div>
        <Select
          label="Sıralama"
          className="lg:w-60"
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          options={SORT_OPTIONS}
        />
        <Select
          label="Sətir sayı"
          className="lg:w-32"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
          options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Combobox
          label="Müştəri"
          options={clientOptions}
          value={filters.clientId}
          onChange={(value) => onFiltersChange({ clientId: value })}
          placeholder="Hamısı"
        />
        <Select
          label="Növ"
          value={filters.categoryId}
          onChange={(event) => onFiltersChange({ categoryId: event.target.value })}
          options={categoryOptions}
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(event) => onFiltersChange({ status: event.target.value })}
          options={statusOptions}
        />
        <Input
          label="Ay / İl (iş ayı)"
          type="month"
          value={filters.month}
          onChange={(event) => onFiltersChange({ month: event.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          aria-expanded={showMore}
        >
          Daha çox filtr
          {advancedActive && <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">aktiv</span>}
          <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>
        {anyActive && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 h-4 w-4" />
            Təmizlə{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
        )}
      </div>

      {showMore && (
        <div className="space-y-3 border-t border-edge pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Əlavə olunma tarixi: dan"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => onFiltersChange({ from: event.target.value })}
            />
            <Input
              label="Əlavə olunma tarixi: a"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => onFiltersChange({ to: event.target.value })}
            />
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
              <Button variant="secondary" size="sm" onClick={() => setRange(bakuDay(0), bakuDay(0))}>
                Bu gün
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setRange(bakuDay(-6), bakuDay(0))}>
                Son 7 gün
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setRange(`${bakuDay(0).slice(0, 7)}-01`, bakuDay(0))}>
                Bu ay
              </Button>
              {(filters.from || filters.to) && (
                <Button variant="ghost" size="sm" onClick={() => setRange('', '')}>
                  Tarixi sil
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={filters.stale}
                onChange={(event) => onFiltersChange({ stale: event.target.checked })}
              />
              Gözləmədə qalıb (2 saatdan çox)
            </label>
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={filters.hasFeedback}
                onChange={(event) => onFiltersChange({ hasFeedback: event.target.checked })}
              />
              Müştəri rəyi var
            </label>
          </div>
          <p className="text-xs text-muted">
            Tarix filtri faylın sistemə əlavə olunduğu günə görədir (Bakı vaxtı). Ay / İl isə fayl üçün seçilən iş ayıdır.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeliverableFilterBar;
