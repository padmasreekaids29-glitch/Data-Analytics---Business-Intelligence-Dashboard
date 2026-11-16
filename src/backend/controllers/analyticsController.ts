import type { Response } from 'express';
import { and, asc, desc, eq, gte, like, lte } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  categories,
  customers,
  orders,
  products,
  sales,
} from '../../db/schema.ts';
import { ensureSampleDataSeeded } from '../../db/seed.ts';
import type { AuthRequest } from '../middleware/auth.ts';

interface FilterParams {
  startDate?: string;
  endDate?: string;
  year?: string;
  month?: string;
  categoryId?: number;
  region?: string;
  customerId?: number;
}

function parseFilters(query: Record<string, unknown>): FilterParams {
  const startDate =
    typeof query.startDate === 'string' && query.startDate.trim()
      ? query.startDate.trim()
      : undefined;
  const endDate =
    typeof query.endDate === 'string' && query.endDate.trim()
      ? query.endDate.trim()
      : undefined;
  const year =
    typeof query.year === 'string' && /^\d{4}$/.test(query.year.trim())
      ? query.year.trim()
      : undefined;
  const month =
    typeof query.month === 'string' && /^(0?[1-9]|1[0-2])$/.test(query.month.trim())
      ? query.month.trim().padStart(2, '0')
      : undefined;
  const categoryId =
    typeof query.categoryId === 'string' && /^\d+$/.test(query.categoryId.trim())
      ? Number(query.categoryId.trim())
      : undefined;
  const region =
    typeof query.region === 'string' && query.region.trim() && query.region !== 'all'
      ? query.region.trim()
      : undefined;
  const customerId =
    typeof query.customerId === 'string' && /^\d+$/.test(query.customerId.trim())
      ? Number(query.customerId.trim())
      : undefined;

  return { startDate, endDate, year, month, categoryId, region, customerId };
}

function buildSalesConditions(filters: FilterParams) {
  const conditions = [];
  if (filters.startDate) {
    conditions.push(gte(sales.saleDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(sales.saleDate, filters.endDate));
  }
  if (filters.year && filters.month) {
    conditions.push(like(sales.saleDate, `${filters.year}-${filters.month}-%`));
  } else if (filters.year) {
    conditions.push(like(sales.saleDate, `${filters.year}-%`));
  } else if (filters.month) {
    conditions.push(like(sales.saleDate, `%-${filters.month}-%`));
  }
  if (filters.categoryId) {
    conditions.push(eq(sales.categoryId, filters.categoryId));
  }
  if (filters.region) {
    conditions.push(eq(sales.region, filters.region));
  }
  if (filters.customerId) {
    conditions.push(eq(sales.customerId, filters.customerId));
  }
  return conditions;
}

function calcGrowthPct(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

export async function getOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureSampleDataSeeded(req.dbUser?.uid, req.dbUser?.email);
    const filters = parseFilters(req.query as Record<string, unknown>);
    const conditions = buildSalesConditions(filters);

    const [allSalesRows, allCategories, allCustomers, allProducts, allOrders] =
      await Promise.all([
        db
          .select({
            id: sales.id,
            orderId: sales.orderId,
            productId: sales.productId,
            categoryId: sales.categoryId,
            customerId: sales.customerId,
            quantity: sales.quantity,
            unitPrice: sales.unitPrice,
            unitCost: sales.unitCost,
            revenue: sales.revenue,
            profit: sales.profit,
            saleDate: sales.saleDate,
            region: sales.region,
          })
          .from(sales)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(sales.saleDate)),
        db.select().from(categories).orderBy(asc(categories.name)),
        db.select().from(customers).orderBy(asc(customers.name)),
        db.select().from(products).orderBy(asc(products.name)),
        db.select().from(orders).orderBy(desc(orders.orderDate), desc(orders.id)),
      ]);

    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    const customerMap = new Map(allCustomers.map((c) => [c.id, c]));
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const orderMap = new Map(allOrders.map((o) => [o.id, o]));

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalUnits = 0;
    const orderIdsSet = new Set<number>();
    const customerIdsSet = new Set<number>();

    const monthlyMap = new Map<
      string,
      {
        monthKey: string;
        revenue: number;
        cost: number;
        profit: number;
        units: number;
        orderIds: Set<number>;
        customerIds: Set<number>;
      }
    >();

    const categoryAggMap = new Map<
      number,
      { categoryId: number; name: string; revenue: number; profit: number; units: number; targetMargin: number }
    >();

    const regionAggMap = new Map<
      string,
      { region: string; revenue: number; profit: number; orderIds: Set<number>; units: number }
    >();

    const productAggMap = new Map<
      number,
      { productId: number; sku: string; name: string; category: string; revenue: number; profit: number; unitsSold: number }
    >();

    const yearlyMonthlyMap = new Map<string, Map<number, number>>();

    for (const row of allSalesRows) {
      const revenue = Number(row.revenue) || 0;
      const profit = Number(row.profit) || 0;
      const cost = revenue - profit;
      const qty = Number(row.quantity) || 0;

      totalRevenue += revenue;
      totalProfit += profit;
      totalUnits += qty;
      orderIdsSet.add(row.orderId);
      customerIdsSet.add(row.customerId);

      const monthKey = row.saleDate.slice(0, 7); // YYYY-MM
      const monthEntry = monthlyMap.get(monthKey) ?? {
        monthKey,
        revenue: 0,
        cost: 0,
        profit: 0,
        units: 0,
        orderIds: new Set<number>(),
        customerIds: new Set<number>(),
      };
      monthEntry.revenue += revenue;
      monthEntry.cost += cost;
      monthEntry.profit += profit;
      monthEntry.units += qty;
      monthEntry.orderIds.add(row.orderId);
      monthEntry.customerIds.add(row.customerId);
      monthlyMap.set(monthKey, monthEntry);

      const yearStr = row.saleDate.slice(0, 4);
      const monthNum = Number(row.saleDate.slice(5, 7));
      if (yearStr && monthNum >= 1 && monthNum <= 12) {
        const yMap = yearlyMonthlyMap.get(yearStr) ?? new Map<number, number>();
        yMap.set(monthNum, (yMap.get(monthNum) ?? 0) + revenue);
        yearlyMonthlyMap.set(yearStr, yMap);
      }

      const cat = categoryMap.get(row.categoryId);
      const catEntry = categoryAggMap.get(row.categoryId) ?? {
        categoryId: row.categoryId,
        name: cat?.name || 'Uncategorized',
        revenue: 0,
        profit: 0,
        units: 0,
        targetMargin: cat?.targetMargin ?? 30,
      };
      catEntry.revenue += revenue;
      catEntry.profit += profit;
      catEntry.units += qty;
      categoryAggMap.set(row.categoryId, catEntry);

      const regEntry = regionAggMap.get(row.region) ?? {
        region: row.region,
        revenue: 0,
        profit: 0,
        orderIds: new Set<number>(),
        units: 0,
      };
      regEntry.revenue += revenue;
      regEntry.profit += profit;
      regEntry.orderIds.add(row.orderId);
      regEntry.units += qty;
      regionAggMap.set(row.region, regEntry);

      const prod = productMap.get(row.productId);
      const prodEntry = productAggMap.get(row.productId) ?? {
        productId: row.productId,
        sku: prod?.sku || `SKU-${row.productId}`,
        name: prod?.name || `Product ${row.productId}`,
        category: cat?.name || 'Uncategorized',
        revenue: 0,
        profit: 0,
        unitsSold: 0,
      };
      prodEntry.revenue += revenue;
      prodEntry.profit += profit;
      prodEntry.unitsSold += qty;
      productAggMap.set(row.productId, prodEntry);
    }

    const totalOrders = orderIdsSet.size;
    const totalCustomers = customerIdsSet.size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const profitMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();

    // Calculate growth by comparing recent half of active timeline vs prior half (or latest month vs prior month)
    const splitIdx = Math.floor(sortedMonthKeys.length / 2);
    let revenueGrowthPct = 0;
    let ordersGrowthPct = 0;
    let profitGrowthPct = 0;
    let customersGrowthPct = 0;

    if (sortedMonthKeys.length >= 2) {
      const priorKeys = sortedMonthKeys.slice(0, splitIdx);
      const recentKeys = sortedMonthKeys.slice(splitIdx);
      const priorRev = priorKeys.reduce((s, k) => s + (monthlyMap.get(k)?.revenue ?? 0), 0);
      const recentRev = recentKeys.reduce((s, k) => s + (monthlyMap.get(k)?.revenue ?? 0), 0);
      const priorProf = priorKeys.reduce((s, k) => s + (monthlyMap.get(k)?.profit ?? 0), 0);
      const recentProf = recentKeys.reduce((s, k) => s + (monthlyMap.get(k)?.profit ?? 0), 0);
      const priorOrd = priorKeys.reduce((s, k) => s + (monthlyMap.get(k)?.orderIds.size ?? 0), 0);
      const recentOrd = recentKeys.reduce((s, k) => s + (monthlyMap.get(k)?.orderIds.size ?? 0), 0);

      const priorCusts = new Set<number>();
      priorKeys.forEach((k) => monthlyMap.get(k)?.customerIds.forEach((c) => priorCusts.add(c)));
      const recentCusts = new Set<number>();
      recentKeys.forEach((k) => monthlyMap.get(k)?.customerIds.forEach((c) => recentCusts.add(c)));

      revenueGrowthPct = calcGrowthPct(recentRev, priorRev);
      profitGrowthPct = calcGrowthPct(recentProf, priorProf);
      ordersGrowthPct = calcGrowthPct(recentOrd, priorOrd);
      customersGrowthPct = calcGrowthPct(recentCusts.size, priorCusts.size);
    }

    // Monthly time series
    const cumulativeCustomersSeen = new Set<number>();
    const monthlySeries = sortedMonthKeys.map((k) => {
      const entry = monthlyMap.get(k)!;
      let newlyActive = 0;
      entry.customerIds.forEach((cid) => {
        if (!cumulativeCustomersSeen.has(cid)) {
          cumulativeCustomersSeen.add(cid);
          newlyActive += 1;
        }
      });
      return {
        month: k,
        revenue: Number(entry.revenue.toFixed(2)),
        cost: Number(entry.cost.toFixed(2)),
        profit: Number(entry.profit.toFixed(2)),
        orders: entry.orderIds.size,
        units: entry.units,
        activeCustomers: entry.customerIds.size,
        newCustomers: newlyActive,
        cumulativeCustomers: cumulativeCustomersSeen.size,
      };
    });

    const sparkSlice = monthlySeries.slice(-6);
    const kpiSparklines = {
      revenue: sparkSlice.map((m) => m.revenue),
      orders: sparkSlice.map((m) => m.orders),
      customers: sparkSlice.map((m) => m.cumulativeCustomers),
      profit: sparkSlice.map((m) => m.profit),
      aov: sparkSlice.map((m) => (m.orders > 0 ? Number((m.revenue / m.orders).toFixed(2)) : 0)),
    };

    const salesByCategory = Array.from(categoryAggMap.values())
      .map((c) => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
        profit: Number(c.profit.toFixed(2)),
        marginPct: c.revenue > 0 ? Number(((c.profit / c.revenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const salesByRegion = Array.from(regionAggMap.values())
      .map((r) => ({
        region: r.region,
        revenue: Number(r.revenue.toFixed(2)),
        profit: Number(r.profit.toFixed(2)),
        orders: r.orderIds.size,
        units: r.units,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProducts = Array.from(productAggMap.values())
      .map((p) => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
        profit: Number(p.profit.toFixed(2)),
        marginPct: p.revenue > 0 ? Number(((p.profit / p.revenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Recent transactions matching the filtered orderIds
    const filteredOrdersMap = new Map<
      number,
      { revenue: number; profit: number; units: number }
    >();
    for (const row of allSalesRows) {
      const cur = filteredOrdersMap.get(row.orderId) ?? { revenue: 0, profit: 0, units: 0 };
      cur.revenue += Number(row.revenue) || 0;
      cur.profit += Number(row.profit) || 0;
      cur.units += Number(row.quantity) || 0;
      filteredOrdersMap.set(row.orderId, cur);
    }

    const recentTransactions = allOrders
      .filter((o) => filteredOrdersMap.has(o.id))
      .slice(0, 15)
      .map((o) => {
        const cust = customerMap.get(o.customerId);
        const agg = filteredOrdersMap.get(o.id)!;
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: cust?.name || 'Unknown',
          company: cust?.company || '',
          region: o.region,
          orderDate: o.orderDate,
          status: o.status,
          units: agg.units,
          totalAmount: Number(agg.revenue.toFixed(2)),
          totalProfit: Number(agg.profit.toFixed(2)),
        };
      });

    // Yearly comparison across all years present in DB (for unfiltered years comparison + current filters)
    const availableYearsSet = new Set<string>();
    const allOrderDates = allOrders.map((o) => o.orderDate.slice(0, 4)).filter(Boolean);
    allOrderDates.forEach((y) => availableYearsSet.add(y));
    const availableYears = Array.from(availableYearsSet).sort();

    const yearlyComparison = Array.from(yearlyMonthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([yr, mMap]) => ({
        year: yr,
        months: Array.from({ length: 12 }, (_, idx) =>
          Number((mMap.get(idx + 1) ?? 0).toFixed(2))
        ),
      }));

    const availableRegions = Array.from(new Set(allCustomers.map((c) => c.region))).sort();

    res.json({
      kpis: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        totalCustomers,
        totalProfit: Number(totalProfit.toFixed(2)),
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        profitMarginPct: Number(profitMarginPct.toFixed(1)),
        totalUnits,
        revenueGrowthPct,
        ordersGrowthPct,
        profitGrowthPct,
        customersGrowthPct,
      },
      kpiSparklines,
      monthlySeries,
      salesByCategory,
      salesByRegion,
      topProducts,
      recentTransactions,
      yearlyComparison,
      filterOptions: {
        categories: allCategories.map((c) => ({ id: c.id, name: c.name })),
        regions: availableRegions,
        customers: allCustomers.map((c) => ({ id: c.id, name: c.name, company: c.company })),
        years: availableYears,
      },
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to calculate analytics overview from PostgreSQL.' });
  }
}

export async function getDeepAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureSampleDataSeeded(req.dbUser?.uid, req.dbUser?.email);
    const filters = parseFilters(req.query as Record<string, unknown>);
    const conditions = buildSalesConditions(filters);

    const [allSalesRows, allCategories, allCustomers, allProducts] = await Promise.all([
      db
        .select()
        .from(sales)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(sales.saleDate)),
      db.select().from(categories),
      db.select().from(customers),
      db.select().from(products),
    ]);

    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    const customerMap = new Map(allCustomers.map((c) => [c.id, c]));
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const segmentAgg = new Map<
      string,
      { segment: string; revenue: number; profit: number; orders: Set<number>; customers: Set<number> }
    >();

    const customerLeaderboardMap = new Map<
      number,
      {
        customerId: number;
        name: string;
        company: string;
        region: string;
        segment: string;
        revenue: number;
        profit: number;
        orders: Set<number>;
      }
    >();

    const productPerformanceMap = new Map<
      number,
      {
        productId: number;
        sku: string;
        name: string;
        category: string;
        unitsSold: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();

    const yearPerformanceMap = new Map<
      string,
      { year: string; revenue: number; profit: number; orders: Set<number>; units: number }
    >();

    for (const row of allSalesRows) {
      const cust = customerMap.get(row.customerId);
      const seg = cust?.segment || 'Enterprise';
      const sEntry = segmentAgg.get(seg) ?? {
        segment: seg,
        revenue: 0,
        profit: 0,
        orders: new Set<number>(),
        customers: new Set<number>(),
      };
      sEntry.revenue += row.revenue;
      sEntry.profit += row.profit;
      sEntry.orders.add(row.orderId);
      sEntry.customers.add(row.customerId);
      segmentAgg.set(seg, sEntry);

      const clEntry = customerLeaderboardMap.get(row.customerId) ?? {
        customerId: row.customerId,
        name: cust?.name || 'Unknown',
        company: cust?.company || '',
        region: cust?.region || row.region,
        segment: seg,
        revenue: 0,
        profit: 0,
        orders: new Set<number>(),
      };
      clEntry.revenue += row.revenue;
      clEntry.profit += row.profit;
      clEntry.orders.add(row.orderId);
      customerLeaderboardMap.set(row.customerId, clEntry);

      const prod = productMap.get(row.productId);
      const cat = categoryMap.get(row.categoryId);
      const ppEntry = productPerformanceMap.get(row.productId) ?? {
        productId: row.productId,
        sku: prod?.sku || `SKU-${row.productId}`,
        name: prod?.name || `Product ${row.productId}`,
        category: cat?.name || 'Uncategorized',
        unitsSold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      ppEntry.unitsSold += row.quantity;
      ppEntry.revenue += row.revenue;
      ppEntry.cost += row.revenue - row.profit;
      ppEntry.profit += row.profit;
      productPerformanceMap.set(row.productId, ppEntry);

      const yr = row.saleDate.slice(0, 4);
      const ypEntry = yearPerformanceMap.get(yr) ?? {
        year: yr,
        revenue: 0,
        profit: 0,
        orders: new Set<number>(),
        units: 0,
      };
      ypEntry.revenue += row.revenue;
      ypEntry.profit += row.profit;
      ypEntry.orders.add(row.orderId);
      ypEntry.units += row.quantity;
      yearPerformanceMap.set(yr, ypEntry);
    }

    const totalRevenue = allSalesRows.reduce((s, r) => s + r.revenue, 0);
    const totalProfit = allSalesRows.reduce((s, r) => s + r.profit, 0);
    const totalOrdersCount = new Set(allSalesRows.map((r) => r.orderId)).size;

    const yearlyPerformance = Array.from(yearPerformanceMap.values())
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((y, idx, arr) => {
        const prev = idx > 0 ? arr[idx - 1] : null;
        return {
          year: y.year,
          revenue: Number(y.revenue.toFixed(2)),
          profit: Number(y.profit.toFixed(2)),
          orders: y.orders.size,
          units: y.units,
          marginPct: y.revenue > 0 ? Number(((y.profit / y.revenue) * 100).toFixed(1)) : 0,
          yoyGrowthPct: prev ? calcGrowthPct(y.revenue, prev.revenue) : null,
        };
      });

    res.json({
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        averageSalesPerOrder:
          totalOrdersCount > 0 ? Number((totalRevenue / totalOrdersCount).toFixed(2)) : 0,
        profitMarginPct:
          totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
      },
      segmentBreakdown: Array.from(segmentAgg.values()).map((s) => ({
        segment: s.segment,
        revenue: Number(s.revenue.toFixed(2)),
        profit: Number(s.profit.toFixed(2)),
        orders: s.orders.size,
        customers: s.customers.size,
      })),
      topCustomers: Array.from(customerLeaderboardMap.values())
        .map((c) => ({
          customerId: c.customerId,
          name: c.name,
          company: c.company,
          region: c.region,
          segment: c.segment,
          revenue: Number(c.revenue.toFixed(2)),
          profit: Number(c.profit.toFixed(2)),
          orders: c.orders.size,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      productPerformance: Array.from(productPerformanceMap.values())
        .map((p) => ({
          ...p,
          revenue: Number(p.revenue.toFixed(2)),
          cost: Number(p.cost.toFixed(2)),
          profit: Number(p.profit.toFixed(2)),
          marginPct: p.revenue > 0 ? Number(((p.profit / p.revenue) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      yearlyPerformance,
    });
  } catch (error) {
    console.error('Deep analytics error:', error);
    res.status(500).json({ error: 'Failed to compute deep analytics metrics.' });
  }
}
