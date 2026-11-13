import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { StockAlertItem } from '../../types/restock';
import { getAlertsApi } from '../../api/restock.api';
import { restockSnackApi } from '../../api/snack.api';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const NotificationBell: React.FC = () => {
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();

  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [isRestockingId, setIsRestockingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getAlertsApi();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to fetch stock alerts:', err);
    }
  }, [isAdmin]);

  // Initial fetch and 30-second polling fallback
  useEffect(() => {
    if (!isAdmin) return;
    fetchAlerts();

    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAdmin, fetchAlerts]);

  // Real-time SSE connection
  useEffect(() => {
    if (!isAdmin) return;

    let eventSource: EventSource | null = null;
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const apiBaseUrl = (apiClient.defaults.baseURL || 'http://localhost:5000/api').replace(/\/+$/, '');
      const streamUrl = new URL(`${apiBaseUrl}/alerts/stream`, window.location.origin);
      if (token) {
        streamUrl.searchParams.set('token', token);
      }
      eventSource = new EventSource(streamUrl.toString(), { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_ALERTS' && Array.isArray(data.alerts)) {
            setAlerts(data.alerts);
          } else {
            // New alert broadcast
            fetchAlerts();
          }
        } catch {
          fetchAlerts();
        }
      };

      eventSource.addEventListener('refresh', () => {
        fetchAlerts();
      });

      eventSource.onerror = () => {
        // Fallback polling will handle it if SSE encounters connection drops
        eventSource?.close();
      };
    } catch {
      // Fallback polling is active
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAdmin, fetchAlerts]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter out dismissed alerts for current session
  const activeAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  const criticalCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = activeAlerts.filter((a) => a.severity === 'WARNING').length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const handleQuickRestock = async (alert: StockAlertItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRestockingId(alert.snackId);
    try {
      const amount = Math.max(alert.lowStockThreshold * 2 - alert.currentQuantity, 10);
      await restockSnackApi(alert.snackId, amount);
      setToastMessage(`Restocked +${amount} units for ${alert.snackName}!`);
      setTimeout(() => setToastMessage(null), 3000);
      await fetchAlerts();
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Restock failed';
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsRestockingId(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-orange-500/40">
          🍿 {toastMessage}
        </div>
      )}

      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Stock alerts (${activeAlerts.length})`}
        title={`Stock Alerts (${activeAlerts.length})`}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          isDark
            ? 'bg-slate-800/80 text-slate-300 border border-slate-700/70 hover:bg-slate-700 hover:text-white'
            : 'bg-stone-100/90 text-stone-700 border border-stone-200 hover:bg-stone-200 hover:text-stone-900'
        } ${isOpen ? 'ring-2 ring-orange-500' : ''}`}
      >
        <span className="text-base select-none" role="img" aria-hidden="true">
          🔔
        </span>

        {/* Badge Count */}
        {activeAlerts.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-xs animate-pulse ${
              criticalCount > 0 ? 'bg-rose-500' : 'bg-amber-500'
            }`}
          >
            {activeAlerts.length > 99 ? '99+' : activeAlerts.length}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden transition-all duration-200 ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-xl shadow-black/80'
              : 'bg-white border-stone-200 text-stone-900 shadow-stone-900/15'
          }`}
        >
          {/* Dropdown Header */}
          <div
            className={`flex items-center justify-between p-4 border-b ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-stone-100 bg-stone-50/70'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">Stock Alerts</span>
              {activeAlerts.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                  {activeAlerts.length}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-[11px]">
              {criticalCount > 0 && (
                <span className="text-rose-400 font-semibold">• {criticalCount} critical</span>
              )}
              {warningCount > 0 && (
                <span className="text-amber-400 font-semibold">• {warningCount} low</span>
              )}
            </div>
          </div>

          {/* Alerts List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/40 divide-stone-100">
            {activeAlerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <span className="text-3xl block">🎉</span>
                <p className="text-xs font-bold">All inventory levels are healthy!</p>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                  No snacks are currently running low or out of stock.
                </p>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 transition-colors flex items-start justify-between gap-3 ${
                      isDark
                        ? isCritical
                          ? 'hover:bg-rose-950/20 bg-rose-950/10'
                          : 'hover:bg-amber-950/20 bg-amber-950/10'
                        : isCritical
                        ? 'hover:bg-rose-50/60 bg-rose-50/30'
                        : 'hover:bg-amber-50/60 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0">
                      <span className="text-base shrink-0 mt-0.5">
                        {isCritical ? '🚫' : '⚠️'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="font-bold text-xs truncate">{alert.snackName}</p>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                          Stock: <span className="font-bold">{alert.currentQuantity}</span> / Min: {alert.lowStockThreshold}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleQuickRestock(alert, e)}
                        disabled={isRestockingId === alert.snackId}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white transition-all shadow-xs disabled:opacity-50"
                        title="Restock units"
                      >
                        {isRestockingId === alert.snackId ? '...' : '+ Restock'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className={`p-1 rounded-lg text-xs transition-colors ${
                          isDark
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                            : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                        }`}
                        title="Dismiss alert"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div
            className={`p-3 text-center border-t ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-stone-100 bg-stone-50/70'
            }`}
          >
            <Link
              to="/admin/restock"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors inline-flex items-center gap-1"
            >
              <span>Open Smart Restock List</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
