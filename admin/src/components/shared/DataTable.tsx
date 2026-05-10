import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyState?: React.ReactNode;
}

const DataTable = <T extends { id: string }>({
  columns,
  data,
  isLoading,
  onEdit,
  onDelete,
  emptyState,
}: DataTableProps<T>) => {
  const showActions = !!(onEdit || onDelete);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              {showActions && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-gray-50 last:border-0">
                  {columns.map((column, j) => (
                    <td key={`skeleton-cell-${i}-${j}`} className="px-4 py-3.5">
                      <div
                        className="h-4 animate-pulse rounded bg-gray-100"
                        style={{ width: column.width || `${Math.floor(Math.random() * 40) + 40}%` }}
                      />
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <div className="h-8 w-8 animate-pulse rounded bg-gray-100" />
                        <div className="h-8 w-8 animate-pulse rounded bg-gray-100" />
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-4 py-8">
                  {emptyState || (
                    <div className="text-center text-sm text-gray-500">No data available</div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50/50 last:border-0"
                >
                  {columns.map((col) => (
                    <td key={`${row.id}-${col.key}`} className="px-4 py-3.5 text-sm text-gray-700">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="danger" size="sm" onClick={() => onDelete(row)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
