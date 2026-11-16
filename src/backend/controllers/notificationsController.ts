import type { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { activityLogs, categories, sales } from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';

export async function listNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const moduleFilter =
      typeof req.query.module === 'string' && req.query.module !== 'all'
        ? req.query.module
        : null;

    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(60);

    const filteredLogs = moduleFilter
      ? logs.filter((l) => l.module.toLowerCase() === moduleFilter.toLowerCase())
      : logs;

    // Evaluate live KPI threshold alerts directly from PostgreSQL sales & categories
    const [allCats, allSales] = await Promise.all([
      db.select().from(categories),
      db.select({ categoryId: sales.categoryId, revenue: sales.revenue, profit: sales.profit }).from(sales),
    ]);

    const catAgg = new Map<number, { revenue: number; profit: number }>();
    for (const s of allSales) {
      const cur = catAgg.get(s.categoryId) ?? { revenue: 0, profit: 0 };
      cur.revenue += s.revenue;
      cur.profit += s.profit;
      catAgg.set(s.categoryId, cur);
    }

    const kpiAlerts = allCats
      .map((c) => {
        const agg = catAgg.get(c.id);
        if (!agg || agg.revenue <= 0) return null;
        const actualMargin = Number(((agg.profit / agg.revenue) * 100).toFixed(1));
        if (actualMargin < c.targetMargin) {
          return {
            id: `kpi-margin-${c.id}`,
            title: `${c.name} below target margin`,
            description: `Actual margin ${actualMargin}% vs target ${c.targetMargin}% across $${agg.revenue.toLocaleString()} revenue.`,
            severity: 'warning' as const,
            metricValue: `${actualMargin}%`,
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const unreadCount = logs.filter((l) => !l.isRead).length;

    res.json({
      notifications: filteredLogs,
      kpiAlerts,
      unreadCount,
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid notification ID.' });
    return;
  }

  try {
    await db
      .update(activityLogs)
      .set({ isRead: true })
      .where(eq(activityLogs.id, id));
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function markAllNotificationsRead(_req: AuthRequest, res: Response): Promise<void> {
  try {
    await db.update(activityLogs).set({ isRead: true });
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
}
