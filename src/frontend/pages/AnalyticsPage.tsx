import { useEffect, useState } from 'react';
import { api } from '../lib/api.ts';
import { formatCurrency } from '../lib/exportUtils.ts';
import { FilterBar } from '../components/layout/FilterBar.tsx';
import { KpiCard } from '../components/ui/KpiCard.tsx';
import { DataTable, type ColumnDef } from '../components/ui/DataTable.tsx';
import { ChartCard } from '../components/charts/ChartCard.tsx';
import { YoYComparisonChart } from '../components/charts/YoYComparisonChart.tsx';
import { CategorySalesChart } from '../components/charts/CategorySalesChart.tsx';
import { ProfitLossChart } from '../components/charts/ProfitLossChart.tsx';
import type {
  DashboardFilters,
  DeepAnalyticsResponse,
  OverviewResponse,
} from '../types/index.ts';

interface AnalyticsPageProps {
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
  onResetFilters: () => void;
  currency: string;
  compactTables: boolean;
}

export function AnalyticsPage({
  filters,
  onFiltersChange,
  onResetFilters,
  currency,
  compactTables,
}: AnalyticsPageProps) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [deep, setDeep] = useState<DeepAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([api.getOverview(filters), api.getDeepAnalytics(filters)])
      .then(([ovRes, deepRes]) => {
        if (!active) return;
        setOverview(ovRes);
        setDeep(deepRes);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load analytics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const productCols: ColumnDef<DeepAnalyticsResponse['productPerformance'][number]>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {p.sku} · {p.category}
          </p>
        </div>
      ),
    },
    {
      key: 'units',
      header: 'Units Sold',
      align: 'right',
      render: (p) => p.unitsSold.toLocaleString(),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      render: (p) => formatCurrency(p.revenue, currency),
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      render: (p) => formatCurrency(p.cost, currency),
    },
    {
      key: 'profit',
      header: 'Net Profit',
      align: 'right',
      render: (p) => formatCurrency(p.profit, currency),
    },
    {
      key: 'margin',
      header: 'Gross Margin',
      align: 'right',
      render: (p) => (
        <span
          className={`font-semibold ${
            p.marginPct >= 40
              ? 'text-emerald-700 dark:text-emerald-400'
              : p.marginPct >= 25
                ? 'text-slate-800 dark:text-slate-200'
                : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {p.marginPct}%
        </span>
      ),
    },
  ];

  const customerCols: ColumnDef<DeepAnalyticsResponse['topCustomers'][number]>[] = [
    {
      key: 'name',
      header: 'Account Lead',
      render: (c) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{c.company || c.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {c.name} · {c.region}
          </p>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      render: (c) => <span className="text-xs">{c.segment}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (c) => c.orders.toLocaleString(),
    },
    {
      key: 'revenue',
      header: 'Lifetime Revenue',
      align: 'right',
      render: (c) => formatCurrency(c.revenue, currency),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (c) => formatCurrency(c.profit, currency),
    },
  ];

  const yoyCols: ColumnDef<DeepAnalyticsResponse['yearlyPerformance'][number]>[] = [
    {
      key: 'year',
      header: 'Fiscal Year',
      render: (y) => <span className="font-semibold">FY {y.year}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (y) => y.orders.toLocaleString(),
    },
    {
      key: 'revenue',
      header: 'Annual Revenue',
      align: 'right',
      render: (y) => formatCurrency(y.revenue, currency),
    },
    {
      key: 'profit',
      header: 'Annual Profit',
      align: 'right',
      render: (y) => formatCurrency(y.profit, currency),
    },
    {
      key: 'margin',
      header: 'Margin %',
      align: 'right',
      render: (y) => `${y.marginPct}%`,
    },
    {
      key: 'growth',
      header: 'YoY Growth',
      align: 'right',
      render: (y) =>
        y.yoyGrowthPct === null ? (
          <span className="text-slate-400">Baseline</span>
        ) : (
          <span
            className={
              y.yoyGrowthPct >= 0
                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'text-rose-700 dark:text-rose-400 font-semibold'
            }
          >
            {y.yoyGrowthPct > 0 ? '+' : ''}
            {y.yoyGrowthPct}%
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        filters={filters}
        options={
          overview?.filterOptions || {
            categories: [],
            regions: [],
            customers: [],
            years: [],
          }
        }
        onChange={onFiltersChange}
        onReset={onResetFilters}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Analytics KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Analyzed Revenue"
          value={deep ? formatCurrency(deep.summary.totalRevenue, currency) : '$0'}
          deltaPct={overview?.kpis.revenueGrowthPct}
          sparkline={overview?.kpiSparklines.revenue}
          loading={loading}
        />
        <KpiCard
          label="Average Sales per Order"
          value={deep ? formatCurrency(deep.summary.averageSalesPerOrder, currency) : '$0'}
          deltaPct={overview?.kpis.ordersGrowthPct}
          deltaContext="order ticket average"
          sparkline={overview?.kpiSparklines.aov}
          loading={loading}
        />
        <KpiCard
          label="Gross Profit Margin"
          value={deep ? `${deep.summary.profitMarginPct}%` : '0.0%'}
          deltaPct={overview?.kpis.profitGrowthPct}
          deltaContext="profitability ratio"
          sparkline={overview?.kpiSparklines.profit}
          loading={loading}
        />
        <KpiCard
          label="Net Operating Profit"
          value={deep ? formatCurrency(deep.summary.totalProfit, currency) : '$0'}
          deltaPct={overview?.kpis.profitGrowthPct}
          sparkline={overview?.kpiSparklines.profit}
          loading={loading}
        />
      </div>

      {/* YoY Performance & Customer Segment Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ChartCard
            title="Monthly & Yearly Revenue Comparison"
            subtitle="Year-over-year monthly revenue curves across fiscal years"
            loading={loading}
            isEmpty={(overview?.yearlyComparison.length ?? 0) === 0}
            heightClass="h-80"
          >
            <YoYComparisonChart series={overview?.yearlyComparison || []} />
          </ChartCard>
        </div>

        <ChartCard
          title="Revenue by Customer Segment"
          subtitle="Enterprise vs Mid-Market vs SMB revenue mix"
          loading={loading}
          isEmpty={(deep?.segmentBreakdown.length ?? 0) === 0}
          heightClass="h-80"
        >
          <CategorySalesChart
            variant="pie"
            items={(deep?.segmentBreakdown || []).map((s) => ({
              label: s.segment,
              value: s.revenue,
            }))}
          />
        </ChartCard>
      </div>

      {/* Yearly Summary & Cost vs Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Annual Performance Comparison
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Year-over-year growth, profit margin, and order volume
            </p>
          </div>
          <DataTable
            columns={yoyCols}
            rows={deep?.yearlyPerformance || []}
            keyExtractor={(y) => y.year}
            loading={loading}
            compact={compactTables}
          />
        </section>

        <ChartCard
          title="Monthly Margin & Cost Distribution"
          subtitle="Stacked cost of goods vs realized net profit"
          loading={loading}
          isEmpty={(overview?.monthlySeries.length ?? 0) === 0}
        >
          <ProfitLossChart data={overview?.monthlySeries || []} />
        </ChartCard>
      </div>

      {/* Full Product Performance & Top Customers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Product Revenue & Profit Margin Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Complete unit economics across catalog SKUs
            </p>
          </div>
          <DataTable
            columns={productCols}
            rows={deep?.productPerformance || []}
            keyExtractor={(p) => p.productId}
            loading={loading}
            compact={compactTables}
          />
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Top Customer Accounts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Highest contributing client organizations
            </p>
          </div>
          <DataTable
            columns={customerCols}
            rows={deep?.topCustomers || []}
            keyExtractor={(c) => c.customerId}
            loading={loading}
            compact={compactTables}
          />
        </section>
      </div>
    </div>
  );
}
