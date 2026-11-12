import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { Button } from './Button';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Snacks', path: '/snacks' },
    ...(isAdmin ? [{ label: 'Admin Dashboard', path: '/admin' }] : []),
  ];

  return (
    <header className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Main Nav */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <span className="text-2xl transform group-hover:scale-110 transition-transform" role="img" aria-label="popcorn">
                🍿
              </span>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Snack <span className="text-orange-600">Overflow</span>
              </span>
            </Link>

            <nav className="hidden md:flex space-x-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile / Auth Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>

                <Badge variant={user.role === 'ADMIN' ? 'warning' : 'default'} className="uppercase">
                  {user.role}
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={logout}
                  className="text-xs ml-1"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button size="sm" variant="outline" className="text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" variant="primary" className="text-xs">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
