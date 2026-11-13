import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';
import { getLoginDestination } from './loginDestination';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { login, isAuthenticated, isAdmin, isLoading, error, clearError } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const requestedPath = (location.state as { from?: { pathname: string } })?.from?.pathname;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getLoginDestination(isAdmin ? 'ADMIN' : 'MEMBER', requestedPath), { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate, requestedPath]);

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
      const signedInUser = await login({ email: email.trim(), password });
      navigate(getLoginDestination(signedInUser.role, requestedPath), { replace: true });
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <div className={`mx-auto max-w-md py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="text-center mb-8">
        <span className="text-4xl">🍿</span>
        <h1 className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome Back</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>
          Sign in to your Snack Overflow account
        </p>
      </div>

      <Card
        className={
          isDark
            ? '!border-slate-700 !bg-slate-900 !text-slate-100 shadow-xl shadow-black/20'
            : ''
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && (
            <div className={`rounded-lg border p-3 text-sm ${
              isDark
                ? 'border-red-900/70 bg-red-950/50 text-red-200'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {formError || error}
            </div>
          )}

          <div>
            <label className={`mb-1 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@snackoverflow.com"
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                isDark
                  ? 'border-slate-600 bg-slate-800 text-white placeholder:text-slate-400'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
              required
            />
          </div>

          <div>
            <label className={`mb-1 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                isDark
                  ? 'border-slate-600 bg-slate-800 text-white placeholder:text-slate-400'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
              required
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className={`mt-6 border-t pt-6 text-center text-sm ${
          isDark ? 'border-slate-700 text-slate-300' : 'border-gray-100 text-gray-500'
        }`}>
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-600 font-medium hover:underline">
            Register as a Member
          </Link>
        </div>
      </Card>

    </div>
  );
};
