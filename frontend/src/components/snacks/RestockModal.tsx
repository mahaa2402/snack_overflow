import React, { useState } from 'react';
import { SnackItem } from '../../types/snack';
import { Button } from '../common/Button';

interface RestockModalProps {
  isOpen: boolean;
  snack: SnackItem | null;
  onClose: () => void;
  onRestock: (snackId: string, amount: number) => Promise<void>;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  snack,
  onClose,
  onRestock,
}) => {
  const [amount, setAmount] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !snack) return null;

  const quickAmounts = [5, 10, 20, 50];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Restock amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onRestock(snack.id, amount);
      onClose();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to restock snack';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Restock Inventory</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mt-3">
          <p className="text-sm font-semibold text-gray-900">{snack.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Current in pantry: <span className="font-bold text-gray-800">{snack.quantity}</span> units
          </p>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Quick Add Units
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    amount === q
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Custom Restock Amount
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Add +{amount} Units
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

