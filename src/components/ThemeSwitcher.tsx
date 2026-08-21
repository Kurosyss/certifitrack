import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const applyTheme = (t: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      const isDark = 
        t === 'dark' || 
        (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button 
      onClick={cycleTheme}
      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      aria-label={`Toggle theme (Current: ${theme})`}
      title="Toggle theme"
    >
      {theme === 'light' && <Sun size={18} />}
      {theme === 'dark' && <Moon size={18} />}
      {theme === 'system' && <Monitor size={18} />}
    </button>
  );
}
