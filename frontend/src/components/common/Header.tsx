import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from './Badge';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Snacks', path: '/snacks' },
    ...(isAuthenticated && !isAdmin ? [{ label: 'My Pantry', path: '/my-pantry' }] : []),
    ...(isAdmin ? [{ label: 'Admin Console', path: '/admin' }] : []),
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0b0f17]/90 border-b border-slate-800/80 backdrop-blur-md shadow-xl shadow-black/20'
          : 'bg-stone-900 border-b border-stone-800/80 backdrop-blur-md shadow-xl shadow-black/20'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand Logo & Main Nav */}
          <div className="flex min-w-0 flex-1 items-center gap-3 xl:gap-6">
            <Link to="/" className="flex shrink-0 items-center space-x-2.5 group">
              <span className="text-2xl transform group-hover:scale-110 transition-transform" role="img" aria-label="popcorn">
                🍿
              </span>
              <span className="text-xl font-bold tracking-tight text-white">
                Snack <span className={isDark ? 'text-orange-500' : 'text-orange-400'}>Overflow</span>
              </span>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:flex">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`shrink-0 rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 xl:px-3 xl:text-sm ${
                      isActive
                        ? isDark
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-inner'
                          : 'bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-inner'
                        : isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800/70'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile / Auth Actions & Theme Switcher on the Right Corner */}
          <div className="flex shrink-0 items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-sm font-semibold text-white">
                    {user.name}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-300'}`}>
                    {user.email}
                  </span>
                </div>

                <Badge variant={user.role === 'ADMIN' ? 'warning' : 'default'} className="uppercase">
                  {user.role}
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={logout}
                  className={`text-xs ml-1 ${
                    isDark
                      ? '!border-slate-600 !bg-slate-800 !text-slate-100 hover:!border-slate-500 hover:!bg-slate-700 hover:!text-white'
                      : '!border-stone-700 !bg-stone-800 !text-stone-100 hover:!border-stone-600 hover:!bg-stone-700 hover:!text-white'
                  }`}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center space-x-2">
                <Link to="/login">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`text-xs ${
                      isDark
                        ? '!border-slate-600 !bg-slate-800 !text-slate-100 hover:!border-slate-500 hover:!bg-slate-700 hover:!text-white'
                        : '!border-stone-700 !bg-stone-800 !text-stone-100 hover:!border-stone-600 hover:!bg-stone-700 hover:!text-white'
                    }`}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" variant="primary" className="text-xs shadow-md shadow-orange-500/20">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            {/* Admin Notification Bell */}
            {isAdmin && <NotificationBell />}

            {/* Right-corner Theme Toggle Icon */}
            <div className={`pl-1 border-l ml-1 ${isDark ? 'border-slate-800' : 'border-stone-700'}`}>
              <ThemeToggle variant="header" />
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-2 md:hidden" aria-label="Mobile navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-orange-500/15 text-orange-400'
                      : 'bg-orange-500/15 text-orange-300'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
