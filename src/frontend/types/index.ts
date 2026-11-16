export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultCurrency: string;
  compactTables: boolean;
  kpiAlertThresholdPct: number;
  emailDigest: boolean;
}

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: 'admin' | 'analyst' | 'viewer' | string;
  department: string;
  status: 'active' | 'suspended' | string;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  year: string;
  month: string;
  categoryId: string;
  region: string;
  customerId: string;
}

export interface OverviewKpis {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProfit: number;
  averageOrderValue: number;
  profitMarginPct: number;
  totalUnits: number;
  revenueGrowthPct: number;
  ordersGrowthPct: number;
  profitGrowthPct: number;
  customersGrowthPct: number;
}

export interface MonthlySeriesPoint {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
  units: number;
  activeCustomers: number;
  newCustomers: number;
  cumulativeCustomers: number;
}

export interface CategorySalesItem {
  categoryId: number;
  name: string;
  revenue: number;
  profit: number;
  units: number;
  targetMargin: number;
  marginPct: number;
}

export interface RegionSalesItem {
  region: string;
  revenue: number;
  profit: number;
  orders: number;
  units: number;
}

export interface TopProductItem {
  productId: number;
  sku: string;
  name: string;
  category: string;
  revenue: number;
  profit: number;
  unitsSold: number;
  marginPct: number;
}

export interface RecentTransactionItem {
  id: number;
  orderNumber: string;
  customerName: string;
  company: string;
  region: string;
  orderDate: string;
  status: string;
  units: number;
  totalAmount: number;
  totalProfit: number;
}

export interface YearlyComparisonSeries {
  year: string;
  months: number[];
}

export interface FilterOptions {
  categories: Array<{ id: number; name: string }>;
  regions: string[];
  customers: Array<{ id: number; name: string; company: string }>;
  years: string[];
}

export interface OverviewResponse {
  kpis: OverviewKpis;
  kpiSparklines: {
    revenue: number[];
    orders: number[];
    customers: number[];
    profit: number[];
    aov: number[];
  };
  monthlySeries: MonthlySeriesPoint[];
  salesByCategory: CategorySalesItem[];
  salesByRegion: RegionSalesItem[];
  topProducts: TopProductItem[];
  recentTransactions: RecentTransactionItem[];
  yearlyComparison: YearlyComparisonSeries[];
  filterOptions: FilterOptions;
}

export interface DeepAnalyticsResponse {
  summary: {
    totalRevenue: number;
    totalProfit: number;
    averageSalesPerOrder: number;
    profitMarginPct: number;
  };
  segmentBreakdown: Array<{
    segment: string;
    revenue: number;
    profit: number;
    orders: number;
    customers: number;
  }>;
  topCustomers: Array<{
    customerId: number;
    name: string;
    company: string;
    region: string;
    segment: string;
    revenue: number;
    profit: number;
    orders: number;
  }>;
  productPerformance: Array<{
    productId: number;
    sku: string;
    name: string;
    category: string;
    unitsSold: number;
    revenue: number;
    cost: number;
    profit: number;
    marginPct: number;
  }>;
  yearlyPerformance: Array<{
    year: string;
    revenue: number;
    profit: number;
    orders: number;
    units: number;
    marginPct: number;
    yoyGrowthPct: number | null;
  }>;
}

export interface ImportedDataset {
  id: number;
  name: string;
  fileName: string;
  fileType: string;
  rowCount: number;
  status: string;
  uploadedByUid: string;
  errorMessage: string | null;
  summary: {
    totalRevenue: number;
    totalProfit: number;
    categoriesDetected: string[];
    regionsDetected: string[];
  } | null;
  createdAt: string;
}

export interface ReportRow {
  orderNumber: string;
  saleDate: string;
  customerName: string;
  company: string;
  region: string;
  category: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  profit: number;
  status: string;
}

export interface ReportResponse {
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  summary: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    totalUnits: number;
    profitMarginPct: number;
  };
  rows: ReportRow[];
}

export interface NotificationLog {
  id: number;
  userUid: string;
  userEmail: string;
  action: string;
  module: string;
  details: string;
  severity: 'info' | 'success' | 'warning' | 'error' | string;
  isRead: boolean;
  createdAt: string;
}

export interface KpiAlert {
  id: string;
  title: string;
  description: string;
  severity: 'warning' | 'error' | 'info';
  metricValue: string;
}

export interface NotificationsResponse {
  notifications: NotificationLog[];
  kpiAlerts: KpiAlert[];
  unreadCount: number;
}
