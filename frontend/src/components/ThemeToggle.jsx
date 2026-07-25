import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle relative w-14 h-7 rounded-full border border-border bg-surface/80 backdrop-blur-sm transition-all duration-500 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
    >
      <span
        className={`theme-toggle-knob absolute top-0.5 left-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
          isDark
            ? 'translate-x-7 bg-gradient-primary text-white shadow-lg shadow-primary/40'
            : 'translate-x-0 bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-lg shadow-amber-400/40'
        }`}
      >
        {isDark ? <Moon size={13} /> : <Sun size={13} />}
      </span>
      <Sun size={11} className={`absolute left-1.5 top-2 transition-opacity duration-300 ${isDark ? 'opacity-30 text-muted' : 'opacity-0'}`} />
      <Moon size={11} className={`absolute right-1.5 top-2 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-30 text-muted'}`} />
    </button>
  );
}
