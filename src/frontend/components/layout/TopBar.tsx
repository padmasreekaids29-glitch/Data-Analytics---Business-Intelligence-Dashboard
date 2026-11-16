import { Bell, Download, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { NavSectionId } from './Sidebar.tsx';

interface TopBarProps {
  activeSection: NavSectionId;
  unreadNotifications: number;
  onOpenMobileNav: () => void;
  onNavigateNotifications: () => void;
  onQuickExportCsv: () => void;
}

const SECTION_LABELS: Record<NavSectionId, string> = {
  overview: 'Executive Overview',
  analytics: 'Data Analytics',
  import: 'Data Import & Datasets',
  reports: 'Reports & Export Center',
  users: 'User Management & RBAC',
  notifications: 'Notifications & KPI Alerts',
  settings: 'Workspace Settings',
};

export function TopBar({
  activeSection,
  unreadNotifications,
  onOpenMobileNav,
  onNavigateNotifications,
  onQuickExportCsv,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex items-center justify-between gap-4 shrink-0 no-print">
      {/* Left Zone: Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline whitespace-nowrap">
            INSIGHT PRO
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
          <h1 className="font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
            {SECTION_LABELS[activeSection]}
          </h1>
        </div>
      </div>

      {/* Right Zone: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark navy theme'}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Navy Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onNavigateNotifications}
          className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open notifications"
          title="Notifications & KPI Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-violet-600 text-white text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onQuickExportCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Export CSV</span>
        </button>
      </div>
    </header>
  );
}
