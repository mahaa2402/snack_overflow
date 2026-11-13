import React, { useState } from 'react';
import { PantryInsights } from '../../types/snack';
import { getSnackImageUrl } from '../../utils/snackImages';
import { ChartNoAxesCombined } from 'lucide-react';

interface InsightsChartsProps {
  insights: PantryInsights;
}

export const InsightsCharts: React.FC<InsightsChartsProps> = ({ insights }) => {
  const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Select active trend series based on time range
  const currentTrendData =
    timeRange === 'Daily'
      ? insights.consumptionTrends.daily.map((d) => ({
          label: d.dayLabel,
          subLabel: d.fullDate,
          consumed: d.consumed,
          restocked: d.restocked,
        }))
      : timeRange === 'Weekly'
      ? insights.consumptionTrends.weekly.map((w) => ({
          label: w.weekLabel,
          subLabel: w.rangeLabel,
          consumed: w.consumed,
          restocked: w.restocked,
        }))
      : insights.consumptionTrends.monthly.map((m) => ({
          label: m.monthLabel,
          subLabel: String(m.year),
          consumed: m.consumed,
          restocked: m.restocked,
        }));

  // Calculate chart max height scale
  const maxVal = Math.max(
    ...currentTrendData.map((d) => Math.max(d.consumed, d.restocked)),
    10
  );

  return (
    <div className="space-y-6">
      {/* 1. Main Operational Consumption Trends Bar Chart */}
      <div className="bg-white rounded-3xl border border-gray-150 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 tracking-tight">
                <ChartNoAxesCombined size={18} className="text-orange-500" />
                Pantry Consumption Trends
              </h3>
              <span className="bg-orange-50 text-orange-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-orange-100">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Historical consumption velocity vs warehouse restock events
            </p>
          </div>

          {/* Time Filter Toggle (Monthly / Weekly / Daily) */}
          <div className="flex items-center bg-gray-100/90 p-1 rounded-2xl text-xs font-semibold self-start sm:self-auto">
            {(['Monthly', 'Weekly', 'Daily'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => {
                  setTimeRange(range);
                  setHoveredBarIndex(null);
                }}
                className={`px-4 py-1.5 rounded-xl transition-all ${
                  timeRange === range
                    ? 'bg-orange-500 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Bar Chart with Floating Tooltip */}
        <div className="relative pt-10 pb-2">
          {/* Chart Bars Grid */}
          <div className="h-64 sm:h-72 flex items-end justify-between gap-2 sm:gap-6 border-b border-gray-100 px-2 sm:px-4">
            {currentTrendData.map((item, idx) => {
              const consumedHeightPercent = Math.min(100, Math.round((item.consumed / maxVal) * 100));
              const restockedHeightPercent = Math.min(100, Math.round((item.restocked / maxVal) * 100));
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Floating Dark Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-12 z-30 bg-gray-950 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-gray-800 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                      <div className="font-bold text-gray-200 text-[11px] mb-0.5">
                        {item.subLabel || item.label}
                      </div>
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span className="flex items-center text-orange-300 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-orange-500 mr-1.5"></span>
                          {item.consumed} Consumed
                        </span>
                        <span className="flex items-center text-slate-200 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span>
                          {item.restocked} Restocked
                        </span>
                      </div>
                      {/* Arrow caret */}
                      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-950 rotate-45 border-r border-b border-gray-800"></div>
                    </div>
                  )}

                  {/* Dual bar columns distinguish restocks from consumed units. */}
                  <div className="w-full flex items-end justify-center space-x-1 sm:space-x-2 h-full pb-1">
                    <div
                      className="w-2.5 sm:w-5 bg-slate-500 rounded-t-lg relative transition-all duration-300 group-hover:bg-slate-600"
                      style={{ height: `${Math.max(restockedHeightPercent, 4)}%` }}
                    >
                      {item.restocked > 0 && (
                        <span className="sr-only">Restocked {item.restocked}</span>
                      )}
                    </div>

                    {/* Consumed Bar (Solid Vibrant Blue with Rounded Caps) */}
                    <div
                      className={`w-3.5 sm:w-7 rounded-t-xl transition-all duration-300 shadow-2xs ${
                        isHovered
                          ? 'bg-orange-700 shadow-md scale-102'
                          : 'bg-orange-600 hover:bg-orange-500'
                      }`}
                      style={{ height: `${Math.max(consumedHeightPercent, 6)}%` }}
                    >
                      {item.consumed > 0 && (
                        <div className="w-full text-center text-[10px] font-bold text-white pt-1 hidden sm:block">
                          {item.consumed > 10 ? item.consumed : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom X-Axis Label */}
                  <div className="mt-3 text-center">
                    <span className={`block text-xs font-semibold ${isHovered ? 'text-orange-600 font-bold' : 'text-gray-600'}`}>
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-gray-400 truncate max-w-[60px]">
                      {item.subLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center space-x-6 mt-6 pt-3 text-xs font-medium text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-orange-600 inline-block shadow-xs"></span>
              <span className="text-gray-700 font-semibold">Consumed Units</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-md bg-slate-500 inline-block"></span>
              <span className="text-gray-700 font-semibold">Restocked Units</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Widgets: Best Selling (Leaderboard) & Warehouse Storage (Category Meters) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Most Consumed Snacks Leaderboard (Matches "Best Selling" in User Image) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Most Consumed Snacks
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Top high-velocity pantry favorites</p>
              </div>
              <span className="text-xs font-semibold text-gray-400">Total Consumed</span>
            </div>

            <div className="divide-y divide-gray-100">
              {insights.topConsumedSnacks.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No consumption activities recorded yet.
                </div>
              ) : (
                insights.topConsumedSnacks.map((snack, rank) => (
                  <div
                    key={snack.id}
                    className="py-3.5 flex items-center justify-between gap-3 group hover:bg-gray-50/70 px-2 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Rank Index */}
                      <span className="w-5 text-center text-xs font-bold text-gray-400">
                        {rank + 1}
                      </span>

                      {/* Product Thumbnail */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200/60 shadow-2xs">
                        <img
                          src={getSnackImageUrl(snack.name, snack.category)}
                          alt={snack.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">
                          {snack.name}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5">
                          <span>{snack.category.replace('_', ' ')}</span>
                          <span>&bull;</span>
                          <span className="text-orange-600 font-semibold">
                            {snack.currentStock} in stock
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total Consumed Metric */}
                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-gray-900">
                        {snack.totalConsumed}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        ~{snack.burnRatePerDay}/day
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Warehouse Storage & Category Distribution (Matches "Warehouse Storage" Segmented Meters in User Image) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Pantry Category Storage
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Consumption share by snack group</p>
              </div>
              <span className="text-xs font-bold text-gray-500">Share %</span>
            </div>

            <div className="space-y-5">
              {insights.categoryBreakdown.map((cat) => {
                // Segmented meter design (30 tick lines) like in the reference image
                const totalTicks = 28;
                const filledTicks = Math.round((cat.percentage / 100) * totalTicks);

                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-800">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-2">
                          ({cat.snackCount} varieties &bull; {cat.currentStock} in stock)
                        </span>
                      </div>
                      <span className="font-extrabold text-gray-900">{cat.percentage}%</span>
                    </div>

                    {/* Segmented Tick Bar (matches reference image "Warehouse Storage") */}
                    <div className="flex items-center space-x-[2px] h-3.5 bg-gray-50 p-0.5 rounded-md border border-gray-100">
                      {Array.from({ length: totalTicks }).map((_, i) => {
                        const isFilled = i < filledTicks;
                        let barColor = 'bg-gray-200';
                        if (isFilled) {
                          barColor = 'bg-orange-500';
                        }
                        return (
                          <div
                            key={i}
                            className={`flex-1 h-full rounded-[1px] transition-colors duration-200 ${barColor}`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
                      <span>Empty</span>
                      <span>Almost Full</span>
                      <span>Full</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
