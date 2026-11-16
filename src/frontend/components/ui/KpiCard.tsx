import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { SparklineChart } from '../charts/SparklineChart.tsx';

interface KpiCardProps {
  label: string;
  value: string;
  deltaPct?: number;
  deltaContext?: string;
  sparkline?: number[];
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  deltaPct,
  deltaContext = 'vs prior period',
  sparkline,
  loading = false,
}: KpiCardProps) {
  const isPositive = typeof deltaPct === 'number' && deltaPct > 0;
  const isNegative = typeof deltaPct === 'number' && deltaPct < 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5 flex flex-col justify-between gap-3 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-28 mt-1.5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-mono tabular-nums tracking-tight mt-1">
              {value}
            </p>
          )}
        </div>
        {!loading && sparkline && sparkline.length >= 2 && (
          <div className="w-20 h-10 shrink-0">
            <SparklineChart values={sparkline} positive={!isNegative} />
          </div>
        )}
      </div>

      {typeof deltaPct === 'number' && !loading && (
        <div className="flex items-center gap-1.5 text-xs">
          {isPositive ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              +{deltaPct}%
            </span>
          ) : isNegative ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-rose-700 dark:text-rose-400 tabular-nums">
              <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
              {deltaPct}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 font-medium text-slate-600 dark:text-slate-400 tabular-nums">
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              0.0%
            </span>
          )}
          <span className="text-slate-400 dark:text-slate-500">·</span>
          <span className="text-slate-500 dark:text-slate-400 truncate">{deltaContext}</span>
        </div>
      )}
    </div>
  );
}
