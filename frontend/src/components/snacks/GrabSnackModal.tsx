import React, { useEffect, useState } from 'react';
import { SnackItem } from '../../types/snack';
import { Button } from '../common/Button';

interface GrabSnackModalProps {
  snack: SnackItem | null;
  dark?: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}

export const GrabSnackModal: React.FC<GrabSnackModalProps> = ({
  snack,
  dark = false,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(1);
    setError(null);
  }, [snack]);

  if (!snack) return null;

  const panelStyle = dark
    ? 'border-2 border-orange-400/80 bg-slate-900 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]'
    : 'border-2 border-orange-500 bg-orange-50 text-gray-950 shadow-[0_24px_80px_rgba(124,45,18,0.35)]';
  const labelStyle = dark ? 'text-slate-300' : 'text-gray-700';
  const inputStyle = dark
    ? 'border-slate-700 bg-slate-950 text-white'
    : 'border-gray-300 bg-white text-gray-900';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(amount);
      onClose();
    } catch (err: unknown) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Unable to grab this snack. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="grab-snack-title"
        className={`animate-scale-in w-full max-w-sm rounded-2xl p-6 shadow-2xl ${panelStyle}`}
      >
        <div className="mb-5 text-center">
          <span className="text-4xl" aria-hidden="true">🍿</span>
          <h2 id="grab-snack-title" className="mt-3 text-xl font-bold">
            Grab {snack.name}
          </h2>
          <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            There {snack.quantity === 1 ? 'is' : 'are'} {snack.quantity} {snack.quantity === 1 ? 'item' : 'items'} in stock.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="grab-quantity" className={`mb-2 block text-sm font-semibold ${labelStyle}`}>
              How many would you like?
            </label>
            <input
              id="grab-quantity"
              type="number"
              min={1}
              max={snack.quantity}
              step={1}
              required
              autoFocus
              value={amount}
              onChange={(event) => {
                const nextAmount = Number(event.target.value);
                setAmount(Number.isFinite(nextAmount) ? nextAmount : 1);
                setError(null);
              }}
              className={`w-full rounded-xl border px-4 py-3 text-lg font-semibold focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${inputStyle}`}
            />
            {error && (
              <p role="alert" className="mt-2 text-sm text-rose-500">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className={
                dark
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                  : 'border-orange-300 bg-white text-gray-800 hover:bg-orange-100'
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              disabled={!Number.isInteger(amount) || amount < 1 || amount > snack.quantity}
            >
              Grab {amount > 0 ? amount : ''}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
};
