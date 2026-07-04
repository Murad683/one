import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  hideOnMobile?: boolean;
}

interface TableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  rowClassName?: (row: T) => string;
}

export const Table = <T extends object>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found.',
  rowClassName,
}: TableProps<T>) => (
  <div className="overflow-hidden rounded-xl border border-edge bg-surface">
    <div className="overflow-x-auto scrollbar-minimal">
      <table className="min-w-full divide-y divide-edge text-left text-sm">
        <thead className="bg-surface-alt">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={[
                  'px-3 sm:px-4 py-3 font-semibold text-body whitespace-nowrap text-xs sm:text-sm',
                  column.hideOnMobile ? 'hidden sm:table-cell' : '',
                ].join(' ')}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge-light">
          {isLoading &&
            Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`loading-${rowIndex}`}>
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={[
                      'px-3 sm:px-4 py-3',
                      column.hideOnMobile ? 'hidden sm:table-cell' : '',
                    ].join(' ')}
                  >
                    <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 sm:px-4 py-8 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!isLoading &&
            data.map((row, rowIndex) => (
              <tr key={String((row as any).id ?? rowIndex)} className={`hover:bg-surface-hover transition-colors ${rowClassName ? rowClassName(row) : ''}`}>
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={[
                      'px-3 sm:px-4 py-3 text-body',
                      column.hideOnMobile ? 'hidden sm:table-cell' : '',
                    ].join(' ')}
                  >
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
