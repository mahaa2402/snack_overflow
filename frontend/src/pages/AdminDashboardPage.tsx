import React, { useEffect, useState, useCallback } from 'react';
import { ActivityItem, CreateSnackInput, PantryStats, SnackItem, UpdateSnackInput } from '../types/snack';
import {
  getPantryStatsApi,
  getSnacksApi,
  createSnackApi,
  updateSnackApi,
  deleteSnackApi,
  restockSnackApi,
  getRecentActivitiesApi,
} from '../api/snack.api';
import { SnackModal } from '../components/snacks/SnackModal';
import { RestockModal } from '../components/snacks/RestockModal';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { getCategoryEmoji, getSnackImageUrl } from '../utils/snackImages';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<PantryStats | null>(null);
  const [snacks, setSnacks] = useState<SnackItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isSnackModalOpen, setIsSnackModalOpen] = useState(false);
  const [snackToEdit, setSnackToEdit] = useState<SnackItem | null>(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [snackToRestock, setSnackToRestock] = useState<SnackItem | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, snacksData, activitiesData] = await Promise.all([
        getPantryStatsApi(),
        getSnacksApi({ limit: 100, sortBy: 'name' }),
        getRecentActivitiesApi(10),
      ]);

      setStats(statsData);
      setSnacks(snacksData.items);
      setActivities(activitiesData);
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
    if (snackToEdit) {
      await updateSnackApi(snackToEdit.id, data as UpdateSnackInput);
      showToast('Snack updated successfully');
    } else {
      await createSnackApi(data as CreateSnackInput);
      showToast('New snack added to pantry');
    }
    await loadAdminData();
  };

  const handleDeleteSnack = async (snack: SnackItem) => {
    if (window.confirm(`Are you sure you want to delete "${snack.name}" from the pantry?`)) {
      try {
        await deleteSnackApi(snack.id);
        showToast(`"${snack.name}" deleted successfully`);
        await loadAdminData();
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to delete snack';
        showToast(msg);
      }
    }
  };

  const handleRestockSnack = async (snackId: string, amount: number) => {
    await restockSnackApi(snackId, amount);
    showToast(`Added +${amount} units to inventory`);
    await loadAdminData();
  };

  const filteredSnacks = snacks.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center space-x-2">
          <span>🍿</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Pantry Admin Dashboard
            </h1>
            <Badge variant="warning">ADMIN PRIVILEGES</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage office pantry inventory, restock supplies, and review real-time member consumption logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSnackToEdit(null);
              setIsSnackModalOpen(true);
            }}
          >
            + Add New Snack
          </Button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Total Snacks
          </span>
          <div className="text-3xl font-extrabold text-gray-900 mt-2">
            {isLoading ? '...' : stats?.totalSnacks ?? 0}
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Catalog items</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Total Quantity
          </span>
          <div className="text-3xl font-extrabold text-gray-900 mt-2">
            {isLoading ? '...' : stats?.totalQuantity ?? 0}
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Units in pantry</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
            Low-Stock Snacks
          </span>
          <div className="text-3xl font-extrabold text-amber-600 mt-2">
            {isLoading ? '...' : stats?.runningLowCount ?? 0}
          </div>
          <span className="text-xs text-gray-400 mt-1 block">At or below threshold</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
            Out-of-Stock
          </span>
          <div className="text-3xl font-extrabold text-rose-600 mt-2">
            {isLoading ? '...' : stats?.outOfStockCount ?? 0}
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Depleted items</span>
        </div>
      </div>

      {/* Snack Management Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Snack Catalog & Inventory</h2>
            <p className="text-xs text-gray-500">Live stock levels with direct restock and edit actions</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="SWEET">🍫 Sweet</option>
              <option value="SAVOURY">🥨 Savoury</option>
              <option value="DRINK">🥤 Drink</option>
              <option value="HEALTHY_ISH">🥗 Healthy-ish</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Snack</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Quantity</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Threshold</th>
                <th className="px-5 py-3.5">Votes</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredSnacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    No snacks found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSnacks.map((snack) => (
                  <tr key={snack.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={getSnackImageUrl(snack.name, snack.category)}
                          alt={snack.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                        />
                        <span className="font-semibold text-gray-900">{snack.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                        <span>{getCategoryEmoji(snack.category)}</span>
                        <span>{snack.category.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">
                      {snack.quantity} units
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={
                          snack.status === 'STOCKED'
                            ? 'success'
                            : snack.status === 'RUNNING_LOW'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {snack.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      &le; {snack.lowStockThreshold} units
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-gray-700">
                      ❤️ {snack.voteCount}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSnackToRestock(snack);
                          setIsRestockModalOpen(true);
                        }}
                        className="text-xs px-2.5 py-1"
                      >
                        + Restock
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSnackToEdit(snack);
                          setIsSnackModalOpen(true);
                        }}
                        className="text-xs px-2.5 py-1"
                      >
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnack(snack)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1 transition-colors"
                        title="Delete snack"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Pantry Activities</h2>
          <p className="text-xs text-gray-500">Audit trail of snack restocking and member consumption</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Snack</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-xs">
                    No recent activities recorded yet.
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} className="hover:bg-gray-50/70 text-xs">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full ${
                          act.action === 'RESTOCKED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {act.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900">
                      {act.action === 'RESTOCKED' ? `+${act.amount}` : `-${act.amount}`}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-800">
                      {act.snack?.name || 'Snack'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {act.user?.name || act.user?.email || 'System'}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(act.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <SnackModal
        isOpen={isSnackModalOpen}
        onClose={() => setIsSnackModalOpen(false)}
        onSubmit={handleCreateOrUpdateSnack}
        snackToEdit={snackToEdit}
      />

      {/* Restock Modal */}
      <RestockModal
        isOpen={isRestockModalOpen}
        snack={snackToRestock}
        onClose={() => setIsRestockModalOpen(false)}
        onRestock={handleRestockSnack}
      />
    </div>
  );
};
