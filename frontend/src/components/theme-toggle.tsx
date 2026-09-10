'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'antigravity-theme';

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggle = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const next = !isDark;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // Ignorar errores de almacenamiento local
    }
    setDark(next);
  };

  if (!mounted) {
    return (
      <div className="w-9 h-9 p-2" aria-hidden="true" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="p-2 text-white/90 hover:text-accent transition-colors rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer"
    >
      {dark ? (
        <Sun className="w-5 h-5 text-accent" />
      ) : (
        <Moon className="w-5 h-5 text-accent" />
      )}
    </button>
  );
}