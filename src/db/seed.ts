import { count, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  activityLogs,
  categories,
  customers,
  importedDatasets,
  orders,
  products,
  sales,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSampleDataSeeded(
  userUid = 'system',
  userEmail = 'system@insightpro.io'
): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      const existingCats = await db.select({ value: count() }).from(categories);
      if (Number(existingCats[0]?.value ?? 0) > 0) {
        return;
      }

      await db.transaction(async (tx) => {
        const doubleCheck = await tx.select({ value: count() }).from(categories);
        if (Number(doubleCheck[0]?.value ?? 0) > 0) {
          return;
        }

        const insertedCategories = await tx
          .insert(categories)
          .values([
            {
              name: 'Cloud Infrastructure',
              description: 'Enterprise compute clusters, managed Kubernetes, and distributed storage.',
              targetMargin: 42,
            },
            {
              name: 'Data & Analytics Suite',
              description: 'BI connectors, warehouse pipelines, and real-time streaming engines.',
              targetMargin: 48,
            },
            {
              name: 'Cybersecurity & Zero Trust',
              description: 'IAM enforcement, SOC telemetry, and compliance automation.',
              targetMargin: 45,
            },
            {
              name: 'Enterprise Hardware',
              description: 'Edge gateways, rack servers, and high-throughput network switches.',
              targetMargin: 28,
            },
            {
              name: 'Managed Advisory',
              description: 'Architecture consulting, migration sprints, and dedicated SLA support.',
              targetMargin: 36,
            },
          ])
          .returning();

        const catMap = new Map(insertedCategories.map((c) => [c.name, c.id]));

        const insertedProducts = await tx
          .insert(products)
          .values([
            {
              sku: 'CLD-101',
              name: 'HyperScale Compute Node',
              categoryId: catMap.get('Cloud Infrastructure')!,
              unitPrice: 4800,
              unitCost: 2650,
              stockQty: 140,
            },
            {
              sku: 'CLD-204',
              name: 'Geo-Replicated Object Vault',
              categoryId: catMap.get('Cloud Infrastructure')!,
              unitPrice: 2400,
              unitCost: 1320,
              stockQty: 320,
            },
            {
              sku: 'DAT-301',
              name: 'StreamPulse ETL Engine',
              categoryId: catMap.get('Data & Analytics Suite')!,
              unitPrice: 6200,
              unitCost: 2950,
              stockQty: 999,
            },
            {
              sku: 'DAT-315',
              name: 'Executive BI Warehouse License',
              categoryId: catMap.get('Data & Analytics Suite')!,
              unitPrice: 8500,
              unitCost: 3900,
              stockQty: 999,
            },
            {
              sku: 'DAT-330',
              name: 'Predictive Cohort Module',
              categoryId: catMap.get('Data & Analytics Suite')!,
              unitPrice: 3900,
              unitCost: 1950,
              stockQty: 999,
            },
            {
              sku: 'SEC-401',
              name: 'ZeroTrust Identity Mesh',
              categoryId: catMap.get('Cybersecurity & Zero Trust')!,
              unitPrice: 5400,
              unitCost: 2800,
              stockQty: 500,
            },
            {
              sku: 'SEC-418',
              name: 'Autonomous Threat Sentinel',
              categoryId: catMap.get('Cybersecurity & Zero Trust')!,
              unitPrice: 7100,
              unitCost: 3650,
              stockQty: 500,
            },
            {
              sku: 'HW-502',
              name: 'EdgeCore Gateway X8',
              categoryId: catMap.get('Enterprise Hardware')!,
              unitPrice: 3200,
              unitCost: 2240,
              stockQty: 85,
            },
            {
              sku: 'HW-519',
              name: 'FiberSwitch 100G Rack Unit',
              categoryId: catMap.get('Enterprise Hardware')!,
              unitPrice: 5600,
              unitCost: 4050,
              stockQty: 42,
            },
            {
              sku: 'ADV-601',
              name: 'Enterprise Migration Sprint',
              categoryId: catMap.get('Managed Advisory')!,
              unitPrice: 12000,
              unitCost: 7400,
              stockQty: 999,
            },
            {
              sku: 'ADV-610',
              name: '24/7 Principal TAM Retainer',
              categoryId: catMap.get('Managed Advisory')!,
              unitPrice: 4500,
              unitCost: 2850,
              stockQty: 999,
            },
          ])
          .returning();

        const insertedCustomers = await tx
          .insert(customers)
          .values([
            {
              name: 'Elena Rostova',
              email: 'elena.rostova@nordicbank.eu',
              company: 'Nordic Meridian Bank',
              region: 'Europe',
              segment: 'Enterprise',
              joinedDate: '2025-01-10',
            },
            {
              name: 'Marcus Vance',
              email: 'm.vance@apexlogistics.com',
              company: 'Apex Global Logistics',
              region: 'North America',
              segment: 'Enterprise',
              joinedDate: '2025-01-22',
            },
            {
              name: 'Kenji Takahashi',
              email: 'kenji@solarisrobotics.jp',
              company: 'Solaris Robotics',
              region: 'Asia-Pacific',
              segment: 'Enterprise',
              joinedDate: '2025-02-14',
            },
            {
              name: 'Sophia Chen',
              email: 'schen@veridianhealth.io',
              company: 'Veridian Health Systems',
              region: 'North America',
              segment: 'Enterprise',
              joinedDate: '2025-03-04',
            },
            {
              name: 'Mateo Silva',
              email: 'msilva@andesfintech.br',
              company: 'Andes FinTech Group',
              region: 'Latin America',
              segment: 'Mid-Market',
              joinedDate: '2025-04-12',
            },
            {
              name: 'Priya Nair',
              email: 'priya.nair@keralatech.in',
              company: 'Deccan Cloud Solutions',
              region: 'Asia-Pacific',
              segment: 'Enterprise',
              joinedDate: '2025-05-19',
            },
            {
              name: 'Lukas Weber',
              email: 'l.weber@rheinwerk.de',
              company: 'RheinWerk Manufacturing',
              region: 'Europe',
              segment: 'Mid-Market',
              joinedDate: '2025-06-25',
            },
            {
              name: 'Hannah Abbott',
              email: 'habbott@crestretail.co.uk',
              company: 'Crest Retail Holdings',
              region: 'Europe',
              segment: 'Mid-Market',
              joinedDate: '2025-08-08',
            },
            {
              name: 'David Morales',
              email: 'dmorales@pacificenergy.us',
              company: 'Pacific Grid Energy',
              region: 'North America',
              segment: 'Enterprise',
              joinedDate: '2025-10-15',
            },
            {
              name: 'Aisha Al-Mansoor',
              email: 'aisha@crescentcapital.ae',
              company: 'Crescent Capital Partners',
              region: 'Europe',
              segment: 'Enterprise',
              joinedDate: '2025-12-03',
            },
            {
              name: 'Daniel Park',
              email: 'dpark@seoulcommerce.kr',
              company: 'HanRiver Commerce',
              region: 'Asia-Pacific',
              segment: 'Mid-Market',
              joinedDate: '2026-01-18',
            },
            {
              name: 'Camila Duarte',
              email: 'cduarte@plataanalytics.ar',
              company: 'Plata Retail Analytics',
              region: 'Latin America',
              segment: 'SMB',
              joinedDate: '2026-03-09',
            },
            {
              name: 'Liam OConnor',
              email: 'liam@emeraldcloud.ie',
              company: 'Emerald Cloud Works',
              region: 'Europe',
              segment: 'SMB',
              joinedDate: '2026-05-11',
            },
            {
              name: 'Nadia Patel',
              email: 'npatel@vanguardbio.com',
              company: 'Vanguard BioLabs',
              region: 'North America',
              segment: 'Enterprise',
              joinedDate: '2026-07-07',
            },
            {
              name: 'Taro Watanabe',
              email: 'taro@kyotofinance.jp',
              company: 'Kyoto Asset Management',
              region: 'Asia-Pacific',
              segment: 'Enterprise',
              joinedDate: '2026-09-02',
            },
          ])
          .returning();

        const [seedDataset] = await tx
          .insert(importedDatasets)
          .values({
            name: 'Enterprise FY2025–FY2026 Ledger',
            fileName: 'enterprise_fy25_fy26_master.csv',
            fileType: 'seed',
            rowCount: 0,
            status: 'completed',
            uploadedByUid: userUid,
            summary: {
              totalRevenue: 0,
              totalProfit: 0,
              categoriesDetected: insertedCategories.map((c) => c.name),
              regionsDetected: ['North America', 'Europe', 'Asia-Pacific', 'Latin America'],
            },
          })
          .returning();

        // Generate deterministic, realistic 23-month enterprise transaction history (Jan 2025 - Nov 2026)
        const months: Array<{ year: number; month: number; growthFactor: number }> = [];
        for (let m = 1; m <= 12; m++) {
          months.push({ year: 2025, month: m, growthFactor: 0.78 + m * 0.028 });
        }
        for (let m = 1; m <= 11; m++) {
          months.push({ year: 2026, month: m, growthFactor: 1.08 + m * 0.036 });
        }

        const statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Processing', 'Pending'];
        let orderCounter = 1001;
        let totalSeedRevenue = 0;
        let totalSeedProfit = 0;
        let salesRowCount = 0;

        for (let idx = 0; idx < months.length; idx++) {
          const { year, month, growthFactor } = months[idx];
          const ordersInMonth = 6 + (idx % 4); // 6-9 orders per month (~170 orders)
          const monthStr = String(month).padStart(2, '0');

          for (let o = 0; o < ordersInMonth; o++) {
            const eligibleCustomers = insertedCustomers.filter(
              (c) => c.joinedDate <= `${year}-${monthStr}-28`
            );
            const customerPool = eligibleCustomers.length > 0 ? eligibleCustomers : insertedCustomers.slice(0, 4);
            const customer = customerPool[(idx * 5 + o * 3) % customerPool.length];
            const day = String(Math.min(28, 2 + ((o * 4 + idx) % 26))).padStart(2, '0');
            const orderDate = `${year}-${monthStr}-${day}`;
            const status =
              year === 2026 && month === 11 && o >= ordersInMonth - 2
                ? 'Processing'
                : statuses[(idx + o) % statuses.length];

            const numItems = 1 + ((idx + o) % 2);
            const lineItems: Array<{
              product: (typeof insertedProducts)[number];
              quantity: number;
              unitPrice: number;
              unitCost: number;
              revenue: number;
              profit: number;
            }> = [];

            let orderAmount = 0;
            let orderProfit = 0;

            for (let li = 0; li < numItems; li++) {
              const product = insertedProducts[(idx * 3 + o * 2 + li * 5) % insertedProducts.length];
              const baseQty = 1 + ((idx + o + li) % 4);
              const quantity = Math.max(1, Math.round(baseQty * growthFactor));
              const unitPrice = product.unitPrice;
              const unitCost = product.unitCost;
              const revenue = Number((quantity * unitPrice).toFixed(2));
              const profit = Number((quantity * (unitPrice - unitCost)).toFixed(2));

              orderAmount += revenue;
              orderProfit += profit;
              lineItems.push({ product, quantity, unitPrice, unitCost, revenue, profit });
            }

            const orderNumber = `ORD-${year}-${orderCounter++}`;
            const [createdOrder] = await tx
              .insert(orders)
              .values({
                orderNumber,
                customerId: customer.id,
                region: customer.region,
                orderDate,
                status,
                totalAmount: Number(orderAmount.toFixed(2)),
                totalProfit: Number(orderProfit.toFixed(2)),
                datasetId: seedDataset.id,
              })
              .returning();

            await tx.insert(sales).values(
              lineItems.map((item) => ({
                orderId: createdOrder.id,
                productId: item.product.id,
                categoryId: item.product.categoryId,
                customerId: customer.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unitCost: item.unitCost,
                revenue: item.revenue,
                profit: item.profit,
                saleDate: orderDate,
                region: customer.region,
                datasetId: seedDataset.id,
              }))
            );

            totalSeedRevenue += orderAmount;
            totalSeedProfit += orderProfit;
            salesRowCount += lineItems.length;
          }
        }

        await tx
          .update(importedDatasets)
          .set({
            rowCount: salesRowCount,
            summary: {
              totalRevenue: Number(totalSeedRevenue.toFixed(2)),
              totalProfit: Number(totalSeedProfit.toFixed(2)),
              categoriesDetected: insertedCategories.map((c) => c.name),
              regionsDetected: ['North America', 'Europe', 'Asia-Pacific', 'Latin America'],
            },
          })
          .where(eq(importedDatasets.id, seedDataset.id));

        await tx.insert(activityLogs).values([
          {
            userUid,
            userEmail,
            action: 'Baseline Ledger Initialized',
            module: 'Import',
            details: `Loaded ${salesRowCount} enterprise sales records across FY2025–FY2026 into PostgreSQL.`,
            severity: 'success',
            isRead: false,
          },
          {
            userUid,
            userEmail,
            action: 'Margin Target Alert',
            module: 'KPI Alert',
            details: 'Enterprise Hardware gross margin is tracking close to its 28.0% target threshold.',
            severity: 'warning',
            isRead: false,
          },
        ]);
      });
    } catch (error) {
      console.error('Failed to seed sample business data:', error);
      seedPromise = null;
      throw new Error('Failed to initialize baseline business dataset.', { cause: error });
    }
  })();

  return seedPromise;
}
