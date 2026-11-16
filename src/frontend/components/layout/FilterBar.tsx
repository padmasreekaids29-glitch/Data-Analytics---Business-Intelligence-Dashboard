import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { DashboardFilters, FilterOptions } from '../../types/index.ts';

interface FilterBarProps {
  filters: DashboardFilters;
  options: FilterOptions;
  onChange: (next: DashboardFilters) => void;
  onReset: () => void;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function FilterBar({ filters, options, onChange, onReset }: FilterBarProps) {
  const update = (key: keyof DashboardFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Boolean(
    filters.startDate ||
      filters.endDate ||
      filters.year ||
      filters.month ||
      filters.categoryId ||
      filters.region ||
      filters.customerId
  );

  const inputClass =
    'h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600/40 focus:border-violet-600';

  return (
    <section
      aria-label="Analytics Filters"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-4 no-print"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <SlidersHorizontal className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span>Filter Dataset</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Start Date
          </span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => update('startDate', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            End Date
          </span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => update('endDate', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Fiscal Year
          </span>
          <select
            value={filters.year}
            onChange={(e) => update('year', e.target.value)}
            className={inputClass}
          >
            <option value="">All Years</option>
            {options.years.map((y) => (
              <option key={y} value={y}>
                FY {y}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Month
          </span>
          <select
            value={filters.month}
            onChange={(e) => update('month', e.target.value)}
            className={inputClass}
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Product Category
          </span>
          <select
            value={filters.categoryId}
            onChange={(e) => update('categoryId', e.target.value)}
            className={inputClass}
          >
            <option value="">All Categories</option>
            {options.categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Region
          </span>
          <select
            value={filters.region}
            onChange={(e) => update('region', e.target.value)}
            className={inputClass}
          >
            <option value="">All Regions</option>
            {options.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Customer
          </span>
          <select
            value={filters.customerId}
            onChange={(e) => update('customerId', e.target.value)}
            className={inputClass}
          >
            <option value="">All Customers</option>
            {options.customers.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.company})
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
