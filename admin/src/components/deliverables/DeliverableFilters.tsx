import React from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { DELIVERABLE_STATUS_CONFIG, MONTH_LABELS } from '@/utils/deliverable.helpers';

export interface DeliverableFilterParams {
  clientId?: string;
  year?: number;
  month?: number;
  status?: string;
}

interface DeliverableFiltersProps {
  filters: DeliverableFilterParams;
  onChange: (filters: DeliverableFilterParams) => void;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

const DeliverableFilters: React.FC<DeliverableFiltersProps> = ({ filters, onChange }) => {
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleClear = () => {
    onChange({});
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-surface p-3 shadow-sm">
      <input
        type="text"
        placeholder="Filter by client ID..."
        value={filters.clientId || ''}
        onChange={(e) => onChange({ ...filters, clientId: e.target.value || undefined })}
        className="w-52 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />

      <select
        value={filters.year || ''}
        onChange={(e) =>
          onChange({ ...filters, year: e.target.value ? Number(e.target.value) : undefined })
        }
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      >
        <option value="">All Years</option>
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        value={filters.month || ''}
        onChange={(e) =>
          onChange({ ...filters, month: e.target.value ? Number(e.target.value) : undefined })
        }
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      >
        <option value="">All Months</option>
        {MONTH_LABELS.map((m, i) => (
          <option key={i + 1} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      >
        <option value="">All Statuses</option>
        {Object.entries(DELIVERABLE_STATUS_CONFIG).map(([key, { label }]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="ml-auto !text-muted">
          <X className="mr-1 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
};

export default DeliverableFilters;
