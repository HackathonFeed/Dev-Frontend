import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  size = 'md',
}) => {
  const { isDark, toggleTheme } = useTheme();

  const pad = size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex items-center gap-2 border-2 border-black bg-white text-ink font-headline font-black uppercase hover:bg-[#ffcc00] hover:text-black transition-colors cursor-pointer ${pad} ${className}`}
    >
      {isDark ? (
        <Sun className={iconSize} strokeWidth={2.5} />
      ) : (
        <Moon className={iconSize} strokeWidth={2.5} />
      )}
      {showLabel && (
        <span className="text-[10px] tracking-wider">{isDark ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
};
