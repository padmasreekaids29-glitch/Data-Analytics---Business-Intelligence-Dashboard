import { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './frontend/context/AuthContext.tsx';
import { ThemeProvider } from './frontend/context/ThemeContext.tsx';
import { Sidebar, type NavSectionId } from './frontend/components/layout/Sidebar.tsx';
import { TopBar } from './frontend/components/layout/TopBar.tsx';
import { LoginPage } from './frontend/pages/LoginPage.tsx';
import { OverviewPage } from './frontend/pages/OverviewPage.tsx';
import { AnalyticsPage } from './frontend/pages/AnalyticsPage.tsx';
import { DataImportPage } from './frontend/pages/DataImportPage.tsx';
import { ReportsPage } from './frontend/pages/ReportsPage.tsx';
import { UserManagementPage } from './frontend/pages/UserManagementPage.tsx';
import { NotificationsPage } from './frontend/pages/NotificationsPage.tsx';
import { SettingsPage } from './frontend/pages/SettingsPage.tsx';
import { api } from './frontend/lib/api.ts';
import type { DashboardFilters } from './frontend/types/index.ts';

const EMPTY_FILTERS: DashboardFilters = {
  startDate: '',
  endDate: '',
  year: '',
  month: '',
  categoryId: '',
  region: '',
  customerId: '',
};

function DashboardShell() {
  const { firebaseUser, dbUser, loading, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSectionId>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const res = await api.listNotifications('all');
      setUnreadNotifications(res.unreadCount);
    } catch {
      // handled silently
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (dbUser) {
      refreshUnreadCount();
    }
  }, [dbUser, refreshUnreadCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120]">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 mx-auto rounded-lg bg-violet-600 animate-pulse" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Initializing INSIGHT PRO workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !dbUser) {
    return <LoginPage />;
  }

  const currency = dbUser.preferences?.defaultCurrency || 'USD';
  const compactTables = Boolean(dbUser.preferences?.compactTables);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        user={dbUser}
        unreadNotifications={unreadNotifications}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          unreadNotifications={unreadNotifications}
          onOpenMobileNav={() => setMobileOpen(true)}
          onNavigateNotifications={() => setActiveSection('notifications')}
          onQuickExportCsv={() => api.downloadCsvReport(filters)}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewPage
              filters={filters}
              onFiltersChange={setFilters}
              onResetFilters={() => setFilters(EMPTY_FILTERS)}
              currency={currency}
              compactTables={compactTables}
              userRole={dbUser.role}
              onDataMutated={refreshUnreadCount}
            />
          )}
          {activeSection === 'analytics' && (
            <AnalyticsPage
              filters={filters}
              onFiltersChange={setFilters}
              onResetFilters={() => setFilters(EMPTY_FILTERS)}
              currency={currency}
              compactTables={compactTables}
            />
          )}
          {activeSection === 'import' && (
            <DataImportPage
              currency={currency}
              userRole={dbUser.role}
              onDataMutated={refreshUnreadCount}
            />
          )}
          {activeSection === 'reports' && (
            <ReportsPage
              filters={filters}
              onFiltersChange={setFilters}
              onResetFilters={() => setFilters(EMPTY_FILTERS)}
              currency={currency}
              compactTables={compactTables}
              onDataMutated={refreshUnreadCount}
            />
          )}
          {activeSection === 'users' && (
            <UserManagementPage onDataMutated={refreshUnreadCount} />
          )}
          {activeSection === 'notifications' && (
            <NotificationsPage onUnreadChanged={setUnreadNotifications} />
          )}
          {activeSection === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DashboardShell />
      </ThemeProvider>
    </AuthProvider>
  );
}
