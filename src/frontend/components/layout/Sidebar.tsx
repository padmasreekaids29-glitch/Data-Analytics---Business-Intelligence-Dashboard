import {
  BarChart3,
  Bell,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import type { DbUser } from '../../types/index.ts';

export type NavSectionId =
  | 'overview'
  | 'analytics'
  | 'import'
  | 'reports'
  | 'users'
  | 'notifications'
  | 'settings';

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  user: DbUser | null;
  unreadNotifications: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSectionId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Data Analytics', icon: BarChart3 },
  { id: 'import', label: 'Data Import', icon: UploadCloud },
  { id: 'reports', label: 'Reports & Export', icon: FileText },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  user,
  unreadNotifications,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  const handleNav = (id: NavSectionId) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-64 bg-[#0B1120] text-slate-200 border-r border-slate-800/80 select-none">
      {/* Brand Zone */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap truncate">
            INSIGHT PRO
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'notifications' && unreadNotifications > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-violet-600/30 text-violet-200'
                  }`}
                >
                  {unreadNotifications}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Footer */}
      {user && (
        <div className="p-4 border-t border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={
                user.photoUrl ||
                '/src/assets/images/avatar_executive_user_1794846102549.jpg'
              }
              alt={user.displayName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/src/assets/images/avatar_executive_user_1794846102549.jpg';
              }}
              className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
              <p className="text-xs text-slate-400 truncate">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} · {user.department}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
