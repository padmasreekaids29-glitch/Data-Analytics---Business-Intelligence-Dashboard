import { auth } from './firebase.ts';
import type {
  DashboardFilters,
  DbUser,
  DeepAnalyticsResponse,
  ImportedDataset,
  NotificationsResponse,
  OverviewResponse,
  ReportResponse,
} from '../types/index.ts';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required. Please sign in.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

function buildFilterQuery(filters?: Partial<DashboardFilters>): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.year) params.set('year', filters.year);
  if (filters.month) params.set('month', filters.month);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.region) params.set('region', filters.region);
  if (filters.customerId) params.set('customerId', filters.customerId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errPayload = await response.json().catch(() => ({}));
    const err = new Error(errPayload.error || `Request failed (${response.status})`) as Error & {
      validationErrors?: string[];
    };
    if (Array.isArray(errPayload.validationErrors)) {
      err.validationErrors = errPayload.validationErrors;
    }
    throw err;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getOverview: (filters?: Partial<DashboardFilters>) =>
    apiRequest<OverviewResponse>(`/api/analytics/overview${buildFilterQuery(filters)}`),

  getDeepAnalytics: (filters?: Partial<DashboardFilters>) =>
    apiRequest<DeepAnalyticsResponse>(`/api/analytics/deep${buildFilterQuery(filters)}`),

  listDatasets: () => apiRequest<{ datasets: ImportedDataset[] }>('/api/datasets'),

  uploadDataset: (file: File, datasetName: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('datasetName', datasetName);
    return apiRequest<{ message: string; dataset: ImportedDataset }>('/api/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },

  deleteDataset: (id: number) =>
    apiRequest<{ message: string }>(`/api/datasets/${id}`, { method: 'DELETE' }),

  downloadTemplate: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/datasets/template', { headers });
    if (!res.ok) throw new Error('Failed to download CSV template.');
    const blob = await res.blob();
    triggerBlobDownload(blob, 'insight_pro_import_template.csv');
  },

  generateReport: (reportType: string, filters?: Partial<DashboardFilters>) => {
    const qs = buildFilterQuery(filters);
    const sep = qs ? '&' : '?';
    return apiRequest<ReportResponse>(
      `/api/reports/generate${qs}${sep}reportType=${encodeURIComponent(reportType)}`
    );
  },

  downloadCsvReport: async (filters?: Partial<DashboardFilters>) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/reports/export/csv${buildFilterQuery(filters)}`, { headers });
    if (!res.ok) throw new Error('Failed to export CSV report.');
    const blob = await res.blob();
    triggerBlobDownload(blob, `insight_pro_report_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  getMe: () => apiRequest<{ user: DbUser }>('/api/users/me'),

  updateMyProfile: (payload: {
    displayName?: string;
    department?: string;
    preferences?: Partial<DbUser['preferences']>;
  }) =>
    apiRequest<{ user: DbUser }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  listUsers: () => apiRequest<{ users: DbUser[] }>('/api/users'),

  inviteUser: (payload: {
    email: string;
    displayName: string;
    role: string;
    department: string;
  }) =>
    apiRequest<{ user: DbUser }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUserAccess: (
    id: number,
    payload: { role?: string; status?: string; department?: string }
  ) =>
    apiRequest<{ user: DbUser }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  listNotifications: (moduleFilter = 'all') =>
    apiRequest<NotificationsResponse>(
      `/api/notifications?module=${encodeURIComponent(moduleFilter)}`
    ),

  markNotificationRead: (id: number) =>
    apiRequest<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    apiRequest<{ ok: boolean }>('/api/notifications/read-all', { method: 'PATCH' }),

  listCustomers: () =>
    apiRequest<{ customers: Array<{ id: number; name: string; company: string; region: string }> }>(
      '/api/crud/customers'
    ),

  listProducts: () =>
    apiRequest<{ products: Array<{ id: number; sku: string; name: string; unitPrice: number }> }>(
      '/api/crud/products'
    ),

  createOrder: (payload: {
    customerId: number;
    productId: number;
    quantity: number;
    orderDate: string;
    status: string;
  }) =>
    apiRequest<{ order: unknown }>('/api/crud/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
