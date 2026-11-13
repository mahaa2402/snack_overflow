import React, { useEffect, useState, useCallback } from 'react';
import { RestockSuggestionItem, UrgencyLevel } from '../types/restock';
import { getRestockSuggestionsApi, restockAllApi } from '../api/restock.api';
import { restockSnackApi } from '../api/snack.api';
import { getCategoryEmoji, getSnackImageUrl } from '../utils/snackImages';
import { useTheme } from '../context/ThemeContext';
import { useRealtimeRefresh } from '../context/RealtimeUpdatesContext';

export const AdminRestockPage: React.FC = () => {
  const { isDark } = useTheme();

  const [suggestions, setSuggestions] = useState<RestockSuggestionItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | UrgencyLevel>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'ALL' | 'SINGLE';
    snackId?: string;
    snackName?: string;
    amount?: number;
    totalCount?: number;
  }>({ isOpen: false, type: 'ALL' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRestockSuggestionsApi(
        categoryFilter !== 'ALL' ? categoryFilter : undefined
      );
      setSuggestions(data);

      // Initialize editable quantities from suggested quantities
      const initialQtys: Record<string, number> = {};
      for (const s of data) {
        initialQtys[s.snackId] = s.suggestedQuantity;
      }
      setQuantities(initialQtys);
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Failed to load restock suggestions';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  useRealtimeRefresh(fetchSuggestions, 'inventory');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuantityChange = (snackId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [snackId]: Math.max(1, Math.round(val || 1)),
    }));
  };

  // Filter suggestions by urgency
  const filtered = suggestions.filter((s) => {
    if (urgencyFilter === 'ALL') return true;
    return s.urgency === urgencyFilter;
  });

  const totalUnitsToRestock = filtered.reduce(
    (acc, s) => acc + (quantities[s.snackId] || s.suggestedQuantity),
    0
  );

  const criticalCount = suggestions.filter((s) => s.urgency === 'CRITICAL').length;
  const highCount = suggestions.filter((s) => s.urgency === 'HIGH').length;

  // Trigger Restock All
  const handleOpenRestockAll = () => {
    if (filtered.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'ALL',
      amount: totalUnitsToRestock,
      totalCount: filtered.length,
    });
  };

  // Trigger Single Restock
  const handleOpenSingleRestock = (s: RestockSuggestionItem) => {
    setConfirmModal({
      isOpen: true,
      type: 'SINGLE',
      snackId: s.snackId,
      snackName: s.snackName,
      amount: quantities[s.snackId] || s.suggestedQuantity,
    });
  };

  // Execute Restock Transaction
  const handleExecuteRestock = async () => {
    setIsSubmitting(true);
    try {
      if (confirmModal.type === 'ALL') {
        const items = filtered.map((s) => ({
          snackId: s.snackId,
          amount: quantities[s.snackId] || s.suggestedQuantity,
        }));

        const result = await restockAllApi({ items });
        showToast(
          `Successfully restocked ${result.restockedCount} snacks with ${result.totalUnitsAdded} total units!`
        );
      } else if (confirmModal.type === 'SINGLE' && confirmModal.snackId && confirmModal.amount) {
        await restockSnackApi(confirmModal.snackId, confirmModal.amount);
        showToast(`Restocked +${confirmModal.amount} units for ${confirmModal.snackName}!`);
      }
      setConfirmModal({ isOpen: false, type: 'ALL' });
      await fetchSuggestions();
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Restock operation failed';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 right-6 z-50 text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border flex items-center space-x-2 backdrop-blur-md ${
            isDark
              ? 'bg-slate-900/95 text-white border-orange-500/40 shadow-orange-500/10'
              : 'bg-stone-900 text-white border-stone-700'
          }`}
        >
          <span>🍿</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📋</span>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Smart Restock List
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
              Admin Automated
            </span>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            Data-driven replenishment calculated from 7-day consumption velocity, low-stock thresholds, and target buffers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleOpenRestockAll}
            disabled={filtered.length === 0 || isLoading}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/25 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>⚡</span>
            <span>Restock All ({totalUnitsToRestock} Units)</span>
          </button>
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={isLoading}
            className={`p-2.5 rounded-xl border transition-colors ${
              isDark
                ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
            }`}
            title="Refresh list"
          >
            🔄
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-stone-200 shadow-xs'
          }`}
        >
          <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            Items Needing Restock
          </p>
          <p className={`text-2xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-stone-900'}`}>
            {suggestions.length}
          </p>
          <p className="text-[11px] text-orange-400 mt-0.5">Below safe thresholds</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-stone-200 shadow-xs'
          }`}
        >
          <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            Critical Out of Stock
          </p>
          <p className="text-2xl font-extrabold mt-1 text-rose-500">
            {criticalCount}
          </p>
          <p className="text-[11px] text-rose-400/80 mt-0.5">0 units remaining</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-stone-200 shadow-xs'
          }`}
        >
          <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            High Depletion Items
          </p>
          <p className="text-2xl font-extrabold mt-1 text-amber-500">
            {highCount}
          </p>
          <p className="text-[11px] text-amber-400/80 mt-0.5">&le; 3 days of supply</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-stone-200 shadow-xs'
          }`}
        >
          <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            Suggested Replenishment
          </p>
          <p className="text-2xl font-extrabold mt-1 text-emerald-400">
            +{totalUnitsToRestock}
          </p>
          <p className="text-[11px] text-emerald-400/80 mt-0.5">14-day supply buffer</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row gap-3 items-center justify-between ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
            : 'bg-white border-stone-200 shadow-xs'
        }`}
      >
        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { label: 'All Categories', value: 'ALL', emoji: '✨' },
            { label: 'Sweet', value: 'SWEET', emoji: '🍫' },
            { label: 'Savoury', value: 'SAVOURY', emoji: '🥨' },
            { label: 'Drinks', value: 'DRINK', emoji: '🥤' },
            { label: 'Healthy', value: 'HEALTHY_ISH', emoji: '🥗' },
          ].map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1 ${
                categoryFilter === cat.value
                  ? 'bg-orange-500 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Urgency Filter Pills */}
        <div className="flex items-center space-x-1.5 self-start md:self-auto">
          <span className={`text-xs font-semibold mr-1 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            Urgency:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((urg) => (
            <button
              key={urg}
              type="button"
              onClick={() => setUrgencyFilter(urg)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                urgencyFilter === urg
                  ? urg === 'CRITICAL'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : urg === 'HIGH'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : urg === 'MEDIUM'
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'bg-stone-700 text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              {urg}
            </button>
          ))}
        </div>
      </div>

      {/* Main Suggestions Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl shadow-xl'
            : 'bg-white border-stone-200 shadow-sm'
        }`}
      >
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="text-3xl animate-spin">🍿</div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
              Calculating restock recommendations...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <span className="text-3xl block">⚠️</span>
            <p className="text-sm font-bold text-rose-500">{error}</p>
            <button
              type="button"
              onClick={fetchSuggestions}
              className="px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <span className="text-4xl block mb-2">🎉</span>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
              All Pantry Inventory is Healthy!
            </h3>
            <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
              No items currently require replenishment under the selected filters. All snacks are stocked comfortably above threshold.
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
                  <th className="px-5 py-3.5 text-left">Product</th>
                  <th className="px-4 py-3.5 text-center">Urgency</th>
                  <th className="px-4 py-3.5 text-center">Stock / Threshold</th>
                  <th className="px-4 py-3.5 text-center">7-Day Burn Rate</th>
                  <th className="px-4 py-3.5 text-center">Est. Days Left</th>
                  <th className="px-5 py-3.5 text-center">Restock Qty</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-stone-100'}`}>
                {filtered.map((snack) => {
                  const qtyValue = quantities[snack.snackId] ?? snack.suggestedQuantity;
                  const isCritical = snack.urgency === 'CRITICAL';
                  const isHigh = snack.urgency === 'HIGH';

                  return (
                    <tr
                      key={snack.snackId}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-orange-50/30'
                      }`}
                    >
                      {/* Product details */}
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={getSnackImageUrl(snack.snackName, snack.category)}
                            alt={snack.snackName}
                            className={`w-10 h-10 rounded-xl object-cover border shrink-0 ${
                              isDark ? 'border-slate-700' : 'border-stone-200'
                            }`}
                          />
                          <div>
                            <p className={`font-bold text-xs ${isDark ? 'text-white' : 'text-stone-900'}`}>
                              {snack.snackName}
                            </p>
                            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                              {getCategoryEmoji(snack.category)} {snack.category}
                            </p>
                            <p className={`text-[10px] mt-0.5 line-clamp-1 ${isDark ? 'text-slate-500' : 'text-stone-400'}`} title={snack.reasoning}>
                              {snack.reasoning}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Urgency Badge */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isCritical
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isHigh
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {snack.urgency}
                        </span>
                      </td>

                      {/* Stock vs Threshold */}
                      <td className="px-4 py-4 text-center">
                        <span className={`font-bold ${isCritical ? 'text-rose-400' : isDark ? 'text-white' : 'text-stone-900'}`}>
                          {snack.currentQuantity}
                        </span>
                        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                          {' '}/ {snack.lowStockThreshold}
                        </span>
                      </td>

                      {/* 7-day Burn Rate */}
                      <td className="px-4 py-4 text-center">
                        <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
                          {snack.avgDailyConsumption}
                        </span>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                          units/day
                        </span>
                      </td>

                      {/* Days Left */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`font-bold text-xs ${
                            snack.daysLeft === 0
                              ? 'text-rose-500'
                              : snack.daysLeft <= 3
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {snack.daysLeft === 0 ? '0 days' : `${snack.daysLeft}d left`}
                        </span>
                      </td>

                      {/* Editable Suggested Quantity */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={qtyValue}
                            onChange={(e) =>
                              handleQuantityChange(snack.snackId, parseInt(e.target.value, 10))
                            }
                            className={`w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                              isDark
                                ? 'bg-slate-950 border-slate-700 text-white'
                                : 'bg-white border-stone-300 text-stone-900'
                            }`}
                          />
                          <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                            units
                          </span>
                        </div>
                      </td>

                      {/* Individual Restock Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenSingleRestock(snack)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white active:scale-95 transition-all shadow-xs"
                        >
                          + Restock ({qtyValue})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">📦</span>
              <h3 className="text-lg font-bold">
                {confirmModal.type === 'ALL'
                  ? 'Confirm Batch Restock'
                  : `Restock ${confirmModal.snackName}`}
              </h3>
            </div>

            <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
              {confirmModal.type === 'ALL'
                ? `You are about to restock ${confirmModal.totalCount} snack varieties with a combined total of ${confirmModal.amount} units. This will update inventory and record activity logs in a single atomic database transaction.`
                : `Are you sure you want to add +${confirmModal.amount} units to the stock of ${confirmModal.snackName}?`}
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: 'ALL' })}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestock}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Restocking...' : 'Confirm & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

