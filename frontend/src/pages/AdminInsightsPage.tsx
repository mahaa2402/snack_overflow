import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PantryInsights, SnackItem } from '../types/snack';
import { getPantryInsightsApi, restockSnackApi } from '../api/snack.api';
import { InsightsCharts } from '../components/insights/InsightsCharts';
import { SmartRestockWidget } from '../components/insights/SmartRestockWidget';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';
import { RestockModal } from '../components/snacks/RestockModal';
import { Button } from '../components/common/Button';
import { Activity, AlertTriangle, Boxes, ChartNoAxesCombined, PackagePlus, Trophy, TrendingUp, ThumbsUp } from 'lucide-react';

export const AdminInsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<PantryInsights | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restock modal state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [snackToRestock, setSnackToRestock] = useState<SnackItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPantryInsightsApi();
      setInsights(data);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load pantry insights';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenRestock = (snack: SnackItem, _suggestedAmount?: number) => {
    setSnackToRestock(snack);
    setIsRestockModalOpen(true);
  };

  const handleRestockSubmit = async (snackId: string, amount: number) => {
    try {
      await restockSnackApi(snackId, amount);
      showToast(`Successfully restocked ${amount} units!`);
      // Refresh insights data
      await fetchInsights();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to restock snack';
      showToast(msg);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-gray-700 animate-in slide-in-from-bottom duration-200 flex items-center space-x-2">
          <span className="text-orange-400"><Activity size={16} /></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-150 shadow-xs">
        <div>
          <div className="inline-flex items-center space-x-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <ChartNoAxesCombined size={14} />
            <span>Office Pantry Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Pantry Analytics & Insights
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time consumption trends, popularity metrics, and smart automated restock recommendations
          </p>
        </div>

        {/* Action Controls & Sub-Navigation */}
        <div className="flex items-center space-x-3 shrink-0">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <span className="inline-flex items-center gap-1.5"><Boxes size={14} /> Inventory Manager</span>
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && !insights ? (
        <div className="py-24 text-center">
          <Boxes size={30} className="mx-auto mb-3 animate-pulse text-orange-500" />
          <h3 className="text-base font-bold text-gray-800">Calculating Pantry Insights...</h3>
          <p className="text-xs text-gray-400 mt-1">
            Aggregating historical activities and analyzing inventory burn rates from PostgreSQL
          </p>
        </div>
      ) : error ? (
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl text-center">
          <AlertTriangle size={26} className="mx-auto mb-2 text-orange-500" />
          <h3 className="text-sm font-bold text-orange-800">{error}</h3>
          <p className="text-xs text-orange-700 mt-1">
            Please ensure backend service is running and PostgreSQL database is connected.
          </p>
          <button
            onClick={fetchInsights}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : insights ? (
        <>
          {/* Top 4 KPI Metrics Cards (Matches User Reference Image "Inventix") */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Most Consumed Snack */}
            <div className="admin-stat-card bg-white p-6 rounded-3xl border border-gray-150 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
                <span>MOST CONSUMED SNACK</span>
                <Trophy size={17} className="text-orange-500" />
              </div>
              <div className="text-xl font-extrabold text-gray-900 truncate">
                {insights.kpis.mostConsumedSnack?.name || 'N/A'}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="inline-flex items-center text-xs font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                  {insights.kpis.mostConsumedSnack?.totalConsumed ?? 0} units
                </span>
                <span className="text-[11px] text-gray-400">total consumed</span>
              </div>
            </div>

            {/* Card 2: Most Popular / Voted Snack */}
            <div className="admin-stat-card bg-white p-6 rounded-3xl border border-gray-150 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
                <span>MOST VOTED SNACK</span>
                <ThumbsUp size={17} className="text-orange-500" />
              </div>
              <div className="text-xl font-extrabold text-gray-900 truncate">
                {insights.kpis.mostVotedSnack?.name || 'N/A'}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="inline-flex items-center text-xs font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                  {insights.kpis.mostVotedSnack?.voteCount ?? 0} votes
                </span>
                <span className="text-[11px] text-gray-400">team favorite</span>
              </div>
            </div>

            {/* Card 3: Total Snacks Consumed This Week */}
            <div className="admin-stat-card bg-white p-6 rounded-3xl border border-gray-150 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
                <span>CONSUMED THIS WEEK</span>
                <TrendingUp size={17} className="text-orange-500" />
              </div>
              <div className="text-3xl font-extrabold text-gray-900">
                {insights.kpis.totalConsumedThisWeek}
              </div>
              
            </div>

            {/* Card 4: Restocked This Week */}
            <div className="admin-stat-card bg-white p-6 rounded-3xl border border-gray-150 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold mb-2">
                <span>RESTOCKED THIS WEEK</span>
                <PackagePlus size={17} className="text-orange-500" />
              </div>
              <div className="text-3xl font-extrabold text-gray-900">
                {insights.kpis.totalRestockedThisWeek}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="inline-flex items-center text-xs font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                  +{insights.kpis.totalRestockedThisWeek} units
                </span>
                <span className="text-[11px] text-gray-400">replenished</span>
              </div>
            </div>
          </div>

          {/* Feature 2: Operational Trends & Category Storage Widgets */}
          <InsightsCharts insights={insights} />

          {/* Feature 3: Smart Restock Suggestions */}
          <SmartRestockWidget
            suggestions={insights.restockSuggestions}
            onOpenRestock={handleOpenRestock}
          />

          {/* Feature 1: Pantry Activity Timeline */}
          <div>
            <div className="mb-3">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Pantry Activity Audit Log
              </h3>
              <p className="text-xs text-gray-500">
                Real-time chronological log of employee snack consumption and inventory restocks
              </p>
            </div>
            <ActivityTimeline limit={20} showHeader={true} />
          </div>
        </>
      ) : null}

      {/* Restock Modal */}
      <RestockModal
        isOpen={isRestockModalOpen}
        snack={snackToRestock}
        onClose={() => {
          setIsRestockModalOpen(false);
          setSnackToRestock(null);
        }}
        onRestock={handleRestockSubmit}
      />
    </div>
  );
};
