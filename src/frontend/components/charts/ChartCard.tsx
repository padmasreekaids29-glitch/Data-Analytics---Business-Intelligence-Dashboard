import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  heightClass?: string;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  rightSlot,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No records match the active filter criteria.',
  heightClass = 'h-72',
  children,
}: ChartCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>

      <div className={`relative w-full ${heightClass}`}>
        {loading ? (
          <div className="w-full h-full rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        ) : isEmpty ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg px-4 text-center">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
