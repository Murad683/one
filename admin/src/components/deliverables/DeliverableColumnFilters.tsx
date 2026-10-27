import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import Button from '../ui/Button';
import type { ComboboxOption } from '../ui/Combobox';
import Input from '../ui/Input';
import { bakuDay, type DeliverableFilters } from '../../lib/deliverableList';

type Patch = (patch: Partial<DeliverableFilters>) => void;

const checkboxClass = 'h-4 w-4 rounded border-field-border text-blue-600 focus:ring-blue-600';

interface OptionRowProps {
  label: string;
  subLabel?: string;
  selected: boolean;
  onClick: () => void;
}

const OptionRow = ({ label, subLabel, selected, onClick }: OptionRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-alt ${
      selected ? 'bg-surface-alt' : ''
    }`}
  >
    <span className="min-w-0">
      <span className="block truncate text-sm text-heading">{label}</span>
      {subLabel && <span className="block truncate text-xs text-faint">{subLabel}</span>}
    </span>
    {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
  </button>
);

/* ── Müştəri ─────────────────────────────────────────────── */
export const ClientFilterPanel = ({
  clients,
  value,
  onChange,
  close,
}: {
  clients: ComboboxOption[];
  value: string;
  onChange: Patch;
  close: () => void;
}) => {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = clients.filter(
    (c) => !needle || c.label.toLowerCase().includes(needle) || (c.subLabel ?? '').toLowerCase().includes(needle),
  );
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Müştəri axtarın..."
          className="w-full rounded-lg border border-field-border bg-field py-2 pl-8 pr-3 text-sm text-heading outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div className="max-h-56 overflow-y-auto scrollbar-minimal">
        <OptionRow label="Hamısı" selected={!value} onClick={() => { onChange({ clientId: '' }); close(); }} />
        {shown.map((c) => (
          <OptionRow
            key={c.value}
            label={c.label}
            subLabel={c.subLabel}
            selected={value === c.value}
            onClick={() => { onChange({ clientId: c.value }); close(); }}
          />
        ))}
        {shown.length === 0 && <p className="px-2.5 py-3 text-center text-sm text-muted">Müştəri tapılmadı</p>}
      </div>
    </div>
  );
};

/* ── Növ ─────────────────────────────────────────────────── */
export const CategoryFilterPanel = ({
  categories,
  value,
  onChange,
  close,
}: {
  categories: { id: string; name: string }[];
  value: string;
  onChange: Patch;
  close: () => void;
}) => {
  const pick = (categoryId: string) => { onChange({ categoryId }); close(); };
  return (
    <div className="max-h-64 overflow-y-auto scrollbar-minimal">
      <OptionRow label="Hamısı" selected={!value} onClick={() => pick('')} />
      {categories.map((c) => (
        <OptionRow key={c.id} label={c.name} selected={value === c.id} onClick={() => pick(c.id)} />
      ))}
      <OptionRow label="Növ yoxdur" selected={value === 'none'} onClick={() => pick('none')} />
    </div>
  );
};

/* ── Status (+ "Gözləmədə qalıb", "Müştəri rəyi var") ───────── */
export const StatusFilterPanel = ({
  statusLabels,
  filters,
  onChange,
  close,
}: {
  statusLabels: Record<string, string>;
  filters: Pick<DeliverableFilters, 'status' | 'stale' | 'hasFeedback'>;
  onChange: Patch;
  close: () => void;
}) => (
  <div className="space-y-2">
    <div>
      <OptionRow label="Hamısı" selected={!filters.status} onClick={() => { onChange({ status: '' }); close(); }} />
      {Object.entries(statusLabels).map(([value, label]) => (
        <OptionRow
          key={value}
          label={label}
          selected={filters.status === value}
          onClick={() => { onChange({ status: value }); close(); }}
        />
      ))}
    </div>
    <div className="space-y-2 border-t border-edge pt-2">
      <label className="flex items-center gap-2 px-2.5 text-sm text-body">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={filters.stale}
          onChange={(event) => onChange({ stale: event.target.checked })}
        />
        Gözləmədə qalıb (2 saatdan çox)
      </label>
      <label className="flex items-center gap-2 px-2.5 text-sm text-body">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={filters.hasFeedback}
          onChange={(event) => onChange({ hasFeedback: event.target.checked })}
        />
        Müştəri rəyi var
      </label>
    </div>
  </div>
);

/* ── Ay / İl (iş ayı) ────────────────────────────────────── */
export const MonthFilterPanel = ({ value, onChange, close }: { value: string; onChange: Patch; close: () => void }) => (
  <div className="space-y-3">
    <Input label="Ay / İl (iş ayı)" type="month" value={value} onChange={(event) => onChange({ month: event.target.value })} />
    <div className="flex justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={() => { onChange({ month: '' }); close(); }} disabled={!value}>
        Təmizlə
      </Button>
      <Button size="sm" onClick={close}>Hazırdır</Button>
    </div>
  </div>
);

/* ── Əlavə olunub (tarix aralığı) ────────────────────────── */
export const AddedFilterPanel = ({
  from,
  to,
  onChange,
  close,
}: {
  from: string;
  to: string;
  onChange: Patch;
  close: () => void;
}) => {
  const range = (a: string, b: string) => onChange({ from: a, to: b });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => range(bakuDay(0), bakuDay(0))}>Bu gün</Button>
        <Button variant="secondary" size="sm" onClick={() => range(bakuDay(-6), bakuDay(0))}>Son 7 gün</Button>
        <Button variant="secondary" size="sm" onClick={() => range(`${bakuDay(0).slice(0, 7)}-01`, bakuDay(0))}>Bu ay</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Dan" type="date" value={from} max={to || undefined} onChange={(event) => onChange({ from: event.target.value })} />
        <Input label="A" type="date" value={to} min={from || undefined} onChange={(event) => onChange({ to: event.target.value })} />
      </div>
      <p className="text-xs text-muted">Faylın sistemə əlavə olunduğu günə görə (Bakı vaxtı).</p>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => { range('', ''); close(); }} disabled={!from && !to}>
          Təmizlə
        </Button>
        <Button size="sm" onClick={close}>Hazırdır</Button>
      </div>
    </div>
  );
};
