import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PaginatedSnacks, SnackItem } from '../types/snack';
import { getSnacksApi, toggleVoteApi, consumeSnackApi } from '../api/snack.api';
import { SnackCard } from '../components/snacks/SnackCard';
import { GrabSnackModal } from '../components/snacks/GrabSnackModal';
import { ActionToast } from '../components/common/ActionToast';
import { Button } from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';

export const SnacksPage: React.FC = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState<PaginatedSnacks | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'votes' | 'name' | 'quantity' | 'createdAt'>('votes');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [snackToGrab, setSnackToGrab] = useState<SnackItem | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(message);
    setToastVariant(variant);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const fetchSnacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getSnacksApi({
        search: search.trim() || undefined,
        category: category !== 'ALL' ? category : undefined,
        status: status !== 'ALL' ? status : undefined,
        sortBy,
        page,
        limit: 12,
      });
      setData(result);
    } catch (err) {
      console.error('Failed to fetch snacks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, category, status, sortBy, page]);

  useEffect(() => {
    fetchSnacks();
  }, [fetchSnacks]);

  // Reset to page 1 on filter change
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setPage(1);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSnacks();
  };

  const handleVoteToggle = async (snackId: string) => {
    try {
      const result = await toggleVoteApi(snackId);
      showMessage(result.hasVoted ? 'Your vote has been counted!' : 'Your vote has been removed.');

      // Re-fetch to update vote state
      await fetchSnacks();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to toggle vote';
      showMessage(msg, 'error');
    }
  };

  const handleConsume = async (amount: number) => {
    if (!snackToGrab) return;
    const snack = snackToGrab;
    await consumeSnackApi(snack.id, amount);
    showMessage(`Grabbed successfully! You took ${amount} ${amount === 1 ? 'item' : 'items'} of ${snack.name}.`);
    await fetchSnacks();
  };

  const handleConsumeRequest = (snack: SnackItem) => {
    setSnackToGrab(snack);
  };

  const categories: { label: string; value: string; emoji: string }[] = [
    { label: 'All', value: 'ALL', emoji: '✨' },
    { label: 'Sweet', value: 'SWEET', emoji: '🍫' },
    { label: 'Savoury', value: 'SAVOURY', emoji: '🥨' },
    { label: 'Drinks', value: 'DRINK', emoji: '🥤' },
    { label: 'Healthy', value: 'HEALTHY_ISH', emoji: '🥗' },
  ];

  const statuses: { label: string; value: string; color: string }[] = [
    { label: 'All Statuses', value: 'ALL', color: 'bg-gray-100 text-gray-700' },
    { label: 'Stocked', value: 'STOCKED', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Running Low', value: 'RUNNING_LOW', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Out of Stock', value: 'GONE', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <ActionToast message={toastMessage} dark={isDark} variant={toastVariant} />
      <GrabSnackModal
        snack={snackToGrab}
        dark={isDark}
        onClose={() => setSnackToGrab(null)}
        onConfirm={handleConsume}
      />

      {/* Header */}
      <div>
        <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Pantry Snack Inventory
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Explore snacks, check real-time stock levels, grab a snack, and vote for your favorites.
        </p>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl shadow-lg'
            : 'bg-white border-gray-200/80 shadow-xs'
        }`}
      >
        {/* Search Bar & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snacks by name (e.g. Cold Brew, Chips)..."
              className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors ${
                isDark
                  ? 'bg-slate-950/60 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className={`text-xs font-medium whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'votes' | 'name' | 'quantity' | 'createdAt')}
              className={`border rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none ${
                isDark
                  ? 'bg-slate-950/70 border-slate-700 text-slate-200'
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option value="votes"> Most Popular (Votes)</option>
              <option value="name">Name (A - Z)</option>
              <option value="quantity">Stock Quantity</option>
              <option value="createdAt">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div
          className={`pt-3 border-t flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDark ? 'border-slate-800/80' : 'border-gray-100'
          }`}
        >
          {/* Category Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => handleCategoryChange(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1 ${
                  category === c.value
                    ? 'bg-orange-500 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {statuses.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleStatusChange(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                  status === s.value
                    ? isDark
                      ? 'bg-slate-800 text-white border-orange-500/50 shadow-xs'
                      : 'bg-gray-900 text-white border-gray-900 shadow-xs'
                    : isDark
                    ? 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Snack Cards */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="mt-4 text-sm text-gray-500 font-medium">Loading snacks...</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div
          className={`rounded-2xl border p-12 text-center max-w-lg mx-auto ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 text-white'
              : 'bg-white border-gray-200/80 text-gray-900'
          }`}
        >
          <span className="text-5xl">🔍</span>
          <h3 className="mt-3 text-lg font-bold">No snacks found</h3>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            No items matched your search query or filters. Try adjusting your search keyword or clearing filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearch('');
              setCategory('ALL');
              setStatus('ALL');
              setPage(1);
            }}
          >
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.items.map((snack) => (
            <SnackCard
              key={snack.id}
              snack={snack}
              dark={isDark}
              onVoteToggle={handleVoteToggle}
              onConsume={handleConsumeRequest}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.pagination.totalPages > 1 && (
        <div
          className={`flex items-center justify-between pt-6 border-t ${
            isDark ? 'border-slate-800' : 'border-gray-200'
          }`}
        >
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Showing Page <strong className={isDark ? 'text-slate-200' : 'text-gray-800'}>{data.pagination.page}</strong> of{' '}
            <strong className={isDark ? 'text-slate-200' : 'text-gray-800'}>{data.pagination.totalPages}</strong> ({data.pagination.total} snacks)
          </span>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              &larr; Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
