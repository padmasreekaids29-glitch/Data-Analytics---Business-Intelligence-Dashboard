import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCheck, Info, XCircle } from 'lucide-react';
import { api } from '../lib/api.ts';
import type { KpiAlert, NotificationLog } from '../types/index.ts';

interface NotificationsPageProps {
  onUnreadChanged: (unreadCount: number) => void;
}

const MODULE_TABS = ['all', 'Import', 'Reports', 'KPI Alert', 'Users', 'Analytics'];

export function NotificationsPage({ onUnreadChanged }: NotificationsPageProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [kpiAlerts, setKpiAlerts] = useState<KpiAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async (mod = activeTab) => {
    setLoading(true);
    try {
      const res = await api.listNotifications(mod);
      setNotifications(res.notifications);
      setKpiAlerts(res.kpiAlerts);
      onUnreadChanged(res.unreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(activeTab);
  }, [activeTab]);

  const handleMarkRead = async (id: number) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const res = await api.listNotifications(activeTab);
    onUnreadChanged(res.unreadCount);
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onUnreadChanged(0);
  };

  const renderSeverityIcon = (severity: string) => {
    if (severity === 'error') {
      return <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
    }
    if (severity === 'warning') {
      return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
    }
    if (severity === 'success') {
      return <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />;
    }
    return <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />;
  };

  return (
    <div className="space-y-6">
      {/* Live KPI Margin Alerts */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Live KPI Threshold Alerts
          </h2>
        </div>

        {kpiAlerts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All product categories are currently meeting or exceeding their target gross margin
            benchmarks.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kpiAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {alert.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {alert.description}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-300 shrink-0">
                  {alert.metricValue}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity & System Notifications */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Event & Audit Notifications
            </h3>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            Mark All Read
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0B1120] mb-5 w-fit">
          {MODULE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All Events' : tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            No notifications recorded in this category.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`py-3.5 flex items-start justify-between gap-4 ${
                  n.isRead ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {renderSeverityIcon(n.severity)}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {n.action}
                      </p>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-violet-700 dark:text-violet-400 font-medium">
                        {n.module}
                      </span>
                      {!n.isRead && (
                        <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">
                          · Unread
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {n.details}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {n.userEmail} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
