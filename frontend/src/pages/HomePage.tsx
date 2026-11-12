import React, { useEffect, useState, useCallback } from 'react';
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
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { getSnackImageUrl } from '../utils/snackImages';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<PantryStats | null>(null);
  const [featuredSnack, setFeaturedSnack] = useState<SnackItem | null>(null);
  const [popularSnacks, setPopularSnacks] = useState<SnackItem[]>([]);
  const [recentSnacks, setRecentSnacks] = useState<SnackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  const handleVoteToggle = async (snackId: string) => {
    try {
      const result = await toggleVoteApi(snackId);
      setActionMessage(result.hasVoted ? 'Vote registered!' : 'Vote removed.');
      setTimeout(() => setActionMessage(null), 3000);

      // Refresh data locally
      await loadDashboardData();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to record vote';
      setActionMessage(message);
    }
  };

  const handleConsume = async (snackId: string) => {
    try {
      await consumeSnackApi(snackId, 1);
      setActionMessage('Snack enjoyed! Inventory updated.');
      setTimeout(() => setActionMessage(null), 3000);

      await loadDashboardData();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to consume snack';
      setActionMessage(message);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-gray-700 animate-in slide-in-from-bottom duration-200 flex items-center space-x-2">
          <span>🍿</span>
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full text-xs font-semibold text-orange-700 mb-3">
            <span>✨</span>
            <span>Freshly Stocked Office Pantry</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
            Welcome to <span className="text-orange-600">Snack Overflow</span>
          </h1>
          <p className="mt-2 text-base text-gray-600 max-w-2xl leading-relaxed">
            Your office kitchen hub. Check what's in stock, grab your favorites, and vote for the snacks you want us to reorder next week.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link to="/snacks">
            <Button variant="primary" size="md">
              Browse All Snacks &rarr;
            </Button>
          </Link>
          {!isAuthenticated && (
            <Link to="/login">
              <Button variant="outline" size="md">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Snacks</span>
            <span className="text-xl">🍿</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {isLoading ? '...' : stats?.totalSnacks ?? 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">Unique varieties available</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Units</span>
            <span className="text-xl">📦</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {isLoading ? '...' : stats?.totalQuantity ?? 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">Ready for pickup</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Running Low</span>
            <span className="text-xl">⚠️</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-600">
            {isLoading ? '...' : stats?.runningLowCount ?? 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">Near threshold</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <span className="text-xl">🚫</span>
          </div>
          <div className="text-3xl font-extrabold text-rose-600">
            {isLoading ? '...' : stats?.outOfStockCount ?? 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">Needs restock</p>
        </div>
      </div>

      {/* Featured Snack of the Week Hero */}
      {featuredSnack && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl text-white p-6 sm:p-8 shadow-sm overflow-hidden relative">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 space-y-3">
              <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-white">
                <span>🏆</span>
                <span>SNACK OF THE WEEK (MOST VOTED)</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {featuredSnack.name}
              </h2>
              <p className="text-orange-50 text-sm max-w-lg leading-relaxed">
                The office favorite! Leading the board with{' '}
                <strong className="text-white font-bold">{featuredSnack.voteCount} votes</strong>. Grab
                a unit or cast your vote to keep it in next week's pantry restock order.
              </p>

              <div className="flex items-center space-x-4 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={featuredSnack.quantity <= 0}
                  onClick={() => handleConsume(featuredSnack.id)}
                  className="bg-white text-orange-700 hover:bg-orange-50 border-none shadow-xs font-bold"
                >
                  {featuredSnack.quantity > 0 ? 'Grab One Now' : 'Currently Depleted'}
                </Button>
                <button
                  type="button"
                  onClick={() => handleVoteToggle(featuredSnack.id)}
                  className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-xs transition-colors"
                >
                  <span>{featuredSnack.hasVoted ? '❤️' : '🤍'}</span>
                  <span>{featuredSnack.voteCount} Votes</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-5 flex justify-center">
              <div className="relative w-64 h-48 sm:h-56 rounded-xl overflow-hidden shadow-2xl border-4 border-white/30 rotate-1 hover:rotate-0 transition-transform duration-300">
                <img
                  src={getSnackImageUrl(featuredSnack.name, featuredSnack.category)}
                  alt={featuredSnack.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="success">
                    {featuredSnack.quantity} in Stock
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popular Snacks Grid */}
      {popularSnacks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                🔥 Popular in the Pantry
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Top-voted snacks loved by your teammates</p>
            </div>
            <Link
              to="/snacks"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
            >
              See Leaderboard &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularSnacks.map((snack) => (
              <SnackCard
                key={snack.id}
                snack={snack}
                onVoteToggle={handleVoteToggle}
                onConsume={handleConsume}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pantry Inventory Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              🍴 Pantry Inventory
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Selection of currently available office snacks</p>
          </div>
          <Link to="/snacks">
            <Button variant="outline" size="sm">
              View All Snacks ({stats?.totalSnacks ?? 0})
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentSnacks.map((snack) => (
            <SnackCard
              key={snack.id}
              snack={snack}
              onVoteToggle={handleVoteToggle}
              onConsume={handleConsume}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
