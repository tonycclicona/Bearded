'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetcher } from '@/lib/api';
import {
  Ticket,
  CalendarCheck,
  Home,
  Route as RouteIcon,
  ShoppingBag,
  Camera,
  Feather,
  Globe,
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    passes: 0,
    rooms: 0,
    routes: 0,
    bookings: 0,
    photos: 0,
    colibries: 0
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [passesData, roomsData, routesData, bookingsData, photosData, colibriesData] = await Promise.allSettled([
          fetcher('/passes'),
          fetcher('/rooms'),
          fetcher('/routes'),
          fetcher('/bookings'),
          fetcher('/photos'),
          fetcher('/colibries')
        ]);

        const passesList = passesData.status === 'fulfilled' ? passesData.value : [];
        const roomsList = roomsData.status === 'fulfilled' ? roomsData.value : [];
        const routesList = routesData.status === 'fulfilled' ? routesData.value : [];
        const bookingsList = bookingsData.status === 'fulfilled' ? bookingsData.value : [];
        const photosList = photosData.status === 'fulfilled' ? photosData.value : [];
        const colibriesList = colibriesData.status === 'fulfilled' ? colibriesData.value : [];

        setStats({
          passes: Array.isArray(passesList) ? passesList.length : 0,
          rooms: Array.isArray(roomsList) ? roomsList.length : 0,
          routes: Array.isArray(routesList) ? routesList.length : 0,
          bookings: Array.isArray(bookingsList) ? bookingsList.length : 0,
          photos: Array.isArray(photosList) ? photosList.length : 0,
          colibries: Array.isArray(colibriesList) ? colibriesList.length : 0
        });

        if (Array.isArray(bookingsList)) {
          setBookings(bookingsList.slice(0, 5));
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard General
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Resumen de actividades, catálogo y reservas de Bearded Mountaineer Lodge.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 bg-[#10352b] hover:bg-[#0a231c] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-all"
          >
            <CalendarCheck className="w-4 h-4 text-[#c29b38]" />
            Ver Reservas
          </Link>
          <a
            href="https://beardedmountaineerlodge.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            Ver Sitio Web
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Pases</span>
            <Ticket className="w-4 h-4 text-[#c29b38]" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.passes}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Categorías activas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Cabañas</span>
            <Home className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.rooms}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Habitaciones lodge</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Rutas</span>
            <RouteIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.routes}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Senderos guiados</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Reservas</span>
            <CalendarCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.bookings}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Registros totales</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Fotos</span>
            <Camera className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.photos}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Galería & Tienda</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Colibríes</span>
            <Feather className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.colibries}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Taxonomía registrada</p>
        </div>
      </div>

      {/* Recent Bookings & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#10352b]" />
              <h2 className="font-bold text-sm text-gray-900">Últimas Reservas</h2>
            </div>
            <Link href="/bookings" className="text-xs font-semibold text-[#10352b] hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Cargando registros...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No hay reservas registradas en el sistema aún.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3.5 font-medium text-gray-900">{b.primaryName || b.customerName || 'Cliente'}</td>
                      <td className="p-3.5 text-gray-500">{new Date(b.createdAt || b.date).toLocaleDateString('es-PE')}</td>
                      <td className="p-3.5">{b.itemType || 'Pase'}</td>
                      <td className="p-3.5 font-bold text-gray-900">
                        {b.currency || 'USD'} {Number(b.totalAmount || b.unitPrice || 0).toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                          {b.status || 'CONFIRMADO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Access Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-sm text-gray-900">Gestión Rápida de Módulos</h2>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <Link href="/passes" className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-[#10352b] hover:bg-gray-50 transition-all font-medium">
              <span className="flex items-center gap-2.5"><Ticket className="w-4 h-4 text-[#c29b38]" /> Pases de Entrada</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            <Link href="/rooms" className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-[#10352b] hover:bg-gray-50 transition-all font-medium">
              <span className="flex items-center gap-2.5"><Home className="w-4 h-4 text-emerald-600" /> Cabañas & Lodge</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            <Link href="/routes" className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-[#10352b] hover:bg-gray-50 transition-all font-medium">
              <span className="flex items-center gap-2.5"><RouteIcon className="w-4 h-4 text-blue-600" /> Rutas de Aves</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            <Link href="/colibries" className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-[#10352b] hover:bg-gray-50 transition-all font-medium">
              <span className="flex items-center gap-2.5"><Feather className="w-4 h-4 text-teal-600" /> Catálogo de Colibríes</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            <Link href="/puntos-gis" className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-[#10352b] hover:bg-gray-50 transition-all font-medium">
              <span className="flex items-center gap-2.5"><Globe className="w-4 h-4 text-amber-600" /> Puntos GIS & Mapas</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            <Link href="/photos" className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-[#10352b] hover:bg-gray-50 transition-all font-medium">
              <span className="flex items-center gap-2.5"><Camera className="w-4 h-4 text-rose-600" /> Fotos & Galería</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
