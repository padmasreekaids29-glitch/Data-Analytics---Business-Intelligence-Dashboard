import type { Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '../../db/index.ts';
import {
  activityLogs,
  categories,
  customers,
  importedDatasets,
  orders,
  products,
  sales,
} from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';

interface NormalizedImportRow {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  company: string;
  region: string;
  segment: string;
  category: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  status: string;
}

function getField(row: Record<string, unknown>, keys: string[]): string {
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    lowerMap.set(k.trim().toLowerCase().replace(/[\s_-]+/g, ''), v);
  }
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '');
    if (lowerMap.has(normalizedKey)) {
      const val = lowerMap.get(normalizedKey);
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
  }
  return '';
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const a = Number(slashMatch[1]);
    const b = Number(slashMatch[2]);
    const y = slashMatch[3];
    // Handle MM/DD/YYYY vs DD/MM/YYYY safely
    const month = a <= 12 ? a : b;
    const day = a <= 12 ? b : a;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function validateAndNormalizeRows(
  rawRows: Record<string, unknown>[]
): { validRows: NormalizedImportRow[]; errors: string[] } {
  const validRows: NormalizedImportRow[] = [];
  const errors: string[] = [];

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { validRows: [], errors: ['Uploaded file contains zero data rows.'] };
  }

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // 1-based header + row
    const rawDate = getField(row, ['date', 'orderdate', 'saledate', 'transactiondate']);
    const orderDate = normalizeDate(rawDate);
    const productName = getField(row, ['product', 'productname', 'item', 'service']);
    const category = getField(row, ['category', 'productcategory', 'department']) || 'General';
    const customerName = getField(row, ['customer', 'customername', 'client', 'account']);
    const region = getField(row, ['region', 'territory', 'country', 'market']) || 'North America';
    const qtyRaw = getField(row, ['quantity', 'qty', 'units']);
    const priceRaw = getField(row, ['unitprice', 'price', 'rate', 'amount']);
    const costRaw = getField(row, ['unitcost', 'cost', 'cogs']);

    const quantity = Number(qtyRaw.replace(/[^0-9.-]/g, ''));
    const unitPrice = Number(priceRaw.replace(/[^0-9.-]/g, ''));
    const unitCost = costRaw
      ? Number(costRaw.replace(/[^0-9.-]/g, ''))
      : Number((unitPrice * 0.62).toFixed(2));

    if (!orderDate) {
      errors.push(`Row ${rowNum}: Missing or invalid date ("${rawDate}"). Expected YYYY-MM-DD.`);
      return;
    }
    if (!productName) {
      errors.push(`Row ${rowNum}: Missing product name.`);
      return;
    }
    if (!customerName) {
      errors.push(`Row ${rowNum}: Missing customer name.`);
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`Row ${rowNum}: Quantity must be a positive number.`);
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      errors.push(`Row ${rowNum}: Unit price must be greater than 0.`);
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      errors.push(`Row ${rowNum}: Unit cost cannot be negative.`);
      return;
    }

    const orderNumber =
      getField(row, ['ordernumber', 'orderid', 'invoice', 'reference']) ||
      `IMP-${Date.now().toString().slice(-6)}-${index + 1}`;
    const customerEmail =
      getField(row, ['customeremail', 'email']) ||
      `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@imported.insightpro.io`;
    const company = getField(row, ['company', 'organization', 'accountname']) || customerName;
    const segment = getField(row, ['segment', 'tier']) || 'Enterprise';
    const sku =
      getField(row, ['sku', 'productcode', 'code']) ||
      `IMP-${productName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${index + 1}`;
    const status = getField(row, ['status', 'orderstatus']) || 'Completed';

    validRows.push({
      orderNumber,
      orderDate,
      customerName,
      customerEmail,
      company,
      region,
      segment,
      category,
      productName,
      sku,
      quantity: Math.round(quantity),
      unitPrice: Number(unitPrice.toFixed(2)),
      unitCost: Number(unitCost.toFixed(2)),
      status,
    });
  });

  return { validRows, errors };
}

export async function listDatasets(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const datasets = await db
      .select()
      .from(importedDatasets)
      .orderBy(desc(importedDatasets.createdAt));
    res.json({ datasets });
  } catch (error) {
    console.error('List datasets error:', error);
    res.status(500).json({ error: 'Failed to retrieve datasets from PostgreSQL.' });
  }
}

export async function uploadDataset(req: AuthRequest, res: Response): Promise<void> {
  const userUid = req.dbUser?.uid || 'system';
  const userEmail = req.dbUser?.email || 'system@insightpro.io';

  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded. Please select a CSV or Excel (.xlsx/.xls) file.' });
      return;
    }

    const fileName = file.originalname;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      await db.insert(activityLogs).values({
        userUid,
        userEmail,
        action: 'Import Validation Failed',
        module: 'Import',
        details: `Rejected unsupported file format "${fileName}". Only .csv, .xlsx, and .xls are allowed.`,
        severity: 'error',
        isRead: false,
      });
      res.status(400).json({
        error: 'Unsupported file format. Only .csv, .xlsx, and .xls files are supported.',
      });
      return;
    }

    let rawRows: Record<string, unknown>[] = [];
    if (ext === 'csv') {
      const csvText = file.buffer.toString('utf-8');
      const parsed = Papa.parse<Record<string, unknown>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        res.status(400).json({
          error: `CSV parsing failed: ${parsed.errors[0].message}`,
        });
        return;
      }
      rawRows = parsed.data;
    } else {
      const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        res.status(400).json({ error: 'Excel workbook contains no worksheets.' });
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd',
      });
    }

    const { validRows, errors } = validateAndNormalizeRows(rawRows);
    if (errors.length > 0) {
      await db.insert(activityLogs).values({
        userUid,
        userEmail,
        action: 'Dataset Import Error',
        module: 'Import',
        details: `Import of "${fileName}" failed validation (${errors.length} error(s)). First error: ${errors[0]}`,
        severity: 'error',
        isRead: false,
      });
      res.status(400).json({
        error: `Validation failed on ${errors.length} row(s).`,
        validationErrors: errors.slice(0, 10),
      });
      return;
    }

    const datasetName =
      (typeof req.body?.datasetName === 'string' && req.body.datasetName.trim()) ||
      fileName.replace(/\.(csv|xlsx|xls)$/i, '');

    const result = await db.transaction(async (tx) => {
      const existingCats = await tx.select().from(categories);
      const catByName = new Map(existingCats.map((c) => [c.name.toLowerCase(), c]));

      const existingCusts = await tx.select().from(customers);
      const custByEmail = new Map(existingCusts.map((c) => [c.email.toLowerCase(), c]));

      const existingProds = await tx.select().from(products);
      const prodByName = new Map(existingProds.map((p) => [p.name.toLowerCase(), p]));

      const categoriesDetected = new Set<string>();
      const regionsDetected = new Set<string>();
      let totalRevenue = 0;
      let totalProfit = 0;

      const [dataset] = await tx
        .insert(importedDatasets)
        .values({
          name: datasetName,
          fileName,
          fileType: ext,
          rowCount: validRows.length,
          status: 'completed',
          uploadedByUid: userUid,
          summary: {
            totalRevenue: 0,
            totalProfit: 0,
            categoriesDetected: [],
            regionsDetected: [],
          },
        })
        .returning();

      // Group rows by orderNumber so multi-line orders stay cohesive
      const ordersGrouped = new Map<string, NormalizedImportRow[]>();
      for (const r of validRows) {
        const list = ordersGrouped.get(r.orderNumber) ?? [];
        list.push(r);
        ordersGrouped.set(r.orderNumber, list);
      }

      for (const [rawOrderNumber, items] of ordersGrouped.entries()) {
        const first = items[0];
        regionsDetected.add(first.region);

        let cust = custByEmail.get(first.customerEmail.toLowerCase());
        if (!cust) {
          const [insertedCust] = await tx
            .insert(customers)
            .values({
              name: first.customerName,
              email: first.customerEmail,
              company: first.company,
              region: first.region,
              segment: first.segment,
              joinedDate: first.orderDate,
            })
            .onConflictDoUpdate({
              target: customers.email,
              set: { name: first.customerName, region: first.region },
            })
            .returning();
          cust = insertedCust;
          custByEmail.set(cust.email.toLowerCase(), cust);
        }

        let orderRev = 0;
        let orderProf = 0;
        const resolvedItems: Array<{
          productId: number;
          categoryId: number;
          quantity: number;
          unitPrice: number;
          unitCost: number;
          revenue: number;
          profit: number;
          saleDate: string;
          region: string;
        }> = [];

        for (const item of items) {
          categoriesDetected.add(item.category);
          regionsDetected.add(item.region);

          let cat = catByName.get(item.category.toLowerCase());
          if (!cat) {
            const [insertedCat] = await tx
              .insert(categories)
              .values({
                name: item.category,
                description: `Imported category (${item.category})`,
                targetMargin: 32,
              })
              .onConflictDoUpdate({
                target: categories.name,
                set: { name: item.category },
              })
              .returning();
            cat = insertedCat;
            catByName.set(cat.name.toLowerCase(), cat);
          }

          let prod = prodByName.get(item.productName.toLowerCase());
          if (!prod) {
            const uniqueSku = `${item.sku}-${Date.now().toString().slice(-4)}`;
            const [insertedProd] = await tx
              .insert(products)
              .values({
                sku: uniqueSku,
                name: item.productName,
                categoryId: cat.id,
                unitPrice: item.unitPrice,
                unitCost: item.unitCost,
                stockQty: 250,
              })
              .onConflictDoUpdate({
                target: products.sku,
                set: { unitPrice: item.unitPrice, unitCost: item.unitCost },
              })
              .returning();
            prod = insertedProd;
            prodByName.set(prod.name.toLowerCase(), prod);
          }

          const revenue = Number((item.quantity * item.unitPrice).toFixed(2));
          const profit = Number((item.quantity * (item.unitPrice - item.unitCost)).toFixed(2));
          orderRev += revenue;
          orderProf += profit;

          resolvedItems.push({
            productId: prod.id,
            categoryId: cat.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            revenue,
            profit,
            saleDate: item.orderDate,
            region: item.region,
          });
        }

        const uniqueOrderNum = `${rawOrderNumber}-${dataset.id}`;
        const [createdOrder] = await tx
          .insert(orders)
          .values({
            orderNumber: uniqueOrderNum,
            customerId: cust.id,
            region: first.region,
            orderDate: first.orderDate,
            status: first.status,
            totalAmount: Number(orderRev.toFixed(2)),
            totalProfit: Number(orderProf.toFixed(2)),
            datasetId: dataset.id,
          })
          .returning();

        await tx.insert(sales).values(
          resolvedItems.map((ri) => ({
            orderId: createdOrder.id,
            productId: ri.productId,
            categoryId: ri.categoryId,
            customerId: cust.id,
            quantity: ri.quantity,
            unitPrice: ri.unitPrice,
            unitCost: ri.unitCost,
            revenue: ri.revenue,
            profit: ri.profit,
            saleDate: ri.saleDate,
            region: ri.region,
            datasetId: dataset.id,
          }))
        );

        totalRevenue += orderRev;
        totalProfit += orderProf;
      }

      const [updatedDataset] = await tx
        .update(importedDatasets)
        .set({
          summary: {
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalProfit: Number(totalProfit.toFixed(2)),
            categoriesDetected: Array.from(categoriesDetected),
            regionsDetected: Array.from(regionsDetected),
          },
        })
        .where(eq(importedDatasets.id, dataset.id))
        .returning();

      await tx.insert(activityLogs).values({
        userUid,
        userEmail,
        action: 'Dataset Imported',
        module: 'Import',
        details: `Successfully imported "${fileName}" (${validRows.length} rows, $${totalRevenue.toLocaleString()} revenue) into PostgreSQL.`,
        severity: 'success',
        isRead: false,
      });

      return updatedDataset;
    });

    res.status(201).json({
      message: `Dataset "${result.name}" imported (${result.rowCount} rows).`,
      dataset: result,
    });
  } catch (error) {
    console.error('Upload dataset error:', error);
    await db
      .insert(activityLogs)
      .values({
        userUid,
        userEmail,
        action: 'Dataset Import Error',
        module: 'Import',
        details: 'Unexpected database error during dataset import.',
        severity: 'error',
        isRead: false,
      })
      .catch(() => {});
    res.status(500).json({ error: 'Failed to import dataset into PostgreSQL.' });
  }
}

export async function deleteDataset(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid dataset ID.' });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(importedDatasets)
      .where(eq(importedDatasets.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: 'Dataset not found.' });
      return;
    }

    await db.delete(importedDatasets).where(eq(importedDatasets.id, id));

    await db.insert(activityLogs).values({
      userUid: req.dbUser?.uid || 'system',
      userEmail: req.dbUser?.email || 'system@insightpro.io',
      action: 'Dataset Deleted',
      module: 'Import',
      details: `Removed dataset "${existing[0].name}" (${existing[0].rowCount} rows) and purged associated orders/sales.`,
      severity: 'info',
      isRead: false,
    });

    res.json({ message: `Dataset "${existing[0].name}" deleted successfully.` });
  } catch (error) {
    console.error('Delete dataset error:', error);
    res.status(500).json({ error: 'Failed to delete dataset.' });
  }
}

export function downloadTemplate(_req: AuthRequest, res: Response): void {
  const csv = [
    'OrderNumber,OrderDate,CustomerName,CustomerEmail,Company,Region,Segment,Category,ProductName,SKU,Quantity,UnitPrice,UnitCost,Status',
    'IMP-9001,2026-10-12,Olivia Grant,o.grant@atlanticai.com,Atlantic AI Corp,North America,Enterprise,Data & Analytics Suite,StreamPulse ETL Engine,DAT-301,3,6200,2950,Completed',
    'IMP-9002,2026-10-18,Henrik Lind,h.lind@finncloud.fi,FinnCloud Oy,Europe,Mid-Market,Cybersecurity & Zero Trust,ZeroTrust Identity Mesh,SEC-401,2,5400,2800,Completed',
    'IMP-9003,2026-11-02,Meera Kapoor,m.kapoor@indusfin.in,Indus Financial,Asia-Pacific,Enterprise,Cloud Infrastructure,HyperScale Compute Node,CLD-101,4,4800,2650,Processing',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="insight_pro_import_template.csv"');
  res.send(csv);
}
