import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch {
      // Error handled by AuthContext
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setFormError(null);
    clearError();
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <span className="text-4xl">🍿</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Welcome Back</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to your Snack Overflow account</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {formError || error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@snackoverflow.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              required
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-600 font-medium hover:underline">
            Register as a Member
          </Link>
        </div>
      </Card>

      {/* Quick Fill Demo Accounts Panel */}
      <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-orange-950 uppercase tracking-wider">
            Demo Credentials (Quick-Fill)
          </span>
          <Badge variant="warning">Seeded Users</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('admin@snackoverflow.com', 'Admin@123')}
            className="p-2 text-left bg-white border border-orange-200 rounded-lg hover:border-orange-500 transition-colors shadow-2xs"
          >
            <div className="font-medium text-gray-900 flex items-center justify-between">
              <span>Admin</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono">
                ADMIN
              </span>
            </div>
            <div className="text-gray-500 truncate text-[11px]">admin@snackoverflow.com</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('alice@snackoverflow.com', 'Member@123')}
            className="p-2 text-left bg-white border border-orange-200 rounded-lg hover:border-orange-500 transition-colors shadow-2xs"
          >
            <div className="font-medium text-gray-900 flex items-center justify-between">
              <span>Alice</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                MEMBER
              </span>
            </div>
            <div className="text-gray-500 truncate text-[11px]">alice@snackoverflow.com</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('bob@snackoverflow.com', 'Member@123')}
            className="p-2 text-left bg-white border border-orange-200 rounded-lg hover:border-orange-500 transition-colors shadow-2xs"
          >
            <div className="font-medium text-gray-900 flex items-center justify-between">
              <span>Bob</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                MEMBER
              </span>
            </div>
            <div className="text-gray-500 truncate text-[11px]">bob@snackoverflow.com</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('charlie@snackoverflow.com', 'Member@123')}
            className="p-2 text-left bg-white border border-orange-200 rounded-lg hover:border-orange-500 transition-colors shadow-2xs"
          >
            <div className="font-medium text-gray-900 flex items-center justify-between">
              <span>Charlie</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                MEMBER
              </span>
            </div>
            <div className="text-gray-500 truncate text-[11px]">charlie@snackoverflow.com</div>
          </button>
        </div>
      </div>
    </div>
  );
};

