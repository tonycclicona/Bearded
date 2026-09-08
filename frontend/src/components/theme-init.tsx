'use client';

import { useEffect } from 'react';

const THEME_KEY = 'antigravity-theme';

export default function ThemeInit() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      const dark = stored !== 'light';
      document.documentElement.classList.toggle('dark', dark);
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return null;
}