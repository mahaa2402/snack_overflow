import React, { useEffect, useState, useCallback } from 'react';
import { ActivityItem } from '../types/snack';
import { getActivitiesApi } from '../api/snack.api';
import { getSnackImageUrl } from '../utils/snackImages';
import { useTheme } from '../context/ThemeContext';
import { Activity, Boxes, ClipboardList, PackagePlus, Search, ShoppingBag } from 'lucide-react';

export const AdminActivityPage: React.FC = () => {
  const { isDark } = useTheme();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filterAction, setFilterAction] = useState<'ALL' | 'CONSUMED' | 'RESTOCKED'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getActivitiesApi(50, filterAction);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterAction]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = activities.filter((item) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const userName = item.user?.name?.toLowerCase() || '';
    const userEmail = item.user?.email?.toLowerCase() || '';
    const snackName = item.snack?.name?.toLowerCase() || '';
    return userName.includes(term) || userEmail.includes(term) || snackName.includes(term);
  });

  const totalConsumed = activities.filter((a) => a.action === 'CONSUMED').reduce((acc, a) => acc + a.amount, 0);
  const totalRestocked = activities.filter((a) => a.action === 'RESTOCKED').reduce((acc, a) => acc + a.amount, 0);

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: iso, time: '' };
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity size={20} className="text-orange-500" />
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Pantry Activity Log & Audit Trail
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Track team consumption patterns, restock operations, and quantity modifications
          </p>
        </div>

      </div>

      {/* Summary KPI Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`admin-stat-card p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Logged Events</p>
            <ClipboardList size={17} className="text-orange-500" />
          </div>
          <p className={`text-2xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {activities.length}
          </p>
          <p className="text-[11px] text-orange-500 mt-0.5">Recorded in database</p>
        </div>

        <div
          className={`admin-stat-card p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Units Consumed</p>
            <ShoppingBag size={17} className="text-orange-500" />
          </div>
          <p className="text-2xl font-extrabold mt-1 text-orange-400">
            {totalConsumed}
          </p>
          <p className="text-[11px] text-orange-400/80 mt-0.5">Dispatched to team</p>
        </div>

        <div
          className={`admin-stat-card p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Units Restocked</p>
            <PackagePlus size={17} className="text-orange-500" />
          </div>
          <p className="text-2xl font-extrabold mt-1 text-orange-400">
            +{totalRestocked}
          </p>
          <p className="text-[11px] text-orange-400/80 mt-0.5">Added to pantry inventory</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row gap-3 items-center justify-between ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
            : 'bg-white border-gray-200/80 shadow-xs'
        }`}
      >
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          {(['ALL', 'CONSUMED', 'RESTOCKED'] as const).map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterAction === act
                  ? 'bg-orange-500 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {act === 'ALL' ? 'All Events' : act === 'CONSUMED' ? 'Consumptions' : 'Restocks'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Filter by user or snack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
              isDark
                ? 'bg-slate-950/60 border-slate-700 text-white placeholder-slate-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Activity Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl shadow-xl'
            : 'bg-white border-gray-200/80 shadow-xs'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr
                className={`uppercase tracking-wider font-semibold border-b ${
                  isDark
                    ? 'bg-slate-950/70 text-slate-400 border-slate-800/80'
                    : 'bg-gray-50/70 text-gray-500 border-gray-100'
                }`}
              >
                <th className="px-5 py-3.5 text-left">Team Member</th>
                <th className="px-5 py-3.5 text-left">Snack Item</th>
                <th className="px-5 py-3.5 text-left">Action</th>
                <th className="px-5 py-3.5 text-center">Amount</th>
                <th className="px-5 py-3.5 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-gray-100'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Boxes size={24} className="mx-auto mb-2 animate-pulse text-orange-500" />
                    Loading activity trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Activity size={26} className="mx-auto mb-2 text-orange-500" />
                    No activity records found matching your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isConsumed = item.action === 'CONSUMED';
                  const dt = formatDateTime(item.createdAt);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-orange-50/30'
                      }`}
                    >
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                            {item.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {item.user?.name || 'Unknown User'}
                            </p>
                            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                              {item.user?.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Snack */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          {item.snack && (
                            <img
                              src={getSnackImageUrl(item.snack.name, item.snack.category)}
                              alt={item.snack.name}
                              className={`w-7 h-7 rounded-lg object-cover border shrink-0 ${
                                isDark ? 'border-slate-700' : 'border-gray-200'
                              }`}
                            />
                          )}
                          <div>
                            <p className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {item.snack?.name || 'Snack Item'}
                            </p>
                            {item.snack && (
                              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                                {item.snack.category.replace('_', ' ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action Pill */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            'bg-orange-500/10 text-orange-500 border border-orange-500/25 dark:text-orange-300'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {isConsumed ? <ShoppingBag size={12} /> : <PackagePlus size={12} />}
                            {isConsumed ? 'Consumed' : 'Restocked'}
                          </span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                            'bg-orange-500/10 text-orange-500 dark:text-orange-300'
                          }`}
                        >
                          {isConsumed ? `-${item.amount}` : `+${item.amount}`}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="px-5 py-3.5 text-right">
                        <p className={`font-medium text-xs ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                          {dt.date}
                        </p>
                        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                          {dt.time}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
