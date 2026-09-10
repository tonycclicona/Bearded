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
      <body className="bg-[#f8fafc] text-gray-800 antialiased overflow-hidden">
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
