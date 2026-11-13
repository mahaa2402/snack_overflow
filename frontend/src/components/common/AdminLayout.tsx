import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  House,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

const adminNavItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Pantry Inventory', path: '/admin/inventory', icon: Boxes },
  { label: 'Smart Restock', path: '/admin/restock', icon: Sparkles },
  { label: 'Pantry Insights', path: '/admin/insights', icon: ChartNoAxesCombined },
  { label: 'Activity Log', path: '/admin/activity', icon: ClipboardList },
];

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const shellColor = isDark
    ? 'bg-[#0b0f17] text-slate-100'
    : 'bg-[#e9edf4] text-gray-900';
  const sidebarColor = isDark
    ? 'bg-[#111827] border-slate-800'
    : 'bg-[#dfe5ee] border-slate-300';

  return (
    <div className={`admin-shell flex min-h-screen ${shellColor}`}>
      <aside
        className={`sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r lg:w-64 ${sidebarColor}`}
        aria-label="Admin sidebar"
      >
        <Link
          to="/admin"
          className="flex h-16 shrink-0 items-center gap-2 border-b border-inherit px-4"
          aria-label="Snack Overflow admin dashboard"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/20">
            <Boxes size={19} strokeWidth={2.2} />
          </span>
          <span className={`truncate text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Snack <span className="text-orange-500">Overflow</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Admin pages">
          {adminNavItems.map((item) => {
            const isActive =
              item.path === '/admin'
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? isDark
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                      : 'border-orange-200 bg-orange-50 text-orange-700'
                    : isDark
                    ? 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white'
                    : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-white/70 hover:text-gray-900'
                }`}
              >
                <item.icon
                  size={19}
                  strokeWidth={1.9}
                  className={`shrink-0 ${isActive ? 'text-orange-500' : 'group-hover:text-orange-500'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <div className={`my-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-300'}`} />
          <Link
            to="/"
            title="Back to site"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              isDark
                ? 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                : 'text-gray-600 hover:bg-white/70 hover:text-gray-900'
            }`}
          >
            <House size={19} strokeWidth={1.9} className="shrink-0" />
            <span>Back to Site</span>
          </Link>
        </nav>

        <div className={`shrink-0 border-t p-3 ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-sm font-bold text-orange-600">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                {user?.name || 'Admin'}
              </p>
              <p className="hidden truncate text-xs text-gray-500 lg:block">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              title="Logout"
              aria-label="Logout"
              className={`shrink-0 rounded-lg p-2 transition-colors ${
                isDark
                  ? 'text-slate-400 hover:bg-orange-500/10 hover:text-orange-400'
                  : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6 ${
            isDark
              ? 'border-slate-800/80 bg-[#0d121c] text-white'
              : 'border-slate-300 bg-[#f8fafc]'
          }`}
        >
          <div className="min-w-0">
            <h1 className={`truncate text-base font-bold sm:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {adminNavItems.find((item) => item.path === location.pathname)?.label || 'Admin'}
            </h1>
            <p className="hidden text-xs text-gray-500 sm:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <span
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold sm:inline-flex ${
                isDark
                  ? 'border-orange-500/25 bg-orange-500/10 text-orange-300'
                  : 'border-orange-200 bg-orange-50 text-orange-700'
              }`}
            >
              <ShieldCheck size={14} />
              ADMIN
            </span>
            <div className={`border-l pl-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <ThemeToggle variant="header" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};
