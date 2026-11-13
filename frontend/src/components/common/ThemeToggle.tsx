import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'header' | 'floating';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'floating') {
    return (
      <aside aria-label="Theme switcher" className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
            isDark
              ? 'bg-slate-900/90 text-orange-400 border border-slate-700/80 shadow-orange-500/10 hover:border-orange-400/60 hover:shadow-orange-500/20 backdrop-blur-xl'
              : 'bg-white/95 text-slate-700 border border-stone-200/90 shadow-stone-900/10 hover:border-orange-500/60 hover:text-orange-600 backdrop-blur-xl'
          } ${className}`}
        >
          {/* Subtle glowing ring effect on hover */}
          <span
            className={`absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${
              isDark ? 'bg-orange-400/10 blur-sm' : 'bg-orange-500/10 blur-sm'
            }`}
            aria-hidden="true"
          />

          {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
      </aside>
    );
  }

  // Header variant (compact icon button fitting cleanly in navbar)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
        isDark
          ? 'bg-slate-800/80 text-orange-400 border border-slate-700/70 hover:bg-slate-700/80 hover:border-orange-400/50 hover:text-orange-300'
          : 'bg-stone-100/90 text-stone-700 border border-stone-200 hover:bg-stone-200/80 hover:text-stone-900 hover:border-stone-300'
      } ${className}`}
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
};
