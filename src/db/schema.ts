import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultCurrency: string;
  compactTables: boolean;
  kpiAlertThresholdPct: number;
  emailDigest: boolean;
}

export interface DatasetSummary {
  totalRevenue: number;
  totalProfit: number;
  categoriesDetected: string[];
  regionsDetected: string[];
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Executive User'),
  photoUrl: text('photo_url'),
  role: text('role').notNull().default('analyst'), // 'admin' | 'analyst' | 'viewer'
  department: text('department').notNull().default('Business Intelligence'),
  status: text('status').notNull().default('active'), // 'active' | 'suspended'
  preferences: jsonb('preferences')
    .$type<UserPreferences>()
    .notNull()
    .default({
      theme: 'light',
      defaultCurrency: 'USD',
      compactTables: false,
      kpiAlertThresholdPct: 10,
      emailDigest: true,
    }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  targetMargin: doublePrecision('target_margin').notNull().default(30),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  company: text('company').notNull().default(''),
  region: text('region').notNull(),
  segment: text('segment').notNull().default('Enterprise'), // 'Enterprise' | 'Mid-Market' | 'SMB'
  joinedDate: text('joined_date').notNull(), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'restrict' })
    .notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  unitCost: doublePrecision('unit_cost').notNull(),
  stockQty: integer('stock_qty').notNull().default(100),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const importedDatasets = pgTable('imported_datasets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // 'csv' | 'xlsx' | 'xls' | 'seed'
  rowCount: integer('row_count').notNull().default(0),
  status: text('status').notNull().default('completed'), // 'completed' | 'failed'
  uploadedByUid: text('uploaded_by_uid').notNull(),
  errorMessage: text('error_message'),
  summary: jsonb('summary').$type<DatasetSummary>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  region: text('region').notNull(),
  orderDate: text('order_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('Completed'), // 'Completed' | 'Processing' | 'Pending' | 'Cancelled'
  totalAmount: doublePrecision('total_amount').notNull(),
  totalProfit: doublePrecision('total_profit').notNull(),
  datasetId: integer('dataset_id').references(() => importedDatasets.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'restrict' })
    .notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'restrict' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  unitCost: doublePrecision('unit_cost').notNull(),
  revenue: doublePrecision('revenue').notNull(),
  profit: doublePrecision('profit').notNull(),
  saleDate: text('sale_date').notNull(), // YYYY-MM-DD
  region: text('region').notNull(),
  datasetId: integer('dataset_id').references(() => importedDatasets.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(),
  module: text('module').notNull(), // 'Import' | 'Reports' | 'Analytics' | 'Users' | 'System' | 'KPI Alert'
  details: text('details').notNull(),
  severity: text('severity').notNull().default('info'), // 'info' | 'success' | 'warning' | 'error'
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  sales: many(sales),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  sales: many(sales),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  sales: many(sales),
}));

export const importedDatasetsRelations = relations(importedDatasets, ({ many }) => ({
  orders: many(orders),
  sales: many(sales),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  dataset: one(importedDatasets, {
    fields: [orders.datasetId],
    references: [importedDatasets.id],
  }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  order: one(orders, {
    fields: [sales.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [sales.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [sales.categoryId],
    references: [categories.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  dataset: one(importedDatasets, {
    fields: [sales.datasetId],
    references: [importedDatasets.id],
  }),
}));
