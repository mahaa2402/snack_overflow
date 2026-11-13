import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PantryStats, SnackItem } from '../types/snack';
import {
  getPantryStatsApi,
  getPopularSnacksApi,
  getFeaturedSnackApi,
  getSnacksApi,
  toggleVoteApi,
  consumeSnackApi,
} from '../api/snack.api';
import { SnackCard } from '../components/snacks/SnackCard';
import { GrabSnackModal } from '../components/snacks/GrabSnackModal';
import { ActionToast } from '../components/common/ActionToast';
import { getSnackImageUrl } from '../utils/snackImages';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* -------------------------------------------------------------------------- */
/*  CSS Keyframes & Reduced-Motion Accessibility                              */
/* -------------------------------------------------------------------------- */
const PAGE_STYLES = `
  @keyframes pantry-rise {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pantry-toast {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pantry-shimmer-dark {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes pantry-shimmer-light {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .pantry-rise  { animation: pantry-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .pantry-toast { animation: pantry-toast 0.25s ease-out both; }
  .pantry-skeleton-dark {
    background: linear-gradient(90deg, #1e293b 25%, #334155 37%, #1e293b 63%);
    background-size: 800px 100%;
    animation: pantry-shimmer-dark 1.4s linear infinite;
  }
  .pantry-skeleton-light {
    background: linear-gradient(90deg, #f3f4f6 25%, #e7e5e4 37%, #f3f4f6 63%);
    background-size: 800px 100%;
    animation: pantry-shimmer-light 1.4s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .pantry-rise, .pantry-toast, .pantry-skeleton-dark, .pantry-skeleton-light { animation: none !important; }
    .pantry-motion { transition: none !important; transform: none !important; }
  }
`;

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

/* -------------------------------------------------------------------------- */
/*  Custom Animated Number Counter Hook                                        */
/* -------------------------------------------------------------------------- */
function useAnimatedCounter(targetValue: number, duration: number = 750): number {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || targetValue === 0) {
      setDisplayValue(targetValue);
      return;
    }

    let startTimestamp: number | null = null;
    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(ease * targetValue));

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [targetValue, duration]);

  return displayValue;
}

/* -------------------------------------------------------------------------- */
/*  Page Background: Charcoal matrix (Dark) or Warm Paper Dot Grid (Light)    */
/* -------------------------------------------------------------------------- */
const PageBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
    {isDark ? (
      <>
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#0b0f17',
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="absolute bottom-1/3 left-10 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
      </>
    ) : (
      <>
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#faf7f2',
            backgroundImage: 'radial-gradient(#d9d2c5 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/70" />
      </>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Presentational Subcomponents                                               */
/* -------------------------------------------------------------------------- */
interface ActionLinkProps {
  to: string;
  children: React.ReactNode;
  tone?: 'solid' | 'outline';
  isDark?: boolean;
}

const ActionLink: React.FC<ActionLinkProps> = ({ to, children, tone = 'solid', isDark = false }) => {
  const base =
    'pantry-motion group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold ' +
    'transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ' +
    'focus-visible:ring-offset-2 active:scale-95';

  let styles = '';
  if (isDark) {
    styles =
      tone === 'solid'
        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/40 hover:-translate-y-0.5 focus-visible:ring-offset-slate-900'
        : 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-orange-500/50 hover:bg-slate-800 hover:text-white hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-offset-slate-900';
  } else {
    styles =
      tone === 'solid'
        ? 'bg-orange-600 text-white shadow-sm hover:bg-stone-900 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-offset-white'
        : 'border border-stone-300 bg-white text-stone-700 hover:border-orange-600 hover:bg-orange-600 hover:text-white hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-offset-white';
  }

  return (
    <Link to={to} className={`${base} ${styles}`}>
      {children}
      <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
        &rarr;
      </span>
    </Link>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  icon: string;
  action?: React.ReactNode;
  isDark?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon, action, isDark = false }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
          isDark
            ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400 shadow-inner'
            : 'bg-orange-50 ring-1 ring-orange-100 text-orange-600'
        }`}
      >
        {icon}
      </span>
      <div>
        <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
          {title}
        </h2>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);

interface KpiCardProps {
  label: string;
  value: number;
  hint: string;
  icon: string;
  trendText: string;
  accent: 'orange' | 'blue' | 'amber' | 'rose';
  isLoading: boolean;
  index: number;
  isDark: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  hint,
  icon,
  trendText,
  accent,
  isLoading,
  index,
  isDark,
}) => {
  const animatedValue = useAnimatedCounter(isLoading ? 0 : value);

  // Styling accents based on theme
  const getStyles = () => {
    if (isDark) {
      switch (accent) {
        case 'orange':
          return {
            bar: 'bg-gradient-to-r from-orange-500 to-amber-500',
            chip: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
            chipHover: 'group-hover:bg-orange-500 group-hover:text-white',
            value: 'text-white',
            badge: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
          };
        case 'blue':
          return {
            bar: 'bg-gradient-to-r from-sky-500 to-blue-500',
            chip: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
            chipHover: 'group-hover:bg-sky-500 group-hover:text-white',
            value: 'text-white',
            badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
          };
        case 'amber':
          return {
            bar: 'bg-gradient-to-r from-amber-500 to-yellow-500',
            chip: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
            chipHover: 'group-hover:bg-amber-500 group-hover:text-white',
            value: 'text-amber-400',
            badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
          };
        case 'rose':
          return {
            bar: 'bg-gradient-to-r from-rose-500 to-red-500',
            chip: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
            chipHover: 'group-hover:bg-rose-500 group-hover:text-white',
            value: 'text-rose-400',
            badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
          };
      }
    } else {
      switch (accent) {
        case 'orange':
          return {
            bar: 'bg-stone-800',
            chip: 'bg-stone-100 text-stone-700',
            chipHover: 'group-hover:bg-stone-800 group-hover:text-white',
            value: 'text-stone-900',
            badge: 'bg-stone-100 text-stone-600',
          };
        case 'blue':
          return {
            bar: 'bg-sky-600',
            chip: 'bg-sky-50 text-sky-700',
            chipHover: 'group-hover:bg-sky-600 group-hover:text-white',
            value: 'text-stone-900',
            badge: 'bg-sky-50 text-sky-700',
          };
        case 'amber':
          return {
            bar: 'bg-amber-500',
            chip: 'bg-amber-50 text-amber-700',
            chipHover: 'group-hover:bg-amber-500 group-hover:text-white',
            value: 'text-amber-600',
            badge: 'bg-amber-50 text-amber-700',
          };
        case 'rose':
          return {
            bar: 'bg-rose-600',
            chip: 'bg-rose-50 text-rose-700',
            chipHover: 'group-hover:bg-rose-600 group-hover:text-white',
            value: 'text-rose-600',
            badge: 'bg-rose-50 text-rose-700',
          };
      }
    }
  };

  const st = getStyles();

  return (
    <div
      style={delay(120 + index * 70)}
      className={`pantry-rise pantry-motion group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 ${
        isDark
          ? 'border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl shadow-lg hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/15'
          : 'border border-stone-200 bg-white shadow-sm hover:border-stone-300 hover:shadow-xl'
      }`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 ${st.bar}`}
        aria-hidden="true"
      />
      <div className="mb-4 flex items-center justify-between">
        <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
          {label}
        </span>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 ${st.chip} ${st.chipHover}`}
        >
          {icon}
        </span>
      </div>
      {isLoading ? (
        <div className={`${isDark ? 'pantry-skeleton-dark' : 'pantry-skeleton-light'} h-9 w-24 rounded-lg`} />
      ) : (
        <div className={`text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight ${st.value}`}>
          {animatedValue}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={`truncate ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>{hint}</span>
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium shrink-0 ${st.badge}`}>
          {trendText}
        </span>
      </div>
    </div>
  );
};

const CardSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div
    className={`overflow-hidden rounded-2xl p-4 transition-colors ${
      isDark ? 'border border-slate-800/80 bg-slate-900/60 backdrop-blur-md' : 'border border-stone-200 bg-white shadow-sm'
    }`}
  >
    <div className={`${isDark ? 'pantry-skeleton-dark' : 'pantry-skeleton-light'} h-44 w-full rounded-xl`} />
    <div className="mt-4 space-y-3">
      <div className={`${isDark ? 'pantry-skeleton-dark' : 'pantry-skeleton-light'} h-4 w-2/3 rounded`} />
      <div className={`${isDark ? 'pantry-skeleton-dark' : 'pantry-skeleton-light'} h-3 w-1/3 rounded`} />
      <div className={`${isDark ? 'pantry-skeleton-dark' : 'pantry-skeleton-light'} h-9 w-full rounded-lg`} />
    </div>
  </div>
);

const SnackCell: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => (
  <div
    style={delay(Math.min(index, 7) * 60)}
    className="pantry-rise pantry-motion transition-all duration-300 ease-out hover:-translate-y-1.5 hover:drop-shadow-2xl [&>*]:h-full"
  >
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Main HomePage Component                                                   */
/* -------------------------------------------------------------------------- */
export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const [stats, setStats] = useState<PantryStats | null>(null);
  const [featuredSnack, setFeaturedSnack] = useState<SnackItem | null>(null);
  const [popularSnacks, setPopularSnacks] = useState<SnackItem[]>([]);
  const [recentSnacks, setRecentSnacks] = useState<SnackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionMessageVariant, setActionMessageVariant] = useState<'success' | 'error'>('success');
  const [snackToGrab, setSnackToGrab] = useState<SnackItem | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setActionMessage(message);
    setActionMessageVariant(variant);
    toastTimer.current = setTimeout(() => setActionMessage(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsData, featuredData, popularData, inventoryData] = await Promise.all([
        getPantryStatsApi(),
        getFeaturedSnackApi(),
        getPopularSnacksApi(4),
        getSnacksApi({ limit: 8, sortBy: 'name' }),
      ]);

      setStats(statsData);
      setFeaturedSnack(featuredData);
      setPopularSnacks(popularData);
      setRecentSnacks(inventoryData.items);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const extractMessage = (err: unknown, fallback: string): string =>
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : fallback;

  const handleVoteToggle = async (snackId: string) => {
    try {
      const result = await toggleVoteApi(snackId);
      showMessage(result.hasVoted ? 'Your vote has been counted! ❤️' : 'Your vote has been removed.');
      await loadDashboardData();
    } catch (err: unknown) {
      showMessage(extractMessage(err, 'Failed to record vote'), 'error');
    }
  };

  const handleConsume = async (amount: number) => {
    if (!snackToGrab) return;
    const snack = snackToGrab;
    await consumeSnackApi(snack.id, amount);
    showMessage(`Grabbed successfully! You took ${amount} ${amount === 1 ? 'item' : 'items'} of ${snack.name}.`);
    await loadDashboardData();
  };

  /* Pantry health calculations */
  const total = stats?.totalSnacks ?? 0;
  const low = stats?.runningLowCount ?? 0;
  const out = stats?.outOfStockCount ?? 0;
  const healthy = Math.max(total - low - out, 0);
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  /* Low stock snacks list for the quick attention panel */
  const lowStockSnacks = recentSnacks.filter(
    (s) => s.status === 'RUNNING_LOW' || s.status === 'GONE' || s.quantity <= s.lowStockThreshold
  );

  return (
    <div className="space-y-10 pb-16">
      <style>{PAGE_STYLES}</style>
      <PageBackground isDark={isDark} />

      <ActionToast message={actionMessage} dark={isDark} variant={actionMessageVariant} />
      <GrabSnackModal
        snack={snackToGrab}
        dark={isDark}
        onClose={() => setSnackToGrab(null)}
        onConfirm={handleConsume}
      />

      {/* Hero Section */}
      <header
        className={`pantry-rise relative overflow-hidden rounded-3xl p-6 sm:p-10 transition-all duration-300 ${
          isDark
            ? 'border border-slate-800/90 bg-gradient-to-br from-slate-900/95 via-[#111622] to-[#0d121c] text-white shadow-2xl backdrop-blur-xl'
            : 'border border-stone-200 bg-white text-stone-900 shadow-sm'
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl ${
            isDark ? 'bg-orange-500/15' : 'bg-orange-100/70'
          }`}
          aria-hidden="true"
        />
        {isDark && (
          <div
            className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
            aria-hidden="true"
          />
        )}
        <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            
            <h1 className={`text-3xl font-extrabold tracking-tight sm:text-5xl ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Snack{' '}
              <span className={isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500' : 'text-orange-600'}>
                Overflow
              </span>
            </h1>
            <p className={`mt-3 max-w-xl text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
              Discover real-time office stock, grab your favorite bite with atomic inventory updates, and cast votes to decide next week&apos;s pantry refill.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <ActionLink to="/snacks" tone="solid" isDark={isDark}>
              Browse all snacks
            </ActionLink>
            {!isAuthenticated && (
              <ActionLink to="/login" tone="outline" isDark={isDark}>
                Sign in
              </ActionLink>
            )}
          </div>
        </div>
      </header>

      {/* KPI Cards & Stock Health Summary */}
      <section aria-label="Pantry summary" className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <KpiCard
            index={0}
            label="Total Snacks"
            value={stats?.totalSnacks ?? 0}
            hint="Active catalog varieties"
            icon="🍿"
            trendText="Catalog"
            accent="orange"
            isLoading={isLoading}
            isDark={isDark}
          />
          <KpiCard
            index={1}
            label="Available Units"
            value={stats?.totalQuantity ?? 0}
            hint="Ready for pickup"
            icon="📦"
            trendText="In Stock"
            accent="blue"
            isLoading={isLoading}
            isDark={isDark}
          />
          <KpiCard
            index={2}
            label="Running Low"
            value={low}
            hint="Close to reorder limit"
            icon="⚠️"
            trendText={low > 0 ? 'Needs Attention' : 'Optimal'}
            accent="amber"
            isLoading={isLoading}
            isDark={isDark}
          />
          <KpiCard
            index={3}
            label="Out of Stock"
            value={out}
            hint="Depleted inventory"
            icon="🚫"
            trendText={out > 0 ? 'Action Needed' : 'None Empty'}
            accent="rose"
            isLoading={isLoading}
            isDark={isDark}
          />
        </div>

        {/* Stock Health Bar & Capacity Overview */}
        {!isLoading && total > 0 && (
          <div
            style={delay(450)}
            className={`pantry-rise pantry-motion group rounded-2xl p-5 transition-all duration-300 ${
              isDark
                ? 'border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl shadow-lg hover:border-slate-700 hover:shadow-xl'
                : 'border border-stone-200 bg-white shadow-sm hover:shadow-lg'
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={isDark ? 'text-orange-400' : 'text-orange-500'}>📊</span>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
                  Stock Health & Distribution
                </h3>
              </div>
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>{healthy}</span> well stocked ({Math.round(pct(healthy))}%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>{low}</span> running low ({Math.round(pct(low))}%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>{out}</span> out of stock ({Math.round(pct(out))}%)
                </span>
              </div>
            </div>
            <div className={`flex h-3 w-full overflow-hidden rounded-full p-0.5 ${isDark ? 'bg-slate-800/80' : 'bg-stone-100'}`}>
              <div
                className="rounded-l-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out group-hover:brightness-110"
                style={{ width: `${pct(healthy)}%` }}
                title={`${healthy} well stocked`}
              />
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-1000 ease-out group-hover:brightness-110"
                style={{ width: `${pct(low)}%` }}
                title={`${low} running low`}
              />
              <div
                className="rounded-r-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-1000 ease-out group-hover:brightness-110"
                style={{ width: `${pct(out)}%` }}
                title={`${out} out of stock`}
              />
            </div>
          </div>
        )}
      </section>

      {/* Running Out of Stock Quick Action Widget */}
      {!isLoading && lowStockSnacks.length > 0 && (
        <section
          style={delay(350)}
          className={`pantry-rise rounded-2xl p-5 transition-all duration-300 ${
            isDark
              ? 'border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900/70 to-slate-900/70 backdrop-blur-xl shadow-lg'
              : 'border border-amber-200 bg-amber-50/60 shadow-sm'
          }`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                  isDark
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                }`}
              >
                ⚠️
              </span>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Running Out of Stock
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                  Items reaching their low-stock threshold
                </p>
              </div>
            </div>
            <Link
              to="/snacks?status=RUNNING_LOW"
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
            >
              View all low stock &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockSnacks.slice(0, 3).map((snack) => (
              <div
                key={snack.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/60 hover:border-orange-500/40'
                    : 'border-stone-200 bg-white hover:border-orange-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={getSnackImageUrl(snack.name, snack.category)}
                    alt={snack.name}
                    className={`h-10 w-10 rounded-lg object-cover border shrink-0 ${
                      isDark ? 'border-slate-700' : 'border-stone-200'
                    }`}
                  />
                  <div className="min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-stone-900'}`}>
                      {snack.name}
                    </h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      Stock:{' '}
                      <span
                        className={
                          snack.quantity === 0
                            ? 'text-rose-500 font-bold'
                            : 'text-amber-500 font-bold'
                        }
                      >
                        {snack.quantity}
                      </span>{' '}
                      / Min: {snack.lowStockThreshold}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={snack.quantity <= 0}
                  onClick={() => setSnackToGrab(snack)}
                  className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500 hover:text-white'
                      : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-600 hover:text-white'
                  }`}
                >
                  {snack.quantity > 0 ? 'Grab' : 'Empty'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Snack: Snack of the Week */}
      {featuredSnack && (
        <section
          aria-label="Snack of the week"
          style={delay(200)}
          className={`pantry-rise group/feature relative overflow-hidden rounded-3xl p-6 sm:p-10 text-white shadow-2xl transition-all duration-300 ${
            isDark
              ? 'border border-slate-800/90 bg-gradient-to-br from-slate-900 via-[#181310] to-[#0c1017] backdrop-blur-xl hover:border-orange-500/40'
              : 'bg-stone-900 hover:border-orange-500/30'
          }`}
        >
          <div
            className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl transition-opacity duration-500 group-hover/feature:opacity-80"
            aria-hidden="true"
          />
          {isDark && (
            <div
              className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
              aria-hidden="true"
            />
          )}
          <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-12">
            <div className="space-y-4 md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3.5 py-1 text-xs font-semibold text-orange-300 border border-orange-500/30 shadow-inner">
                <span>🏆</span>
                <span>Snack of the week &bull; Most voted</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
                {featuredSnack.name}
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-slate-300">
                The office favourite, leading the leaderboard with{' '}
                <strong className="font-bold text-orange-400">{featuredSnack.voteCount} votes</strong>. Grab one on your way past or cast your vote to keep it on next week&apos;s pantry refill list.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={featuredSnack.quantity <= 0}
                  onClick={() => setSnackToGrab(featuredSnack)}
                  className="pantry-motion inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-600 hover:shadow-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  <span>
                    {featuredSnack.quantity > 0 ? '⚡ Grab one now' : '🚫 Currently out of stock'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVoteToggle(featuredSnack.id)}
                  aria-pressed={featuredSnack.hasVoted}
                  className={`pantry-motion group/vote inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 active:scale-95 ${
                    featuredSnack.hasVoted
                      ? 'border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      : isDark
                      ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-rose-500/50 hover:bg-rose-500/20 hover:text-white'
                      : 'border-white/20 bg-white/10 text-white hover:border-rose-500 hover:bg-rose-500'
                  }`}
                >
                  <span className="transition-transform duration-200 group-hover/vote:scale-125">
                    {featuredSnack.hasVoted ? '❤️' : '🤍'}
                  </span>
                  <span>{featuredSnack.voteCount} votes</span>
                </button>
              </div>
            </div>

            <div className="flex justify-center md:col-span-5">
              <div
                className={`pantry-motion relative h-56 w-full max-w-xs overflow-hidden rounded-2xl shadow-2xl transition-all duration-500 ease-out hover:rotate-0 hover:scale-105 md:rotate-2 sm:h-64 ${
                  isDark
                    ? 'border-2 border-slate-700/80 bg-slate-800/60 hover:border-orange-500/50'
                    : 'border-4 border-white/15 bg-stone-800'
                }`}
              >
                <img
                  src={getSnackImageUrl(featuredSnack.name, featuredSnack.category)}
                  alt={featuredSnack.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-110"
                />
                <div className="absolute right-3 top-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md shadow-md ${
                      featuredSnack.quantity > 0
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-rose-500/90 text-white'
                    }`}
                  >
                    {featuredSnack.quantity} in stock
                  </span>
                </div>
                <div className="absolute left-3 bottom-3">
                  <span className="inline-flex items-center rounded-full bg-slate-950/80 px-2 py-0.5 text-xs font-medium text-slate-300 backdrop-blur-md border border-slate-700/60">
                    {featuredSnack.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular in the Pantry Grid */}
      {(isLoading || popularSnacks.length > 0) && (
        <section className="space-y-5">
          <SectionHeader
            icon="🔥"
            title="Popular in the Pantry"
            subtitle="Top-voted snacks from your teammates"
            isDark={isDark}
            action={
              <Link
                to="/snacks"
                className={`group inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 border ${
                  isDark
                    ? 'text-orange-400 hover:bg-orange-500/15 hover:text-orange-300 border-transparent hover:border-orange-500/30'
                    : 'text-orange-600 hover:bg-orange-50 border-transparent hover:border-orange-200'
                }`}
              >
                See leaderboard
                <span
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  &rarr;
                </span>
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} isDark={isDark} />)
              : popularSnacks.map((snack, i) => (
                  <SnackCell key={snack.id} index={i}>
                    <SnackCard
                      snack={snack}
                      dark={isDark}
                      onVoteToggle={handleVoteToggle}
                      onConsume={(selectedSnack) => setSnackToGrab(selectedSnack)}
                    />
                  </SnackCell>
                ))}
          </div>
        </section>
      )}

      {/* Pantry Inventory Grid */}
      <section className="space-y-5">
        <SectionHeader
          icon="🍴"
          title="Pantry Inventory"
          subtitle="Snacks currently available in the office"
          isDark={isDark}
          action={
            <Link
              to="/snacks"
              className={`pantry-motion inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                isDark
                  ? 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-orange-500/50 hover:bg-slate-800 hover:text-white hover:shadow-md'
                  : 'border border-stone-300 bg-white text-stone-700 hover:border-orange-600 hover:bg-orange-600 hover:text-white hover:shadow-md'
              }`}
            >
              View all snacks ({stats?.totalSnacks ?? 0})
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} isDark={isDark} />)
            : recentSnacks.map((snack, i) => (
                <SnackCell key={snack.id} index={i}>
                  <SnackCard
                    snack={snack}
                    dark={isDark}
                    onVoteToggle={handleVoteToggle}
                    onConsume={(selectedSnack) => setSnackToGrab(selectedSnack)}
                  />
                </SnackCell>
              ))}
        </div>
      </section>

    </div>
  );
};
