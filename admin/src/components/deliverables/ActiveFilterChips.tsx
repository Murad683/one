import { X } from 'lucide-react';
import type { DeliverableFilters, FilterChip } from '../../lib/deliverableList';

interface Props {
  chips: FilterChip[];
  onClearOne: (patch: Partial<DeliverableFilters>) => void;
  onClearAll: () => void;
}

/** Active filters as small removable chips. Renders nothing when no filter is set. */
export const ActiveFilterChips = ({ chips, onClearOne, onClearAll }: Props) => {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs text-body ring-1 ring-edge"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onClearOne(chip.clear)}
            aria-label={`${chip.label} filtrini sil`}
            className="rounded-full p-0.5 text-faint hover:text-heading"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="text-xs font-medium text-blue-600 hover:text-blue-700">
        Hamısını təmizlə
      </button>
    </div>
  );
};

export default ActiveFilterChips;
