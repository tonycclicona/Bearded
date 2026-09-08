'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PuntoGIS, CategoriaPuntoGIS } from '@/types';

// Map centering controller
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  HOTSPOT_COMEDERO: { bg: '#10b981', border: '#047857', text: '#ffffff', icon: '🍃' },
  OBSERVATORIO_SILVESTRE: { bg: '#0284c7', border: '#0369a1', text: '#ffffff', icon: '🔭' },
  ESPECIE_ENDEMICA: { bg: '#8b5cf6', border: '#6d28d9', text: '#ffffff', icon: '👑' },
  CAMPAMENTO_REFUGIO: { bg: '#f59e0b', border: '#b45309', text: '#ffffff', icon: '⛺' },
  LOGISTICA_PUNTO_ENCUENTRO: { bg: '#f43f5e', border: '#be123c', text: '#ffffff', icon: '📍' },
};

function createCategoryIcon(categoria: string, isSelected: boolean) {
  const style = CATEGORY_COLORS[categoria] || CATEGORY_COLORS.HOTSPOT_COMEDERO;
  const size = isSelected ? 42 : 34;
  const pulse = isSelected ? 'animation: pulse 1.5s infinite;' : '';

  return L.divIcon({
    className: 'custom-gis-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${style.bg};
        border: 3px solid ${isSelected ? '#ffffff' : style.border};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease;
        ${pulse}
      ">
        <span style="
          transform: rotate(45deg);
          font-size: ${isSelected ? '16px' : '13px'};
          user-select: none;
        ">${style.icon}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
}

interface Props {
  puntos: PuntoGIS[];
  selectedPunto: PuntoGIS | null;
  onSelectPunto: (punto: PuntoGIS) => void;
  center: [number, number];
  zoom: number;
}

export default function MapaLeafletCore({
  puntos,
  selectedPunto,
  onSelectPunto,
  center,
  zoom
}: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full rounded-2xl z-0"
      style={{ minHeight: '520px', background: '#1c2420' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <MapController center={center} zoom={zoom} />

      {puntos.map((punto) => {
        const isSelected = selectedPunto?.id === punto.id;
        const icon = createCategoryIcon(punto.categoria, isSelected);

        return (
          <Marker
            key={punto.id}
            position={[punto.latitud, punto.longitud]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectPunto(punto)
            }}
          >
            <Popup className="custom-gis-popup">
              <div className="p-1 max-w-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {punto.categoria.replace('_', ' ')}
                </span>
                <h4 className="font-serif font-bold text-sm text-gray-900 mt-1 mb-0.5">
                  {punto.nombre}
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  {punto.departamento} • <strong className="text-primary">{punto.altitudMsnm} msnm</strong>
                </p>
                <p className="text-[11px] text-gray-700 line-clamp-2 leading-relaxed">
                  {punto.descripcion}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectPunto(punto)}
                  className="mt-2.5 w-full bg-primary-solid hover:bg-accent text-white hover:text-primary text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors"
                >
                  Ver Ficha y Especies →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
