'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  MapPin,
  Route as RouteIcon,
  Home,
  Sparkles,
  Camera,
  GraduationCap,
  CalendarCheck,
  ShoppingBag,
  Feather,
  Globe,
  Compass,
  Users,
  LogOut,
  X
} from 'lucide-react';
import { removeCookie } from '@/lib/api';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose = () => {} }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Pases de Colibrí', path: '/passes', icon: Ticket },
    { name: 'Escenarios / Spots', path: '/spots', icon: MapPin },
    { name: 'Rutas de Aves', path: '/routes', icon: RouteIcon },
    { name: 'Lodge & Cabañas', path: '/rooms', icon: Home },
    { name: 'Experiencias', path: '/experiences', icon: Sparkles },
    { name: 'Fotos & Productos', path: '/photos', icon: Camera },
    { name: 'Talleres', path: '/workshops', icon: GraduationCap },
    { name: 'Reservas', path: '/bookings', icon: CalendarCheck },
    { name: 'Órdenes', path: '/orders', icon: ShoppingBag },
    { name: 'Colibríes (Taxonomía)', path: '/colibries', icon: Feather },
    { name: 'Puntos GIS', path: '/puntos-gis', icon: Globe },
    { name: 'Tours', path: '/tours', icon: Compass },
    { name: 'Guías de Campo', path: '/guias', icon: Users },
  ];

  const handleLogout = () => {
    removeCookie('session_token');
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#10352b] text-white flex flex-col h-screen
          transition-transform duration-300 ease-in-out shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c29b38] flex items-center justify-center font-bold text-[#10352b] text-lg shadow-md">
              B
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white leading-tight">Bearded Lodge</h2>
              <p className="text-[11px] text-[#c29b38] font-medium">Panel de Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#c29b38] text-[#10352b] font-bold shadow'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#10352b]' : 'text-[#c29b38]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
