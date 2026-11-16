import React, { useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.ts';
import { formatCurrency } from '../lib/exportUtils.ts';
import { FilterBar } from '../components/layout/FilterBar.tsx';
import { KpiCard } from '../components/ui/KpiCard.tsx';
import { DataTable, type ColumnDef } from '../components/ui/DataTable.tsx';
import { ChartCard } from '../components/charts/ChartCard.tsx';
import { RevenueChart } from '../components/charts/RevenueChart.tsx';
import { MonthlySalesChart } from '../components/charts/MonthlySalesChart.tsx';
import { CustomerGrowthChart } from '../components/charts/CustomerGrowthChart.tsx';
import { ProfitLossChart } from '../components/charts/ProfitLossChart.tsx';
import { CategorySalesChart } from '../components/charts/CategorySalesChart.tsx';
import type {
  DashboardFilters,
  OverviewResponse,
  RecentTransactionItem,
  TopProductItem,
} from '../types/index.ts';

interface OverviewPageProps {
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
  onResetFilters: () => void;
  currency: string;
  compactTables: boolean;
  userRole: string;
  onDataMutated: () => void;
}

export function OverviewPage({
  filters,
  onFiltersChange,
  onResetFilters,
  currency,
  compactTables,
  userRole,
  onDataMutated,
}: OverviewPageProps) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributionView, setDistributionView] = useState<'category' | 'region'>('category');
  const [txSearch, setTxSearch] = useState('');

  // Quick Add Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [customersList, setCustomersList] = useState<Array<{ id: number; name: string; company: string }>>([]);
  const [productsList, setProductsList] = useState<Array<{ id: number; sku: string; name: string; unitPrice: number }>>([]);
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    productId: '',
    quantity: '2',
    orderDate: new Date().toISOString().slice(0, 10),
    status: 'Completed',
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOverview(filters);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [filters]);

  const openOrderModal = async () => {
    setShowOrderModal(true);
    try {
      const [cRes, pRes] = await Promise.all([api.listCustomers(), api.listProducts()]);
      setCustomersList(cRes.customers);
      setProductsList(pRes.products);
      setOrderForm((prev) => ({
        ...prev,
        customerId: prev.customerId || String(cRes.customers[0]?.id || ''),
        productId: prev.productId || String(pRes.products[0]?.id || ''),
      }));
    } catch {
      // handled gracefully
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOrder(true);
    try {
      await api.createOrder({
        customerId: Number(orderForm.customerId),
        productId: Number(orderForm.productId),
        quantity: Number(orderForm.quantity),
        orderDate: orderForm.orderDate,
        status: orderForm.status,
      });
      setShowOrderModal(false);
      await loadOverview();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record new order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredTransactions = (data?.recentTransactions || []).filter((tx) => {
    if (!txSearch.trim()) return true;
    const q = txSearch.toLowerCase();
    return (
      tx.orderNumber.toLowerCase().includes(q) ||
      tx.customerName.toLowerCase().includes(q) ||
      tx.company.toLowerCase().includes(q) ||
      tx.region.toLowerCase().includes(q)
    );
  });

  const productColumns: ColumnDef<TopProductItem>[] = [
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
      header: 'Units',
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
      key: 'margin',
      header: 'Margin',
      align: 'right',
      render: (p) => `${p.marginPct}%`,
    },
  ];

  const txColumns: ColumnDef<RecentTransactionItem>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (t) => (
        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
          {t.orderNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (t) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{t.customerName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.company} · {t.region}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (t) => <span className="font-mono text-xs">{t.orderDate}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => {
        const cls =
          t.status === 'Completed'
            ? 'text-emerald-700 dark:text-emerald-400'
            : t.status === 'Processing'
              ? 'text-violet-700 dark:text-violet-400'
              : t.status === 'Cancelled'
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-amber-700 dark:text-amber-400';
        return <span className={`text-xs font-medium ${cls}`}>{t.status}</span>;
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (t) => formatCurrency(t.totalAmount, currency),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (t) => formatCurrency(t.totalProfit, currency),
    },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        filters={filters}
        options={
          data?.filterOptions || {
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
        <div
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Revenue"
          value={data ? formatCurrency(data.kpis.totalRevenue, currency) : '$0'}
          deltaPct={data?.kpis.revenueGrowthPct}
          sparkline={data?.kpiSparklines.revenue}
          loading={loading}
        />
        <KpiCard
          label="Total Orders"
          value={data ? data.kpis.totalOrders.toLocaleString() : '0'}
          deltaPct={data?.kpis.ordersGrowthPct}
          sparkline={data?.kpiSparklines.orders}
          loading={loading}
        />
        <KpiCard
          label="Total Customers"
          value={data ? data.kpis.totalCustomers.toLocaleString() : '0'}
          deltaPct={data?.kpis.customersGrowthPct}
          sparkline={data?.kpiSparklines.customers}
          loading={loading}
        />
        <KpiCard
          label="Total Profit"
          value={data ? formatCurrency(data.kpis.totalProfit, currency) : '$0'}
          deltaPct={data?.kpis.profitGrowthPct}
          sparkline={data?.kpiSparklines.profit}
          loading={loading}
        />
        <KpiCard
          label="Avg. Order Value"
          value={data ? formatCurrency(data.kpis.averageOrderValue, currency) : '$0'}
          deltaContext={`${data?.kpis.profitMarginPct ?? 0}% gross margin`}
          deltaPct={data ? data.kpis.profitMarginPct : undefined}
          sparkline={data?.kpiSparklines.aov}
          loading={loading}
        />
        <KpiCard
          label="Growth Rate"
          value={
            data
              ? `${data.kpis.revenueGrowthPct > 0 ? '+' : ''}${data.kpis.revenueGrowthPct}%`
              : '0.0%'
          }
          deltaPct={data?.kpis.revenueGrowthPct}
          deltaContext="half-period momentum"
          sparkline={data?.kpiSparklines.revenue}
          loading={loading}
        />
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ChartCard
            title="Revenue & Profit Overview"
            subtitle="Monthly gross revenue and net profit trajectory across active filters"
            loading={loading}
            isEmpty={(data?.monthlySeries.length ?? 0) === 0}
            heightClass="h-80"
          >
            <RevenueChart data={data?.monthlySeries || []} />
          </ChartCard>
        </div>

        <ChartCard
          title={distributionView === 'category' ? 'Sales by Category' : 'Sales by Region'}
          subtitle="Revenue contribution across business lines"
          loading={loading}
          isEmpty={
            distributionView === 'category'
              ? (data?.salesByCategory.length ?? 0) === 0
              : (data?.salesByRegion.length ?? 0) === 0
          }
          heightClass="h-80"
          rightSlot={
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setDistributionView('category')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  distributionView === 'category'
                    ? 'bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => setDistributionView('region')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  distributionView === 'region'
                    ? 'bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Region
              </button>
            </div>
          }
        >
          <CategorySalesChart
            variant={distributionView === 'category' ? 'doughnut' : 'pie'}
            items={
              distributionView === 'category'
                ? (data?.salesByCategory || []).map((c) => ({
                    label: c.name,
                    value: c.revenue,
                  }))
                : (data?.salesByRegion || []).map((r) => ({
                    label: r.region,
                    value: r.revenue,
                  }))
            }
          />
        </ChartCard>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Monthly Sales Volume"
          subtitle="Completed order count and units shipped"
          loading={loading}
          isEmpty={(data?.monthlySeries.length ?? 0) === 0}
        >
          <MonthlySalesChart data={data?.monthlySeries || []} />
        </ChartCard>

        <ChartCard
          title="Customer Growth"
          subtitle="Cumulative customer base and active accounts"
          loading={loading}
          isEmpty={(data?.monthlySeries.length ?? 0) === 0}
        >
          <CustomerGrowthChart data={data?.monthlySeries || []} />
        </ChartCard>

        <ChartCard
          title="Profit & Loss Breakdown"
          subtitle="Operating cost of goods vs net profit"
          loading={loading}
          isEmpty={(data?.monthlySeries.length ?? 0) === 0}
        >
          <ProfitLossChart data={data?.monthlySeries || []} />
        </ChartCard>
      </div>

      {/* Tables Row: Top Products & Recent Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="xl:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Top-Performing Products
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by realized PostgreSQL revenue
            </p>
          </div>
          <DataTable
            columns={productColumns}
            rows={data?.topProducts || []}
            keyExtractor={(p) => p.productId}
            loading={loading}
            compact={compactTables}
          />
        </section>

        <section className="xl:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Latest commercial orders matching active filters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Search order or client..."
                  className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600/40"
                />
              </div>
              {userRole !== 'viewer' && (
                <button
                  type="button"
                  onClick={openOrderModal}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 dark:bg-violet-600 hover:bg-slate-800 dark:hover:bg-violet-700 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Record Order
                </button>
              )}
            </div>
          </div>
          <DataTable
            columns={txColumns}
            rows={filteredTransactions}
            keyExtractor={(t) => t.id}
            loading={loading}
            compact={compactTables}
          />
        </section>
      </div>

      {/* Record New Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Record New Sales Order
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Customer Account
                </span>
                <select
                  required
                  value={orderForm.customerId}
                  onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.company}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Product / License
                </span>
                <select
                  required
                  value={orderForm.productId}
                  onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.unitPrice.toLocaleString()})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Quantity
                  </span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Order Date
                  </span>
                  <input
                    type="date"
                    required
                    value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Order Status
                </span>
                <select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="Completed">Completed</option>
                  <option value="Processing">Processing</option>
                  <option value="Pending">Pending</option>
                </select>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-60 cursor-pointer"
                >
                  {submittingOrder ? 'Saving...' : 'Save to PostgreSQL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
