import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export const Table = <T extends object>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found.',
}: TableProps<T>) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading &&
            Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`loading-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!isLoading &&
            data.map((row, rowIndex) => (
              <tr key={String((row as any).id ?? rowIndex)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {column.render ? column.render(row) : String((row as any)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Table;
