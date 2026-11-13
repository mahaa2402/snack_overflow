import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

export type RealtimeChangeType = 'inventory' | 'votes' | 'all';
type RealtimeListener = (change: RealtimeChangeType) => void;
type Subscribe = (listener: RealtimeListener) => () => void;

const RealtimeUpdatesContext = createContext<Subscribe | null>(null);

export const RealtimeUpdatesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const listeners = useRef(new Set<RealtimeListener>());

  const subscribe = useCallback<Subscribe>((listener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const notifyListeners = useCallback((change: RealtimeChangeType) => {
    listeners.current.forEach((listener) => listener(change));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const apiBaseUrl = (apiClient.defaults.baseURL || '/api').replace(/\/+$/, '');
    const streamUrl = new URL(`${apiBaseUrl}/realtime/stream`, window.location.origin);
    const eventSource = new EventSource(streamUrl.toString(), { withCredentials: true });

    eventSource.addEventListener('connected', () => notifyListeners('all'));
    eventSource.addEventListener('data-change', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          change?: unknown;
        };
        if (payload.change === 'inventory' || payload.change === 'votes') {
          notifyListeners(payload.change);
        } else {
          console.error('Received an invalid realtime update event.');
        }
      } catch (error) {
        console.error('Failed to process realtime update event:', error);
      }
    });

    return () => eventSource.close();
  }, [isAuthenticated, notifyListeners]);

  return (
    <RealtimeUpdatesContext.Provider value={subscribe}>
      {children}
    </RealtimeUpdatesContext.Provider>
  );
};

export const useRealtimeRefresh = (
  refresh: () => void,
  changeFilter: RealtimeChangeType = 'all'
): void => {
  const subscribe = useContext(RealtimeUpdatesContext);

  if (!subscribe) {
    throw new Error('useRealtimeRefresh must be used within a RealtimeUpdatesProvider');
  }

  const listener = useCallback(
    (change: RealtimeChangeType) => {
      if (change === 'all' || changeFilter === 'all' || change === changeFilter) {
        refresh();
      }
    },
    [changeFilter, refresh]
  );

  useEffect(() => subscribe(listener), [subscribe, listener]);
};
