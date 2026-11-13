import React from 'react';

interface ActionToastProps {
  message: string | null;
  dark?: boolean;
  variant?: 'success' | 'error';
}

export const ActionToast: React.FC<ActionToastProps> = ({
  message,
  dark = false,
  variant = 'success',
}) => {
  if (!message) return null;

  const isError = variant === 'error';

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        className={`animate-scale-in flex max-w-md items-center gap-4 rounded-2xl border-2 px-6 py-5 text-center text-base font-semibold shadow-2xl backdrop-blur-md ${
          dark
            ? isError
              ? 'border-rose-400 bg-slate-950 text-white shadow-[0_20px_70px_rgba(0,0,0,0.75)]'
              : 'border-emerald-400 bg-slate-950 text-white shadow-[0_20px_70px_rgba(0,0,0,0.75)]'
            : isError
              ? 'border-rose-500 bg-rose-50 text-gray-950 shadow-[0_20px_70px_rgba(127,29,29,0.35)]'
              : 'border-emerald-500 bg-emerald-50 text-gray-950 shadow-[0_20px_70px_rgba(6,78,59,0.35)]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
            isError ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'
          }`}
        >
          {isError ? '!' : '✓'}
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
};
