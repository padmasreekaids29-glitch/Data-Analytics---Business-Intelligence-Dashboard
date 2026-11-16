import type { Response } from 'express';
import { and, desc, eq, gte, like, lte } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  activityLogs,
  categories,
  customers,
  orders,
  products,
  sales,
} from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function generateReportData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, string | undefined>;
    const reportType = query.reportType || 'executive_summary';
    const conditions = [];

    if (query.startDate) conditions.push(gte(sales.saleDate, query.startDate));
    if (query.endDate) conditions.push(lte(sales.saleDate, query.endDate));
    if (query.year && query.month) {
      conditions.push(like(sales.saleDate, `${query.year}-${query.month.padStart(2, '0')}-%`));
    } else if (query.year) {
      conditions.push(like(sales.saleDate, `${query.year}-%`));
    }
    if (query.categoryId && /^\d+$/.test(query.categoryId)) {
      conditions.push(eq(sales.categoryId, Number(query.categoryId)));
    }
    if (query.region && query.region !== 'all') {
      conditions.push(eq(sales.region, query.region));
    }
    if (query.customerId && /^\d+$/.test(query.customerId)) {
      conditions.push(eq(sales.customerId, Number(query.customerId)));
    }

    const [salesRows, allCats, allProds, allCusts, allOrders] = await Promise.all([
      db
        .select()
        .from(sales)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sales.saleDate)),
      db.select().from(categories),
      db.select().from(products),
      db.select().from(customers),
      db.select().from(orders),
    ]);

    const catMap = new Map(allCats.map((c) => [c.id, c]));
    const prodMap = new Map(allProds.map((p) => [p.id, p]));
    const custMap = new Map(allCusts.map((c) => [c.id, c]));
    const orderMap = new Map(allOrders.map((o) => [o.id, o]));

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalUnits = 0;
    const orderIds = new Set<number>();

    const lineItems = salesRows.map((s) => {
      totalRevenue += s.revenue;
      totalProfit += s.profit;
      totalUnits += s.quantity;
      orderIds.add(s.orderId);
      const ord = orderMap.get(s.orderId);
      const prod = prodMap.get(s.productId);
      const cat = catMap.get(s.categoryId);
      const cust = custMap.get(s.customerId);
      return {
        orderNumber: ord?.orderNumber || `ORD-${s.orderId}`,
        saleDate: s.saleDate,
        customerName: cust?.name || 'Unknown',
        company: cust?.company || '',
        region: s.region,
        category: cat?.name || 'Uncategorized',
        productName: prod?.name || 'Unknown',
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        revenue: Number(s.revenue.toFixed(2)),
        profit: Number(s.profit.toFixed(2)),
        status: ord?.status || 'Completed',
      };
    });

    await db.insert(activityLogs).values({
      userUid: req.dbUser?.uid || 'system',
      userEmail: req.dbUser?.email || 'system@insightpro.io',
      action: 'Report Generated',
      module: 'Reports',
      details: `Generated ${reportType.replace(/_/g, ' ')} report (${lineItems.length} sales records, $${totalRevenue.toLocaleString()} total revenue).`,
      severity: 'success',
      isRead: false,
    });

    res.json({
      reportType,
      generatedAt: new Date().toISOString(),
      generatedBy: req.dbUser?.email || 'Analyst',
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        totalOrders: orderIds.size,
        totalUnits,
        profitMarginPct:
          totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
      },
      rows: lineItems,
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate business report.' });
  }
}

export async function exportCsvReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, string | undefined>;
    const conditions = [];
    if (query.startDate) conditions.push(gte(sales.saleDate, query.startDate));
    if (query.endDate) conditions.push(lte(sales.saleDate, query.endDate));
    if (query.year) conditions.push(like(sales.saleDate, `${query.year}-%`));
    if (query.categoryId && /^\d+$/.test(query.categoryId)) {
      conditions.push(eq(sales.categoryId, Number(query.categoryId)));
    }
    if (query.region && query.region !== 'all') {
      conditions.push(eq(sales.region, query.region));
    }
    if (query.customerId && /^\d+$/.test(query.customerId)) {
      conditions.push(eq(sales.customerId, Number(query.customerId)));
    }

    const [salesRows, allCats, allProds, allCusts, allOrders] = await Promise.all([
      db
        .select()
        .from(sales)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sales.saleDate)),
      db.select().from(categories),
      db.select().from(products),
      db.select().from(customers),
      db.select().from(orders),
    ]);

    const catMap = new Map(allCats.map((c) => [c.id, c]));
    const prodMap = new Map(allProds.map((p) => [p.id, p]));
    const custMap = new Map(allCusts.map((c) => [c.id, c]));
    const orderMap = new Map(allOrders.map((o) => [o.id, o]));

    const header = [
      'Order Number',
      'Date',
      'Customer',
      'Company',
      'Region',
      'Category',
      'Product',
      'Quantity',
      'Unit Price',
      'Revenue',
      'Profit',
      'Status',
    ].join(',');

    const lines = salesRows.map((s) => {
      const ord = orderMap.get(s.orderId);
      const prod = prodMap.get(s.productId);
      const cat = catMap.get(s.categoryId);
      const cust = custMap.get(s.customerId);
      return [
        ord?.orderNumber || `ORD-${s.orderId}`,
        s.saleDate,
        cust?.name || 'Unknown',
        cust?.company || '',
        s.region,
        cat?.name || 'Uncategorized',
        prod?.name || 'Unknown',
        s.quantity,
        s.unitPrice,
        s.revenue,
        s.profit,
        ord?.status || 'Completed',
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    await db.insert(activityLogs).values({
      userUid: req.dbUser?.uid || 'system',
      userEmail: req.dbUser?.email || 'system@insightpro.io',
      action: 'CSV Report Exported',
      module: 'Reports',
      details: `Exported ${salesRows.length} filtered ledger rows to CSV.`,
      severity: 'info',
      isRead: false,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="insight_pro_analytics_report.csv"');
    res.send([header, ...lines].join('\n'));
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV report.' });
  }
}
