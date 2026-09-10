import LayoutContent from '@/components/LayoutContent';
import '@/app/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bearded Mountaineer Lodge — Panel de Administración',
  description: 'Panel de Control y Gestión de Ecoturismo y Conservación',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var p = window.location.pathname;
                  var hasToken = document.cookie.indexOf('session_token=') !== -1 || (typeof localStorage !== 'undefined' && localStorage.getItem('session_token'));
                  if (!hasToken && p !== '/login' && !p.startsWith('/login') && !p.includes('login')) {
                    window.location.replace('/login');
                  }
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body className="bg-[#f8fafc] text-gray-800 antialiased overflow-hidden">
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
