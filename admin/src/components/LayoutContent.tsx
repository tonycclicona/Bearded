'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { getCookie } from '@/lib/api';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login' || pathname.startsWith('/login') || pathname.includes('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getCookie('session_token');

    if (isLoginPage) {
      setAuthorized(true);
      return;
    }

    if (!token) {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      } else {
        router.replace('/login');
      }
      return;
    }

    // Validar token activo con el backend de forma segura
    fetcher('/auth/me')
      .then(() => {
        setAuthorized(true);
      })
      .catch(() => {
        removeCookie('session_token');
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        } else {
          router.replace('/login');
        }
      });
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-gray-600 text-sm font-medium">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10352b] mr-3"></div>
        Verificando sesión...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-800 antialiased overflow-hidden w-full">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#10352b] text-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm">Bearded Lodge Admin</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
