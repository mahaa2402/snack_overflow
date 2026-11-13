import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';
import { getLoginDestination } from './loginDestination';
import loginBackground from '../assets/login-abstract-bg.svg';

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
    <div className={`relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-gradient-to-br from-slate-950 via-[#1c1715] to-[#0b0f17]'
            : 'bg-gradient-to-br from-orange-50 via-[#fffaf4] to-amber-100'
        }`}
        aria-hidden="true"
      />
      <img
        src={loginBackground}
        alt=""
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${
          isDark ? 'opacity-30' : 'opacity-70'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark ? 'bg-slate-950/50' : 'bg-white/20'
        }`}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,0.9fr)] lg:gap-14">
        <section className="hidden lg:block">
          <div className={`mb-7 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
            isDark
              ? 'border-orange-500/25 bg-orange-500/10 text-orange-300'
              : 'border-orange-200 bg-white/70 text-orange-700'
          }`}>
            Office Pantry
          </div>
          <h2 className={`max-w-lg text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}>
            A better break
            <br />
            starts <span className="text-orange-500">here.</span>
          </h2>
          <p className={`mt-5 max-w-md text-base leading-7 ${
            isDark ? 'text-slate-300' : 'text-stone-600'
          }`}>
            Check what&apos;s in stock, grab a favorite, and help your team decide what to refill next.
          </p>
          <div className={`mt-9 h-1 w-16 rounded-full ${isDark ? 'bg-orange-400' : 'bg-orange-500'}`} />
          <p className={`mt-4 text-sm font-semibold tracking-wide ${
            isDark ? 'text-slate-400' : 'text-stone-500'
          }`}>
            SNACK OVERFLOW
          </p>
        </section>

        <div
          className={`hidden h-72 w-px lg:block ${
            isDark
              ? 'bg-gradient-to-b from-transparent via-slate-1000 to-transparent'
              : 'bg-gradient-to-b from-transparent via-stone-800 to-transparent'
          }`}
          aria-hidden="true"
        />

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${
              isDark ? 'text-orange-300' : 'text-orange-700'
            }`}>
              Account access
            </p>
            <h1 className={`mt-2 text-3xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-stone-900'
            }`}>
              Welcome back
            </h1>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
              Sign in to your Snack Overflow account.
            </p>
          </div>

        <Card
          className={
            isDark
              ? '!border-slate-700 !bg-slate-900 !text-slate-100 shadow-2xl shadow-black/30'
              : '!border-stone-200 !bg-white/95 shadow-2xl shadow-stone-900/10 backdrop-blur-sm'
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
            <Link to="/signup" className="font-medium text-orange-600 hover:underline">
              Register as a Member
            </Link>
          </div>
        </Card>
        </section>
      </div>
    </div>
  );
};
