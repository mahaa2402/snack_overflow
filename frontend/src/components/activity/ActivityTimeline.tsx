import React, { useState, useEffect } from 'react';
import { ActivityItem } from '../../types/snack';
import { getActivitiesApi, getMyActivitiesApi } from '../../api/snack.api';
import { PackagePlus, ShoppingBag } from 'lucide-react';

interface ActivityTimelineProps {
  initialActivities?: ActivityItem[];
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  dark?: boolean;
  personal?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  initialActivities,
  limit = 15,
  showHeader = true,
  compact = false,
  dark = false,
  personal = false,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities || []);
  const [filterAction, setFilterAction] = useState<'ALL' | 'CONSUMED' | 'RESTOCKED'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(!initialActivities);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const data = personal
        ? await getMyActivitiesApi(limit)
        : await getActivitiesApi(limit, filterAction);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [filterAction, limit, personal]);

  const formatActivityTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={
        dark
          ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 shadow-xl shadow-black/40 rounded-2xl p-5'
          : 'bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs'
      }
    >
      {showHeader && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b mb-4 ${
            dark ? 'border-slate-800' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-50"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <h3
              className={`text-base font-bold tracking-tight ${
                dark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {personal ? 'My Grab History' : 'Pantry Activity Timeline'}
            </h3>
            <span className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
              ({activities.length})
            </span>
          </div>

          {!personal && <div
            className={`flex items-center p-1 rounded-xl text-xs font-semibold ${
              dark
                ? 'bg-slate-950/70 border border-slate-800/80'
                : 'bg-gray-100/80'
            }`}
          >
            {(['ALL', 'CONSUMED', 'RESTOCKED'] as const).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setFilterAction(action)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterAction === action
                    ? dark
                      ? 'bg-orange-500 text-white shadow-xs font-bold'
                      : 'bg-white text-gray-900 shadow-2xs font-bold'
                    : dark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {action === 'ALL' ? 'All' : action === 'CONSUMED' ? 'Grabbed' : 'Restocked'}
              </button>
            ))}
          </div>}
        </div>
      )}

      {/* Activity Timeline List */}
      {isLoading ? (
        <div
          className={`py-8 text-center text-xs animate-pulse ${
            dark ? 'text-slate-400' : 'text-gray-400'
          }`}
        >
          Loading pantry timeline...
        </div>
      ) : activities.length === 0 ? (
        <div
          className={`py-8 text-center text-xs ${
            dark ? 'text-slate-400' : 'text-gray-400'
          }`}
        >
          <span className="text-2xl block mb-2">🍃</span>
          {personal ? 'You have not grabbed any snacks yet.' : 'No activities recorded for this filter.'}
        </div>
      ) : (
        <div
          className={`divide-y max-h-[460px] overflow-y-auto pr-1 ${
            dark ? 'divide-slate-800/80' : 'divide-gray-100'
          }`}
        >
          {activities.map((item) => {
            const isConsumed = item.action === 'CONSUMED';
            return (
              <div
                key={item.id}
                className={`${compact ? 'py-2' : 'py-3'} flex items-center justify-between gap-3 group px-2 rounded-xl transition-colors ${
                  dark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50/60'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Action Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base shadow-2xs ${
                      isConsumed
                        ? dark
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          : 'bg-orange-50 text-orange-600 border border-orange-100'
                        : dark
                        ? 'bg-orange-500/10 text-orange-300 border border-orange-500/25'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}
                  >
                    {isConsumed ? <ShoppingBag size={16} /> : <PackagePlus size={16} />}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <p
                      className={`text-xs leading-snug truncate ${
                        dark ? 'text-slate-200' : 'text-gray-900'
                      }`}
                    >
                      <span className={`font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>
                        {personal ? 'You' : item.user?.name || 'Pantry Member'}
                      </span>{' '}
                      <span className={dark ? 'text-slate-400' : 'text-gray-500'}>
                        {isConsumed ? 'grabbed' : 'restocked'}
                      </span>{' '}
                      <span className={`font-semibold ${dark ? 'text-orange-300' : 'text-gray-900'}`}>
                        {item.snack?.name || 'a snack'}
                      </span>{' '}
                    </p>
                    <span className={`text-[11px] ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
                      {formatActivityTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Amount Pill */}
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      isConsumed
                        ? dark
                          ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                          : 'bg-orange-100/70 text-orange-800'
                        : dark
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isConsumed ? `-${item.amount}` : `+${item.amount}`}{' '}
                    <span className="text-[10px] ml-1 font-normal">
                      {item.amount === 1 ? 'unit' : 'units'}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
