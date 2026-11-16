import React from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  keyExtractor: (row: T, index: number) => string | number;
  loading?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  loading = false,
  compact = false,
  emptyMessage = 'No records available for the selected filters.',
}: DataTableProps<T>) {
  const cellPy = compact ? 'py-2' : 'py-2.5';

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-full rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${cellPy} px-3 whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
          {rows.map((row, idx) => (
            <tr
              key={keyExtractor(row, idx)}
              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${cellPy} px-3 whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right font-mono tabular-nums text-slate-800 dark:text-slate-200'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
