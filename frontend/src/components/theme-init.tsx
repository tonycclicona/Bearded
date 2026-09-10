'use client';

import { useEffect } from 'react';

const THEME_KEY = 'antigravity-theme';

export default function ThemeInit() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return null;
}