import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CreateSnackInput, PantryInsights, PantryStats, SnackItem, UpdateSnackInput } from '../types/snack';
import {
  getPantryStatsApi,
  getSnacksApi,
  createSnackApi,
  updateSnackApi,
  deleteSnackApi,
  restockSnackApi,
  getPantryInsightsApi,
} from '../api/snack.api';
import { SnackModal } from '../components/snacks/SnackModal';
import { RestockModal } from '../components/snacks/RestockModal';
import { getSnackImageUrl } from '../utils/snackImages';
import { useTheme } from '../context/ThemeContext';
import {
  Activity,
  AlertTriangle,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  Flame,
  House,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  Plus,
} from 'lucide-react';

// ─── Animated Number Counter ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  isDark: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix = '',
  trend,
  trendUp,
  icon,
  isDark,
  delay = 0,
}) => {
  const animated = useCountUp(value);

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`admin-stat-card relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 group ${
        isDark
          ? 'bg-slate-900/60 border border-slate-800/90 backdrop-blur-xl shadow-lg hover:border-orange-500/60 hover:shadow-2xl hover:shadow-orange-500/10'
          : 'bg-white border border-stone-200 shadow-sm hover:border-orange-400/70 hover:shadow-xl'
      }`}
    >
      {/* Expanding Top Accent Bar */}
      <span
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-orange-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
          {label}
        </p>
        {icon && (
          <span className="text-orange-500 transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <span className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
          {animated.toLocaleString()}{suffix}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
              trendUp
                ? isDark
                  ? 'text-orange-300 bg-orange-500/15 border border-orange-500/30'
                  : 'text-orange-700 bg-orange-50'
                : isDark
                ? 'text-orange-300 bg-orange-500/15 border border-orange-500/30'
                : 'text-orange-700 bg-orange-50'
            }`}
          >
            {trendUp ? '↑' : '•'} {trend}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Inline Bar Chart ─────────────────────────────────────────────────────────
interface BarChartPoint {
  label: string;
  consumed: number;
  restocked: number;
}
interface BarChartProps {
  data: BarChartPoint[];
  maxVal: number;
  hoveredIndex: number | null;
  onHover: (i: number | null) => void;
  isDark: boolean;
}

const BarChart: React.FC<BarChartProps> = ({ data, maxVal, hoveredIndex, onHover, isDark }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex items-end justify-between gap-2 h-40 w-full pt-4">
      {data.map((point, i) => {
        const consumedH = maxVal > 0 ? (point.consumed / maxVal) * 100 : 0;
        const restockedH = maxVal > 0 ? (point.restocked / maxVal) * 100 : 0;
        const isHovered = hoveredIndex === i;

        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group relative"
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
          >
            {/* Tooltip */}
            {isHovered && (
              <div
                className={`absolute z-20 text-xs rounded-xl p-2.5 -top-16 shadow-2xl whitespace-nowrap pointer-events-none transition-all ${
                  isDark
                    ? 'bg-slate-950 text-white border border-slate-700 shadow-black'
                    : 'bg-stone-900 text-white shadow-stone-900/40'
                }`}
              >
                <div className="font-bold border-b border-white/10 pb-1 mb-1">{point.label}</div>
                <div className="text-orange-400 font-semibold">Consumed: {point.consumed} units</div>
                <div className="text-slate-400 font-semibold">Restocked: {point.restocked} units</div>
              </div>
            )}

            {/* Side-by-side bars */}
            <div className="w-full flex items-end justify-center gap-1 h-32 relative">
              {/* Consumed bar (orange gradient) */}
              <div
                className="w-1/2 rounded-t-md transition-all duration-700 ease-out shadow-xs"
                style={{
                  height: mounted ? `${consumedH}%` : '0%',
                  background: isHovered
                    ? '#ea580c'
                    : 'linear-gradient(to top, #f97316, #fb923c)',
                  transitionDelay: `${i * 30}ms`,
                  minHeight: point.consumed > 0 ? '4px' : '0',
                }}
              />
              {/* Restocked bar */}
              <div
                className="w-1/2 rounded-t-md transition-all duration-700 ease-out"
                style={{
                  height: mounted ? `${restockedH}%` : '0%',
                  background: isHovered
                    ? isDark ? '#475569' : '#cbd5e1'
                    : isDark ? '#334155' : '#e2e8f0',
                  transitionDelay: `${i * 30 + 15}ms`,
                  minHeight: point.restocked > 0 ? '4px' : '0',
                }}
              />
            </div>
            <span className={`text-[10px] font-semibold mt-1 truncate max-w-full text-center ${
              isDark ? 'text-slate-400' : 'text-stone-500'
            }`}>
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Storage Meter ────────────────────────────────────────────────────────────
interface StorageMeterProps {
  label: string;
  current: number;
  total: number;
  isDark: boolean;
}

const StorageMeter: React.FC<StorageMeterProps> = ({
  label,
  current,
  total,
  isDark,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Boxes size={14} className="text-orange-500" />
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
            {label}
          </span>
        </div>
        <span className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-stone-600'}`}>
          {pct}%
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden p-0.5 ${isDark ? 'bg-slate-800' : 'bg-stone-100'}`}>
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-1000 ease-out"
          style={{ width: mounted ? `${pct}%` : '0%' }}
        />
      </div>
      <div className={`flex justify-between text-[10px] ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
        <span>0</span>
        <span className="font-semibold text-slate-400">{current} units</span>
        <span>{total}</span>
      </div>
    </div>
  );
};

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
export const AdminDashboardPage: React.FC = () => {
  const { isDark } = useTheme();

  const [stats, setStats] = useState<PantryStats | null>(null);
  const [snacks, setSnacks] = useState<SnackItem[]>([]);
  const [insights, setInsights] = useState<PantryInsights | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Modals
  const [isSnackModalOpen, setIsSnackModalOpen] = useState(false);
  const [snackToEdit, setSnackToEdit] = useState<SnackItem | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [snackToRestock, setSnackToRestock] = useState<SnackItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, snacksData, insightsData] = await Promise.all([
        getPantryStatsApi(),
        getSnacksApi({ limit: 100, sortBy: 'name' }),
        getPantryInsightsApi(),
      ]);
      setStats(statsData);
      setSnacks(snacksData.items);
      setInsights(insightsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateOrUpdateSnack = async (data: CreateSnackInput | UpdateSnackInput) => {
    try {
      if (snackToEdit) {
        await updateSnackApi(snackToEdit.id, data as UpdateSnackInput);
        showToast('Snack updated successfully');
      } else {
        await createSnackApi(data as CreateSnackInput);
        showToast('New snack added to pantry');
      }
      await loadAdminData();
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleRestockSnack = async (snackId: string, amount: number) => {
    try {
      await restockSnackApi(snackId, amount);
      showToast(`Added +${amount} units to stock!`);
      await loadAdminData();
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleDeleteSnack = async (snack: SnackItem) => {
    if (window.confirm(`Delete "${snack.name}" from the pantry?`)) {
      try {
        await deleteSnackApi(snack.id);
        showToast(`"${snack.name}" deleted`);
        await loadAdminData();
      } catch (err: unknown) {
        const msg = typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to delete';
        showToast(msg);
      }
    }
  };

  const filteredSnacks = snacks.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Low-stock snacks
  const lowStockSnacks = snacks
    .filter((s) => s.status === 'RUNNING_LOW' || s.status === 'GONE' || s.quantity <= s.lowStockThreshold)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  // Top voted snacks
  const topVoted = [...snacks].sort((a, b) => b.voteCount - a.voteCount).slice(0, 5);

  // Category breakdown
  const categoryBreakdown = insights?.categoryBreakdown || [];

  // Bar chart data
  const chartData = (() => {
    if (!insights) return [];
    if (timeRange === 'Daily')
      return insights.consumptionTrends.daily.map((d) => ({
        label: d.dayLabel,
        consumed: d.consumed,
        restocked: d.restocked,
      }));
    if (timeRange === 'Weekly')
      return insights.consumptionTrends.weekly.map((w) => ({
        label: w.weekLabel,
        consumed: w.consumed,
        restocked: w.restocked,
      }));
    return insights.consumptionTrends.monthly.map((m) => ({
      label: m.monthLabel,
      consumed: m.consumed,
      restocked: m.restocked,
    }));
  })();

  const chartMax = Math.max(...chartData.map((d) => Math.max(d.consumed, d.restocked)), 10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center space-y-3">
          <div className="flex justify-center text-orange-500"><Boxes size={34} className="animate-pulse" /></div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            Loading pantry dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 right-6 z-50 text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border flex items-center space-x-2 backdrop-blur-md ${
            isDark
              ? 'bg-slate-900/95 text-white border-orange-500/40 shadow-orange-500/10'
              : 'bg-gray-900 text-white border-gray-700'
          }`}
        >
          <span className="text-orange-400"><Activity size={16} /></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <House size={20} className="text-orange-500" />
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Pantry Operations Dashboard
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            Live overview of stock levels, consumption velocity, and replenishments
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSnackToEdit(null);
              setIsSnackModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-150 hover:bg-orange-600 active:scale-95"
          >
            <Plus size={16} />
            <span>Add Snack</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Snack Types"
          value={stats?.totalSnacks ?? 0}
          icon={<Boxes size={19} />}
          isDark={isDark}
          delay={0}
        />
        <StatCard
          label="Total Units in Stock"
          value={stats?.totalQuantity ?? 0}
          trend={`${stats?.stockedCount ?? 0} stocked`}
          trendUp={(stats?.stockedCount ?? 0) > 0}
          icon={<Package size={19} />}
          isDark={isDark}
          delay={80}
        />
        <StatCard
          label="Running Low"
          value={stats?.runningLowCount ?? 0}
          trend={stats?.runningLowCount ? `${stats.runningLowCount} items` : undefined}
          trendUp={false}
          icon={<AlertTriangle size={19} />}
          isDark={isDark}
          delay={160}
        />
        <StatCard
          label="Out of Stock"
          value={stats?.outOfStockCount ?? 0}
          icon={<PackageX size={19} />}
          isDark={isDark}
          delay={240}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* LEFT COLUMN: Operational Chart + Running Out Table */}
        <div className="xl:col-span-3 space-y-6">
          {/* Consumption Trends Chart */}
          <div
            className={`rounded-2xl p-6 transition-all ${
              isDark
                ? 'bg-slate-900/60 border border-slate-800/90 backdrop-blur-xl shadow-xl'
                : 'bg-white border border-stone-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Operational Metrics
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                  Consumption vs restock velocity
                </p>
              </div>
              <div
                className={`flex p-1 rounded-xl border ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-stone-100 border-stone-200'
                }`}
              >
                {(['Daily', 'Weekly', 'Monthly'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      timeRange === range
                        ? 'bg-orange-500 text-white shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Y-axis & Chart */}
            <div className="flex gap-3">
              <div className={`flex flex-col justify-between text-[10px] py-1 w-6 text-right shrink-0 ${
                isDark ? 'text-slate-600' : 'text-stone-300'
              }`}>
                {[...Array(5)].map((_, i) => (
                  <span key={i}>{Math.round((chartMax / 4) * (4 - i))}</span>
                ))}
              </div>
              <div className="flex-1 relative">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`border-t w-full ${isDark ? 'border-slate-800/60' : 'border-stone-100'}`}
                    />
                  ))}
                </div>
                {chartData.length > 0 ? (
                  <BarChart
                    data={chartData}
                    maxVal={chartMax}
                    hoveredIndex={hoveredBarIndex}
                    onHover={setHoveredBarIndex}
                    isDark={isDark}
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-slate-500">
                    No activity data recorded yet
                  </div>
                )}
              </div>
            </div>

            {/* Chart Legend */}
            <div
              className={`flex items-center space-x-6 mt-4 pt-3 border-t text-xs ${
                isDark ? 'border-slate-800/80 text-slate-400' : 'border-stone-100 text-stone-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" />
                <span className="font-medium">Consumed Snacks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-stone-300'}`} />
                <span className="font-medium">Restocked Units</span>
              </div>
            </div>
          </div>

          {/* Product Running Out of Stock Table (Matches User Reference Image) */}
          <div
            className={`rounded-2xl border overflow-hidden transition-all ${
              isDark
                ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl shadow-xl'
                : 'bg-white border-stone-200 shadow-sm'
            }`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${
                isDark ? 'border-slate-800/80' : 'border-stone-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-orange-500" />
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                    Product Running Out of Stock
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                    Immediate attention recommended
                  </p>
                </div>
              </div>
              <Link
                to="/admin/inventory"
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Manage All &rarr;
              </Link>
            </div>

            {lowStockSnacks.length === 0 ? (
              <div className="p-8 text-center">
                <PackageCheck size={28} className="mx-auto text-orange-500" />
                <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-stone-600'}`}>
                  All items are well stocked above minimum thresholds!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr
                      className={`uppercase tracking-wider font-semibold border-b ${
                        isDark
                          ? 'bg-slate-950/70 text-slate-400 border-slate-800/80'
                          : 'bg-stone-50 text-stone-500 border-stone-100'
                      }`}
                    >
                      <th className="px-5 py-3 text-left">Product</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-center">In Stock</th>
                      <th className="px-5 py-3 text-center">Threshold</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-stone-100'}`}>
                    {lowStockSnacks.map((snack) => (
                      <tr
                        key={snack.id}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-slate-800/50' : 'hover:bg-orange-50/30'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-3">
                            <img
                              src={getSnackImageUrl(snack.name, snack.category)}
                              alt={snack.name}
                              className={`w-9 h-9 rounded-xl object-cover border shrink-0 ${
                                isDark ? 'border-slate-700' : 'border-stone-100'
                              }`}
                            />
                            <div>
                              <p className={`font-bold text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}>
                                {snack.name}
                              </p>
                              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                                {snack.category.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              snack.status === 'GONE'
                                ? 'bg-orange-500/10 text-orange-300 border border-orange-500/25'
                                : 'bg-orange-500/10 text-orange-300 border border-orange-500/25'
                            }`}
                          >
                            {snack.status === 'GONE' ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-center font-bold ${
                          'text-orange-400'
                        }`}>
                          {snack.quantity}
                        </td>
                        <td className={`px-5 py-3.5 text-center text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                          {snack.lowStockThreshold}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setSnackToRestock(snack);
                                setIsRestockModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3 py-1 rounded-lg transition-all shadow-xs"
                            >
                              <PackagePlus size={13} />
                              Add Stock
                            </button>
                            <button
                              onClick={() => {
                                setSnackToEdit(snack);
                                setIsSnackModalOpen(true);
                              }}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                isDark
                                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                                  : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                              }`}
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Best Selling + Pantry Storage + Quick Links */}
        <div className="xl:col-span-2 space-y-6">
          {/* Best Selling Leaderboard */}
          <div
            className={`rounded-2xl p-5 transition-all ${
              isDark
                ? 'bg-slate-900/60 border border-slate-800/90 backdrop-blur-xl shadow-xl'
                : 'bg-white border border-stone-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Flame size={17} className="text-orange-500" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Best Selling
                </h3>
              </div>
              <Link
                to="/snacks?sortBy=votes"
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
              >
                View all &rarr;
              </Link>
            </div>

            <div className={`flex justify-between text-[10px] font-semibold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-stone-400'
            }`}>
              <span>Product</span>
              <span>Total Votes</span>
            </div>

            <div className="space-y-2">
              {topVoted.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No votes registered yet</p>
              ) : (
                topVoted.map((snack, i) => (
                  <div
                    key={snack.id}
                    onClick={() => {
                      setSnackToEdit(snack);
                      setIsSnackModalOpen(true);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                      isDark ? 'hover:bg-slate-800/50' : 'hover:bg-orange-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={getSnackImageUrl(snack.name, snack.category)}
                        alt={snack.name}
                        className={`w-8 h-8 rounded-lg object-cover border shrink-0 ${
                          isDark ? 'border-slate-700' : 'border-stone-100'
                        }`}
                      />
                      <div>
                        <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                          {snack.name}
                        </p>
                        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                          {snack.category.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-extrabold text-orange-400">{snack.voteCount}</span>
                      {i === 0 && <span className="text-orange-500 text-xs font-bold">#1</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pantry Storage (Warehouse Allocation by Category) */}
          <div
            className={`rounded-2xl p-5 transition-all ${
              isDark
                ? 'bg-slate-900/60 border border-slate-800/90 backdrop-blur-xl shadow-xl'
                : 'bg-white border border-stone-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ChartNoAxesCombined size={17} className="text-orange-500" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Pantry Storage Allocation
                </h3>
              </div>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>Capacity</span>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No category data</p>
            ) : (
              <div className="space-y-4">
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className={`rounded-xl p-3 border ${
                      isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-stone-50 border-stone-100'
                    }`}
                  >
                    <StorageMeter
                      label={cat.label}
                      current={cat.currentStock}
                      total={Math.max(cat.currentStock, cat.snackCount * 20)}
                      isDark={isDark}
                    />
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                      {cat.snackCount} variety{cat.snackCount !== 1 ? 'ies' : ''} in catalog
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Management Links */}
          <div
            className={`rounded-2xl p-5 transition-all ${
              isDark
                ? 'bg-slate-900/60 border border-slate-800/90 backdrop-blur-xl shadow-xl'
                : 'bg-white border border-stone-200 shadow-sm'
            }`}
          >
            <h3 className={`text-base font-bold mb-3 ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Admin Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/admin/inventory"
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                <span className="flex items-center gap-2"><Boxes size={15} /> Open Inventory Manager</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                to="/admin/insights"
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-orange-500/10 text-orange-300 border border-orange-500/25 hover:bg-orange-500 hover:text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                <span className="flex items-center gap-2"><ChartNoAxesCombined size={15} /> View Pantry Analytics</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                to="/admin/activity"
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-orange-500/10 text-orange-300 border border-orange-500/25 hover:bg-orange-500 hover:text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                <span className="flex items-center gap-2"><ClipboardList size={15} /> Audit Activity Log</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Full Inventory Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900/60 border border-slate-800/90 backdrop-blur-xl shadow-xl'
            : 'bg-white border-stone-200 shadow-sm'
        }`}
      >
        <div className={`p-5 border-b ${isDark ? 'border-slate-800/80' : 'border-stone-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Catalog Inventory Table
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                {filteredSnacks.length} items listed
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Search snack name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`text-xs border rounded-xl px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-white border-stone-200 text-stone-900'
                }`}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`text-xs border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-700 text-slate-200'
                    : 'bg-white border-stone-200 text-stone-800'
                }`}
              >
                <option value="ALL">All Categories</option>
                <option value="SWEET">🍬 Sweet</option>
                <option value="SAVOURY">🧀 Savoury</option>
                <option value="DRINK">🥤 Drink</option>
                <option value="HEALTHY_ISH">🥗 Healthy</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr
                className={`uppercase tracking-wider font-semibold border-b ${
                  isDark
                    ? 'bg-slate-950/70 text-slate-400 border-slate-800/80'
                    : 'bg-stone-50 text-stone-500 border-stone-100'
                }`}
              >
                <th className="px-5 py-3 text-left">Snack</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-center">In Stock</th>
                <th className="px-5 py-3 text-center">Threshold</th>
                <th className="px-5 py-3 text-center">Votes</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-stone-100'}`}>
              {filteredSnacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-xs">
                    No snacks found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSnacks.map((snack) => (
                  <tr
                    key={snack.id}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-slate-800/50' : 'hover:bg-orange-50/30'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={getSnackImageUrl(snack.name, snack.category)}
                          alt={snack.name}
                          className={`w-9 h-9 rounded-xl object-cover border shrink-0 ${
                            isDark ? 'border-slate-700' : 'border-stone-100'
                          }`}
                        />
                        <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}>
                          {snack.name}
                        </span>
                      </div>
                    </td>
                    <td className={`px-5 py-3.5 text-xs ${isDark ? 'text-slate-400' : 'text-stone-600'}`}>
                      {snack.category.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          'bg-orange-500/10 text-orange-300 border border-orange-500/25'
                        }`}
                      >
                        {snack.status === 'STOCKED' ? 'Stocked' : snack.status === 'RUNNING_LOW' ? 'Low' : 'Out of stock'}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-center font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                      {snack.quantity}
                    </td>
                    <td className={`px-5 py-3.5 text-center text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      {snack.lowStockThreshold}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-orange-400">
                      {snack.voteCount}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setSnackToRestock(snack);
                            setIsRestockModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-500 transition-all hover:bg-orange-500 hover:text-white dark:text-orange-300"
                        >
                          <PackagePlus size={13} /> Restock
                        </button>
                        <button
                          onClick={() => {
                            setSnackToEdit(snack);
                            setIsSnackModalOpen(true);
                          }}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            isDark
                              ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                              : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSnack(snack)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-300 bg-transparent text-slate-600 hover:border-orange-500 hover:bg-orange-500 hover:text-white transition-all dark:border-slate-700 dark:text-slate-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isSnackModalOpen && (
        <SnackModal
          isOpen={isSnackModalOpen}
          snackToEdit={snackToEdit}
          onClose={() => setIsSnackModalOpen(false)}
          onSubmit={handleCreateOrUpdateSnack}
        />
      )}

      {isRestockModalOpen && snackToRestock && (
        <RestockModal
          isOpen={isRestockModalOpen}
          snack={snackToRestock}
          onClose={() => {
            setIsRestockModalOpen(false);
            setSnackToRestock(null);
          }}
          onRestock={handleRestockSnack}
        />
      )}
    </div>
  );
};
