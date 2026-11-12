import React, { useState, useEffect } from 'react';
import { CreateSnackInput, SnackCategory, SnackItem, UpdateSnackInput } from '../../types/snack';
import { Button } from '../common/Button';

interface SnackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSnackInput | UpdateSnackInput) => Promise<void>;
  snackToEdit?: SnackItem | null;
}

export const SnackModal: React.FC<SnackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  snackToEdit,
}) => {
  const isEditing = Boolean(snackToEdit);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<SnackCategory>('SWEET');
  const [quantity, setQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (snackToEdit) {
      setName(snackToEdit.name);
      setCategory(snackToEdit.category);
      setQuantity(snackToEdit.quantity);
      setLowStockThreshold(snackToEdit.lowStockThreshold);
    } else {
      setName('');
      setCategory('SWEET');
      setQuantity(10);
      setLowStockThreshold(5);
    }
    setError(null);
  }, [snackToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Snack name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing) {
        await onSubmit({
          name: name.trim(),
          category,
          quantity: Number(quantity),
          lowStockThreshold: Number(lowStockThreshold),
        });
      } else {
        await onSubmit({
          name: name.trim(),
          category,
          quantity: Number(quantity),
          lowStockThreshold: Number(lowStockThreshold),
        });
      }
      onClose();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save snack';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Edit Snack Details' : 'Add New Snack to Pantry'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Snack Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Almond Butter Cups"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SnackCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="SWEET">🍫 Sweet</option>
              <option value="SAVOURY">🥨 Savoury</option>
              <option value="DRINK">🥤 Drink</option>
              <option value="HEALTHY_ISH">🥗 Healthy-ish</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                {isEditing ? 'Current Stock' : 'Initial Stock'}
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Low-Stock Alert
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Create Snack'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

