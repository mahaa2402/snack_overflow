import React, { useEffect, useState, useCallback } from 'react';
import { CreateSnackInput, PantryStats, SnackItem, UpdateSnackInput } from '../types/snack';
import {
  getPantryStatsApi,
  getSnacksApi,
  createSnackApi,
  updateSnackApi,
  deleteSnackApi,
  restockSnackApi,
} from '../api/snack.api';
import { SnackModal } from '../components/snacks/SnackModal';
import { RestockModal } from '../components/snacks/RestockModal';
import { getSnackImageUrl } from '../utils/snackImages';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, Boxes, CirclePlus, Package, PackagePlus, PackageX, Search, ThumbsUp, Trash2 } from 'lucide-react';

export const AdminInventoryPage: React.FC = () => {
  const { isDark } = useTheme();

  const [stats, setStats] = useState<PantryStats | null>(null);
  const [snacks, setSnacks] = useState<SnackItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'votes' | 'createdAt'>('name');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSnackModalOpen, setIsSnackModalOpen] = useState(false);
  const [snackToEdit, setSnackToEdit] = useState<SnackItem | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [snackToRestock, setSnackToRestock] = useState<SnackItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, snacksData] = await Promise.all([
        getPantryStatsApi(),
        getSnacksApi({
          limit: 100,
          search: search.trim() || undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          sortBy,
        }),
      ]);
      setStats(statsData);
      setSnacks(snacksData.items);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      await loadData();
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleDeleteSnack = async (snack: SnackItem) => {
    if (window.confirm(`Are you sure you want to delete "${snack.name}" from the pantry?`)) {
      try {
        await deleteSnackApi(snack.id);
        showToast(`"${snack.name}" deleted`);
        await loadData();
      } catch (err: unknown) {
        const msg = typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to delete snack';
        showToast(msg);
      }
    }
  };

  const handleRestockSnack = async (snackId: string, amount: number) => {
    try {
      await restockSnackApi(snackId, amount);
      showToast(`Added +${amount} units to stock!`);
      await loadData();
    } catch (err: unknown) {
      throw err;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Toast Feedback */}
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
          <span className="text-orange-400"><Boxes size={16} /></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes size={20} className="text-orange-500" />
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Pantry Inventory Manager
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Manage catalog varieties, track stock thresholds, perform atomic restocks, and remove items
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
            <CirclePlus size={16} />
            <span>Add New Snack</span>
          </button>
        </div>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`admin-stat-card p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Varieties</p>
            <Boxes size={17} className="text-orange-500" />
          </div>
          <p className={`text-2xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats?.totalSnacks ?? 0}
          </p>
          <p className="text-[11px] text-orange-500 mt-0.5">Active Catalog</p>
        </div>

        <div
          className={`admin-stat-card p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Units</p>
            <Package size={17} className="text-orange-500" />
          </div>
          <p className={`text-2xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats?.totalQuantity ?? 0}
          </p>
          <p className="text-[11px] text-orange-500 mt-0.5">{stats?.stockedCount ?? 0} well stocked</p>
        </div>

        <div
          className={`admin-stat-card p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Running Low</p>
            <AlertTriangle size={17} className="text-orange-500" />
          </div>
          <p className="text-2xl font-extrabold mt-1 text-orange-500">
            {stats?.runningLowCount ?? 0}
          </p>
          <p className="text-[11px] text-orange-500/80 mt-0.5">Needs reorder</p>
        </div>

        <div
          className={`admin-stat-card p-4 rounded-2xl border transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
              : 'bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Out of Stock</p>
            <PackageX size={17} className="text-orange-500" />
          </div>
          <p className="text-2xl font-extrabold mt-1 text-orange-500">
            {stats?.outOfStockCount ?? 0}
          </p>
          <p className="text-[11px] text-orange-500/80 mt-0.5">Zero stock</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row gap-3 items-center justify-between ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/90 backdrop-blur-xl'
            : 'bg-white border-gray-200/80 shadow-xs'
        }`}
      >
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search snack name..."
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

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`text-xs border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              isDark
                ? 'bg-slate-950/70 border-slate-700 text-slate-200'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <option value="ALL">All Categories</option>
            <option value="SWEET">Sweet</option>
            <option value="SAVOURY">Savoury</option>
            <option value="DRINK">Drink</option>
            <option value="HEALTHY_ISH">Healthy</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`text-xs border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              isDark
                ? 'bg-slate-950/70 border-slate-700 text-slate-200'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <option value="ALL">All Statuses</option>
            <option value="STOCKED">Stocked</option>
            <option value="RUNNING_LOW">Running Low</option>
            <option value="GONE">Out of Stock</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'votes' | 'createdAt')}
            className={`text-xs border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              isDark
                ? 'bg-slate-950/70 border-slate-700 text-slate-200'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <option value="name">🔤 Name (A - Z)</option>
            <option value="quantity">Quantity</option>
            <option value="votes">Most Votes</option>
            <option value="createdAt">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Table */}
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
                <th className="px-5 py-3.5 text-left">Product</th>
                <th className="px-5 py-3.5 text-left">Category</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-center">In Stock</th>
                <th className="px-5 py-3.5 text-center">Threshold</th>
                <th className="px-5 py-3.5 text-center"><span className="inline-flex items-center gap-1">Votes <ThumbsUp size={13} /></span></th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-gray-100'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Boxes size={24} className="mx-auto mb-2 animate-pulse text-orange-500" />
                    Loading pantry inventory...
                  </td>
                </tr>
              ) : snacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Search size={25} className="mx-auto mb-2 text-orange-500" />
                    No snacks match your current filters.
                  </td>
                </tr>
              ) : (
                snacks.map((snack) => (
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
                            isDark ? 'border-slate-700' : 'border-gray-100'
                          }`}
                        />
                        <div>
                          <p className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {snack.name}
                          </p>
                          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                            ID: {snack.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-400">
                        <span>{snack.category}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-500 dark:text-orange-300"
                      >
                        {snack.status === 'STOCKED'
                          ? 'Stocked'
                          : snack.status === 'RUNNING_LOW'
                          ? 'Running low'
                          : 'Out of stock'}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-center font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {snack.quantity}
                    </td>
                    <td className={`px-5 py-3.5 text-center text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {snack.lowStockThreshold}
                    </td>
                    <td className="px-5 py-3.5 text-center font-semibold text-orange-400">
                      {snack.voteCount}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setSnackToRestock(snack);
                            setIsRestockModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-500 transition-all hover:bg-orange-500 hover:text-white dark:text-orange-300"
                          title="Restock units"
                        >
                          <><PackagePlus size={13} /> Restock</>
                        </button>
                        <button
                          onClick={() => {
                            setSnackToEdit(snack);
                            setIsSnackModalOpen(true);
                          }}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                            isDark
                              ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Edit details"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSnack(snack)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                            isDark
                              ? 'border-slate-700 bg-transparent text-slate-300 hover:border-orange-500 hover:bg-orange-500 hover:text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700'
                          }`}
                          title="Delete snack"
                        >
                          <><Trash2 size={13} /> Delete</>
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
