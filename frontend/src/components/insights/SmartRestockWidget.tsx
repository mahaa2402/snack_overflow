import React from 'react';
import { RestockSuggestionItem, SnackItem } from '../../types/snack';
import { getSnackImageUrl } from '../../utils/snackImages';
import { CheckCircle2, PackagePlus, Sparkles } from 'lucide-react';

interface SmartRestockWidgetProps {
  suggestions: RestockSuggestionItem[];
  onOpenRestock: (snack: SnackItem, suggestedAmount: number) => void;
}

export const SmartRestockWidget: React.FC<SmartRestockWidgetProps> = ({
  suggestions,
  onOpenRestock,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-150 p-6 sm:p-7 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles size={18} className="text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Smart Restock Suggestions
            </h3>
            <span className="bg-orange-50 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-100">
              Admin Automated Analytics
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Calculated from real-time stock levels, low-stock thresholds, and 14-day historical consumption velocity
          </p>
        </div>

        <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
          Target Buffer: <span className="font-bold text-gray-700">14-day supply</span>
        </div>
      </div>

      {/* Suggestions Table / List */}
      {suggestions.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-orange-500" />
          <h4 className="text-sm font-bold text-gray-800">All Pantry Inventory is Healthy!</h4>
          <p className="text-xs text-gray-500 mt-1">
            No snacks currently need replenishment. All items are comfortably above low-stock thresholds.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3 text-center">Actual Stock</th>
                <th className="py-3 px-3 text-center">Threshold</th>
                <th className="py-3 px-3 text-center">Weekly Demand</th>
                <th className="py-3 px-3 text-center">Suggested Restock</th>
                <th className="py-3 px-3">Urgency & Explanation</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suggestions.map((item) => {
                // Convert to mock SnackItem for RestockModal compatibility
                const snackMock: SnackItem = {
                  id: item.snackId,
                  name: item.snackName,
                  category: item.category,
                  quantity: item.currentQuantity,
                  lowStockThreshold: item.lowStockThreshold,
                  status: item.status,
                  voteCount: 0,
                  createdAt: '',
                  updatedAt: '',
                };

                return (
                  <tr
                    key={item.snackId}
                    className="hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* Product Name & Category */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200/60 shadow-2xs">
                          <img
                            src={getSnackImageUrl(item.snackName, item.category)}
                            alt={item.snackName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block truncate max-w-[160px] sm:max-w-[200px]">
                            {item.snackName}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {item.category.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actual Stock Level */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className="inline-block rounded-md bg-orange-50 px-2 py-0.5 font-extrabold text-orange-700"
                      >
                        {item.currentQuantity}
                      </span>
                    </td>

                    {/* Low Stock Threshold */}
                    <td className="py-3.5 px-3 text-center text-gray-500 font-medium">
                      {item.lowStockThreshold}
                    </td>

                    {/* Weekly Consumption Velocity */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-bold text-orange-700">
                        ~{item.weeklyConsumptionRate}
                      </span>
                      <span className="text-[10px] text-gray-400 block">units/wk</span>
                    </td>

                    {/* Suggested Restock Quantity (Distinguished from actual) */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center space-x-1 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-xl font-extrabold text-xs">
                        <span>+{item.suggestedRestockAmount}</span>
                        <span className="text-[10px] font-normal text-orange-600">units</span>
                      </span>
                    </td>

                    {/* Urgency & Explainable Rationale */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
                          {item.urgency}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed line-clamp-2">
                        {item.reasoning}
                      </p>
                    </td>

                    {/* Restock Action Button (Matches "Add Stock" in User Reference Image) */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenRestock(snackMock, item.suggestedRestockAmount)}
                        className="inline-flex items-center space-x-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all"
                      >
                        <PackagePlus size={14} />
                        <span>Add Stock</span>
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
  );
};
