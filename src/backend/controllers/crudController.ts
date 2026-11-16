import type { Response } from 'express';
import { asc, desc, eq } from 'drizzle-orm';
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

export async function listCategories(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    res.json({ categories: rows });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ error: 'Failed to load categories.' });
  }
}

export async function createCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, targetMargin } = req.body as {
      name?: string;
      description?: string;
      targetMargin?: number;
    };
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const [created] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        description: (description || '').trim(),
        targetMargin: typeof targetMargin === 'number' ? targetMargin : 30,
      })
      .returning();

    res.status(201).json({ category: created });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category.' });
  }
}

export async function listProducts(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await db.select().from(products).orderBy(asc(products.name));
    res.json({ products: rows });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Failed to load products.' });
  }
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { sku, name, categoryId, unitPrice, unitCost, stockQty } = req.body as {
      sku?: string;
      name?: string;
      categoryId?: number;
      unitPrice?: number;
      unitCost?: number;
      stockQty?: number;
    };

    if (!sku?.trim() || !name?.trim() || !categoryId || !unitPrice || unitPrice <= 0) {
      res.status(400).json({ error: 'SKU, product name, categoryId, and positive unitPrice are required.' });
      return;
    }

    const [created] = await db
      .insert(products)
      .values({
        sku: sku.trim(),
        name: name.trim(),
        categoryId: Number(categoryId),
        unitPrice: Number(unitPrice),
        unitCost: Number(unitCost ?? unitPrice * 0.6),
        stockQty: Number(stockQty ?? 100),
      })
      .returning();

    res.status(201).json({ product: created });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
}

export async function listCustomers(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await db.select().from(customers).orderBy(asc(customers.name));
    res.json({ customers: rows });
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to load customers.' });
  }
}

export async function createCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, company, region, segment } = req.body as {
      name?: string;
      email?: string;
      company?: string;
      region?: string;
      segment?: string;
    };

    if (!name?.trim() || !email?.trim() || !region?.trim()) {
      res.status(400).json({ error: 'Customer name, email, and region are required.' });
      return;
    }

    const [created] = await db
      .insert(customers)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: (company || name).trim(),
        region: region.trim(),
        segment: segment || 'Enterprise',
        joinedDate: new Date().toISOString().slice(0, 10),
      })
      .returning();

    res.status(201).json({ customer: created });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
}

export async function listOrders(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.orderDate), desc(orders.id))
      .limit(100);
    res.json({ orders: rows });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Failed to load orders.' });
  }
}

export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { customerId, productId, quantity, orderDate, status } = req.body as {
      customerId?: number;
      productId?: number;
      quantity?: number;
      orderDate?: string;
      status?: string;
    };

    if (!customerId || !productId || !quantity || quantity <= 0) {
      res.status(400).json({ error: 'customerId, productId, and positive quantity are required.' });
      return;
    }

    const [cust] = await db.select().from(customers).where(eq(customers.id, Number(customerId))).limit(1);
    const [prod] = await db.select().from(products).where(eq(products.id, Number(productId))).limit(1);

    if (!cust || !prod) {
      res.status(404).json({ error: 'Customer or product not found.' });
      return;
    }

    const qty = Math.round(Number(quantity));
    const revenue = Number((qty * prod.unitPrice).toFixed(2));
    const profit = Number((qty * (prod.unitPrice - prod.unitCost)).toFixed(2));
    const effectiveDate = orderDate || new Date().toISOString().slice(0, 10);

    const created = await db.transaction(async (tx) => {
      const [ord] = await tx
        .insert(orders)
        .values({
          orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
          customerId: cust.id,
          region: cust.region,
          orderDate: effectiveDate,
          status: status || 'Completed',
          totalAmount: revenue,
          totalProfit: profit,
        })
        .returning();

      await tx.insert(sales).values({
        orderId: ord.id,
        productId: prod.id,
        categoryId: prod.categoryId,
        customerId: cust.id,
        quantity: qty,
        unitPrice: prod.unitPrice,
        unitCost: prod.unitCost,
        revenue,
        profit,
        saleDate: effectiveDate,
        region: cust.region,
      });

      await tx.insert(activityLogs).values({
        userUid: req.dbUser?.uid || 'system',
        userEmail: req.dbUser?.email || 'system@insightpro.io',
        action: 'Order Recorded',
        module: 'Analytics',
        details: `Created order ${ord.orderNumber} for ${cust.name} ($${revenue.toLocaleString()}).`,
        severity: 'success',
        isRead: false,
      });

      return ord;
    });

    res.status(201).json({ order: created });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const { status } = req.body as { status?: string };
  if (!Number.isInteger(id) || id <= 0 || !status) {
    res.status(400).json({ error: 'Valid order ID and status are required.' });
    return;
  }

  try {
    const [updated] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order: updated });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
}

export async function deleteOrder(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid order ID.' });
    return;
  }

  try {
    const deleted = await db.delete(orders).where(eq(orders.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order.' });
  }
}
