import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.ts';
import { exportReportToPdf, formatCurrency } from '../lib/exportUtils.ts';
import { FilterBar } from '../components/layout/FilterBar.tsx';
import { KpiCard } from '../components/ui/KpiCard.tsx';
import { DataTable, type ColumnDef } from '../components/ui/DataTable.tsx';
import type {
  DashboardFilters,
  FilterOptions,
  ReportResponse,
  ReportRow,
} from '../types/index.ts';

interface ReportsPageProps {
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
  onResetFilters: () => void;
  currency: string;
  compactTables: boolean;
  onDataMutated: () => void;
}

const REPORT_TYPES = [
  { id: 'executive_summary', label: 'Executive Revenue Summary' },
  { id: 'sales_performance', label: 'Sales Performance Ledger' },
  { id: 'category_margin', label: 'Category & Margin Audit' },
  { id: 'customer_ledger', label: 'Customer Account Statement' },
];

export function ReportsPage({
  filters,
  onFiltersChange,
  onResetFilters,
  currency,
  compactTables,
  onDataMutated,
}: ReportsPageProps) {
  const [reportType, setReportType] = useState('executive_summary');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    regions: [],
    customers: [],
    years: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (type = reportType, notify = false) => {
    setLoading(true);
    setError(null);
    try {
      const [repRes, ovRes] = await Promise.all([
        api.generateReport(type, filters),
        api.getOverview(filters),
      ]);
      setReport(repRes);
      setFilterOptions(ovRes.filterOptions);
      if (notify) onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate business report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(reportType, false);
  }, [filters]);

  const handleGenerateClick = () => {
    loadReport(reportType, true);
  };

  const columns: ColumnDef<ReportRow>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (r) => <span className="font-mono text-xs font-semibold">{r.orderNumber}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => <span className="font-mono text-xs">{r.saleDate}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{r.customerName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{r.region}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product & Category',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{r.productName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{r.category}</p>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      render: (r) => r.quantity.toLocaleString(),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      render: (r) => formatCurrency(r.revenue, currency),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (r) => formatCurrency(r.profit, currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <span className="text-xs font-medium">{r.status}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        filters={filters}
        options={filterOptions}
        onChange={onFiltersChange}
        onReset={onResetFilters}
      />

      {/* Report Generator Toolbar */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Report Template</span>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
              >
                {REPORT_TYPES.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Generate Report
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!report || report.rows.length === 0}
              onClick={() => report && exportReportToPdf(report, currency)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </button>

            <button
              type="button"
              disabled={!report || report.rows.length === 0}
              onClick={() => api.downloadCsvReport(filters)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Printable Report Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
              INSIGHT PRO · Business Intelligence Report
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {REPORT_TYPES.find((r) => r.id === reportType)?.label}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Generated {report ? new Date(report.generatedAt).toLocaleString() : '—'} · Prepared
              by {report?.generatedBy || '—'}
            </p>
          </div>
          {report && (
            <button
              type="button"
              onClick={() => exportReportToPdf(report, currency)}
              className="no-print inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Snapshot
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Report Revenue"
            value={report ? formatCurrency(report.summary.totalRevenue, currency) : '$0'}
            loading={loading}
          />
          <KpiCard
            label="Report Net Profit"
            value={report ? formatCurrency(report.summary.totalProfit, currency) : '$0'}
            loading={loading}
          />
          <KpiCard
            label="Gross Margin"
            value={report ? `${report.summary.profitMarginPct}%` : '0.0%'}
            loading={loading}
          />
          <KpiCard
            label="Orders / Units"
            value={
              report
                ? `${report.summary.totalOrders.toLocaleString()} / ${report.summary.totalUnits.toLocaleString()}`
                : '0 / 0'
            }
            loading={loading}
          />
        </div>

        <DataTable
          columns={columns}
          rows={(report?.rows || []).slice(0, 60)}
          keyExtractor={(r, idx) => `${r.orderNumber}-${idx}`}
          loading={loading}
          compact={compactTables}
        />

        {report && report.rows.length > 60 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing first 60 of {report.rows.length} matching records in preview. Export PDF or CSV
            for the complete dataset.
          </p>
        )}
      </div>
    </div>
  );
}
