import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Heart,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ThumbsUp,
  Trophy,
} from 'lucide-react';
import { getMyPantryDashboardApi } from '../api/snack.api';
import { MyPantryDashboard } from '../types/snack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useRealtimeRefresh } from '../context/RealtimeUpdatesContext';

interface ChartEntry {
  key: string;
  label: string;
  amount: number;
}

const cardClass =
  'pantry-card animate-fade-in-up rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.01] hover:border-orange-400 active:scale-[0.99]';

const categoryLabel = (category: string) =>
  category.replace('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const SectionTitle: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
}> = ({ eyebrow, title, description, icon }) => (
  <div className="mb-5 flex items-start gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
      {icon}
    </span>
    <div>
      {eyebrow && (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  </div>
);

const ConsumptionChart: React.FC<{
  title: string;
  description: string;
  entries: ChartEntry[];
}> = ({ title, description, entries }) => {
  const maxAmount = Math.max(1, ...entries.map((entry) => entry.amount));
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          {total} {total === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label={`${title}: ${total} items consumed`}>
        {entries.map((entry, index) => {
          const height = entry.amount === 0 ? 3 : Math.max(9, (entry.amount / maxAmount) * 100);
          return (
            <div
              key={entry.key}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              title={`${entry.label}: ${entry.amount} ${entry.amount === 1 ? 'item' : 'items'}`}
            >
              <span className="text-[10px] font-semibold text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
                {entry.amount}
              </span>
              <div className="flex h-[72%] w-full items-end justify-center">
                <div
                  className={`w-full max-w-9 rounded-t-lg transition-all duration-700 ${
                    entry.amount > 0
                      ? index === entries.length - 1
                        ? 'bg-orange-500 group-hover:bg-orange-600'
                        : 'bg-orange-200 group-hover:bg-orange-300'
                      : 'bg-slate-100'
                  }`}
                  style={{ height: `${height}%`, animationDelay: `${index * 45}ms` }}
                />
              </div>
              <span className="max-w-full truncate text-[10px] font-medium text-slate-500 sm:text-xs">
                {entry.label}
              </span>
            </div>
          );
        })}
      </div>
      {total === 0 && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Your snack activity will appear here.
        </p>
      )}
    </section>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  accent?: string;
}> = ({ title, value, detail, icon, accent = 'bg-orange-50 text-orange-600' }) => (
  <article className={`${cardClass} p-5`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <p className="mt-3 truncate text-2xl font-extrabold tracking-tight text-slate-900">
          {value}
        </p>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </span>
    </div>
    <p className="mt-3 truncate text-xs text-slate-500">{detail}</p>
  </article>
);

export const MyPantryPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [dashboard, setDashboard] = useState<MyPantryDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDashboard(await getMyPantryDashboardApi());
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'We could not load your pantry dashboard. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useRealtimeRefresh(loadDashboard);

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className={`my-pantry min-h-full space-y-7 pb-12 ${isDark ? 'my-pantry-dark text-slate-100' : 'text-slate-900'}`}>
      <header className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white px-6 py-7 shadow-sm sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-36 h-40 w-40 rounded-full bg-amber-50 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <Sparkles size={14} />
              Your personal pantry
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              My Pantry<span className="text-orange-500">.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Take a look at your
              snack picks, voting, and pantry habits.
            </p>
          </div>
         
        </div>
      </header>

      {isLoading && !dashboard ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
          <LoaderCircle size={28} className="animate-spin text-orange-500" />
          <p className="mt-3 text-sm font-medium">Loading your pantry insights…</p>
        </div>
      ) : error && !dashboard ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Your pantry dashboard could not load.</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Try again
          </button>
        </div>
      ) : dashboard ? (
        <>
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Refresh failed: {error}
            </div>
          )}

          <section aria-label="Pantry overview">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                Your overview
              </h2>
              <span className="text-xs text-slate-400">All-time personal stats</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Snacks consumed"
                value={dashboard.overview.totalConsumed}
                detail="Items you have grabbed"
                icon={<PackageCheck size={19} />}
              />
              <MetricCard
                title="Favourite snack"
                value={dashboard.overview.favouriteSnack?.name ?? 'Not yet'}
                detail={
                  dashboard.overview.favouriteSnack
                    ? `${dashboard.overview.favouriteSnack.amount} items consumed`
                    : 'Grab a snack to find your favourite'
                }
                icon={<Heart size={19} />}
              />
              <MetricCard
                title="Total votes"
                value={dashboard.overview.totalVotes}
                detail="Snacks you are currently rooting for"
                icon={<ThumbsUp size={19} />}
              />
              <MetricCard
                title="Active days"
                value={dashboard.overview.activeDays}
                detail="Days you have grabbed a snack"
                icon={<CalendarDays size={19} />}
              />
            </div>
          </section>

          <section aria-label="Consumption charts">
            <SectionTitle
              eyebrow="Your habits"
              title="Consumption over time"
              description="A clear picture of what you have been enjoying lately."
              icon={<ChartNoAxesColumnIncreasing size={20} />}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ConsumptionChart
                title="This week"
                description="Items consumed across the last 7 days"
                entries={dashboard.weeklyConsumption.map((item) => ({
                  key: item.date,
                  label: item.label,
                  amount: item.amount,
                }))}
              />
              <ConsumptionChart
                title="Monthly trend"
                description="Your consumption over the last 6 months"
                entries={dashboard.monthlyConsumption.map((item) => ({
                  key: item.month,
                  label: item.label,
                  amount: item.amount,
                }))}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]" aria-label="Personal recap and favourites">
            <article className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white p-5 sm:p-6">
                <SectionTitle
                  eyebrow={`${monthName} recap`}
                  title="Your month in the pantry"
                  description="A little snapshot of your recent routine."
                  icon={<Sparkles size={19} />}
                />
              </div>
              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Items consumed</p>
                  <p className="mt-1 text-3xl font-extrabold text-slate-950">
                    {dashboard.monthlyRecap.consumed}
                  </p>
               
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold text-slate-500">Your pace</p>
                  <div className="mt-2 flex items-center gap-2">
                    {dashboard.monthlyRecap.changePercent !== null &&
                    dashboard.monthlyRecap.changePercent < 0 ? (
                      <ArrowDownRight size={18} className="text-slate-400" />
                    ) : (
                      <ArrowUpRight size={18} className="text-orange-500" />
                    )}
                    <span className="text-sm font-bold text-slate-800">
                      {dashboard.monthlyRecap.activeDays}{' '}
                      {dashboard.monthlyRecap.activeDays === 1 ? 'active day' : 'active days'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {dashboard.monthlyRecap.favouriteSnack
                      ? `${dashboard.monthlyRecap.favouriteSnack.name} is your top pick this month.`
                      : 'Your monthly favourite will show up after your next snack grab.'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
                    <Trophy size={17} className="shrink-0 text-orange-600" />
                    <span>
                      {dashboard.monthlyRecap.consumed === 0
                        ? 'Your monthly recap is ready when you are. Grab a snack to start building your history.'
                        : `Nice going! You enjoyed ${dashboard.monthlyRecap.consumed} ${dashboard.monthlyRecap.consumed === 1 ? 'snack' : 'snacks'} across ${dashboard.monthlyRecap.activeDays} ${dashboard.monthlyRecap.activeDays === 1 ? 'day' : 'days'} this month.`}
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <article className={`${cardClass} p-5 sm:p-6`}>
              <SectionTitle
                eyebrow="Your top picks"
                title="Favourite snacks"
                description="Ranked by the number of items you have consumed."
                icon={<Heart size={19} />}
              />
              {dashboard.favouriteSnacks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-7 text-center">
                  <p className="text-sm font-semibold text-slate-700">No favourites just yet</p>
                  <p className="mt-1 text-xs text-slate-500">Your snack grabs will shape this list.</p>
                  <Link
                    to="/snacks"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    Explore snacks <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <ol className="space-y-4">
                  {dashboard.favouriteSnacks.map((snack, index) => {
                    const maxAmount = dashboard.favouriteSnacks[0].amount || 1;
                    return (
                      <li key={snack.id} className="group">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                                index === 0
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {index === 0 ? <Trophy size={15} /> : `0${index + 1}`}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {snack.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {categoryLabel(snack.category)}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-slate-700">
                            {snack.amount} {snack.amount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div className="ml-11 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-orange-400 transition-all duration-700 group-hover:bg-orange-500"
                            style={{ width: `${Math.max(8, (snack.amount / maxAmount) * 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          </section>

          <section className={`${cardClass} p-5 sm:p-6`} aria-label="Personal activity timeline">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                eyebrow="Just for you"
                title="Your pantry activity"
                description="A personal timeline of your snack grabs and votes."
                icon={<Clock3 size={19} />}
              />
              {dashboard.timeline.length > 0 && (
                <span className="mb-5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Latest {dashboard.timeline.length}
                </span>
              )}
            </div>
            {dashboard.timeline.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <ShoppingBag size={24} className="mx-auto text-orange-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Your story starts here</p>
                <p className="mt-1 text-xs text-slate-500">
                  Snack grabs and votes you make will appear in this timeline.
                </p>
                <Link
                  to="/snacks"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Browse the pantry <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <ol className="relative space-y-1 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-orange-100">
                {dashboard.timeline.map((event) => {
                  const isVote = event.type === 'VOTED';
                  const Icon = isVote ? ThumbsUp : ShoppingBag;
                  return (
                    <li key={`${event.type}-${event.id}`} className="relative flex gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-orange-50/50">
                      <span
                        className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white ${
                          isVote ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col justify-center sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700">
                            You {isVote ? 'voted for' : 'grabbed'}{' '}
                            <span className="break-all font-bold text-slate-900">
                              {event.snackName}
                            </span>
                            {!isVote && (
                              <span className="ml-1 text-slate-500">
                                · {event.amount} {event.amount === 1 ? 'item' : 'items'}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {categoryLabel(event.category)}
                          </p>
                        </div>
                        <time
                          dateTime={event.createdAt}
                          className="mt-1 shrink-0 text-xs font-medium text-slate-400 sm:mt-0"
                        >
                          {new Date(event.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
};
