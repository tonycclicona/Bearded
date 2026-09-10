'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, MapPin, Navigation, Crosshair, RefreshCw } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api';

export interface GisPoint {
  id?: string;
  nombre: string;
  latitud: number;
  longitud: number;
  categoria?: string;
  altitudMsnm?: number;
  imageUrl?: string;
  departamento?: string;
  descripcion?: string;
}

interface GisMapProps {
  mode?: 'picker' | 'overview';
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: string;
  onChange?: (lat: number, lng: number) => void;
  points?: GisPoint[];
  onSelectPoint?: (point: GisPoint) => void;
}

const CATEGORY_STYLES: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  HOTSPOT_COMEDERO: { bg: '#10b981', border: '#047857', icon: '🍃', label: 'Bebedero / Comedero' },
  OBSERVATORIO_SILVESTRE: { bg: '#0284c7', border: '#0369a1', icon: '🔭', label: 'Observatorio' },
  ESPECIE_ENDEMICA: { bg: '#8b5cf6', border: '#6d28d9', icon: '👑', label: 'Especie Endémica' },
  CAMPAMENTO_REFUGIO: { bg: '#f59e0b', border: '#b45309', icon: '⛺', label: 'Refugio / Campamento' },
  LOGISTICA_PUNTO_ENCUENTRO: { bg: '#f43f5e', border: '#be123c', icon: '📍', label: 'Punto de Encuentro' },
};

const PRESETS = [
  { name: 'Bearded Lodge (Yanahuara)', lat: -13.315, lng: -72.155, zoom: 15 },
  { name: 'Cusco Centro', lat: -13.5319, lng: -71.9675, zoom: 13 },
  { name: 'Ollantaytambo', lat: -13.2583, lng: -72.2633, zoom: 14 },
  { name: 'Machu Picchu Pueblo', lat: -13.1631, lng: -72.545, zoom: 14 },
  { name: 'Parque Nacional del Manu', lat: -12.25, lng: -71.75, zoom: 10 },
];

export default function GisMap({
  mode = 'picker',
  lat = -13.315,
  lng = -72.155,
  zoom = 14,
  height = '360px',
  onChange,
  points = [],
  onSelectPoint
}: GisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [currentLayer, setCurrentLayer] = useState<'osm' | 'satellite'>('osm');
  const [currentCoords, setCurrentCoords] = useState<[number, number]>([lat, lng]);
  const [locating, setLocating] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  // Sincronizar coordenadas si cambian desde fuera (ej. inputs numéricos)
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      const validLat = typeof lat === 'number' && !isNaN(lat) ? lat : -13.315;
      const validLng = typeof lng === 'number' && !isNaN(lng) ? lng : -72.155;
      setCurrentCoords([validLat, validLng]);

      if (markerRef.current && mode === 'picker') {
        const cur = markerRef.current.getLatLng();
        if (Math.abs(cur.lat - validLat) > 0.000001 || Math.abs(cur.lng - validLng) > 0.000001) {
          markerRef.current.setLatLng([validLat, validLng]);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([validLat, validLng], { animate: true });
          }
        }
      }
    }
  }, [lat, lng, mode]);

  // Inicializar Leaflet
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      // Import dinámico seguro en cliente
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted || !mapContainerRef.current) return;

      // Destruir instancia previa para evitar fugas
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = typeof lat === 'number' && !isNaN(lat) ? lat : -13.315;
      const initialLng = typeof lng === 'number' && !isNaN(lng) ? lng : -72.155;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: zoom,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomleft', prefix: 'Leaflet' }).addTo(map);

      mapInstanceRef.current = map;

      // Capas
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      });

      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: 'Esri World Imagery'
        }
      );

      tileLayerRef.current = { osm: osmLayer, satellite: satelliteLayer };
      (currentLayer === 'osm' ? osmLayer : satelliteLayer).addTo(map);

      // Modo Picker (arrastrable)
      if (mode === 'picker') {
        const pickerIcon = L.divIcon({
          className: 'custom-picker-pin',
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: #10352b;
              border: 3px solid #c29b38;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 14px rgba(0,0,0,0.45);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: grab;
              transition: transform 0.15s ease;
            ">
              <span style="transform: rotate(45deg); font-size: 15px;">📍</span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        });

        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: pickerIcon
        }).addTo(map);

        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          setCurrentCoords([newLat, newLng]);
          if (onChange) onChange(newLat, newLng);
        });

        map.on('click', (e: any) => {
          const newLat = parseFloat(e.latlng.lat.toFixed(6));
          const newLng = parseFloat(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          setCurrentCoords([newLat, newLng]);
          if (onChange) onChange(newLat, newLng);
        });
      }

      setLeafletReady(true);
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mode]);

  // Actualizar marcadores en Overview cuando cambian points o Leaflet está listo
  useEffect(() => {
    if (mode !== 'overview' || !mapInstanceRef.current || !leafletReady) return;

    async function updateOverviewPoints() {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      if (!map) return;

      // Limpiar capa previa
      if (markersGroupRef.current) {
        map.removeLayer(markersGroupRef.current);
      }

      const group = L.featureGroup();
      markersGroupRef.current = group;

      points.forEach((p) => {
        if (p.latitud && p.longitud) {
          const cat = p.categoria || 'HOTSPOT_COMEDERO';
          const catStyle = CATEGORY_STYLES[cat] || CATEGORY_STYLES.HOTSPOT_COMEDERO;

          const icon = L.divIcon({
            className: 'custom-gis-marker',
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background: ${catStyle.bg};
                border: 2.5px solid #ffffff;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 3px 10px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.15s ease;
              ">
                <span style="transform: rotate(45deg); font-size: 13px;">${catStyle.icon}</span>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });

          const m = L.marker([p.latitud, p.longitud], { icon });

          const imgHtml = p.imageUrl
            ? `<img src="${resolveMediaUrl(p.imageUrl)}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`
            : '';

          const popupContent = `
            <div style="font-family: inherit; font-size: 12px; max-width: 230px; padding: 2px;">
              ${imgHtml}
              <div style="font-weight: 700; color: #0f172a; font-size: 13px; line-height: 1.2;">${p.nombre}</div>
              <div style="color: ${catStyle.border}; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 3px;">
                ${catStyle.label}
              </div>
              <div style="color: #64748b; font-size: 11px; margin-top: 5px; line-height: 1.3;">
                📍 ${p.latitud.toFixed(5)}, ${p.longitud.toFixed(5)}
                ${p.altitudMsnm ? `<br/>⛰️ Altitud: <strong>${p.altitudMsnm} msnm</strong>` : ''}
                ${p.departamento ? `<br/>🗺️ ${p.departamento}` : ''}
              </div>
              <button 
                id="btn-edit-${p.id || p.nombre.replace(/\s+/g, '-')}"
                style="margin-top: 8px; width: 100%; background: #10352b; color: white; border: none; border-radius: 6px; padding: 5px 8px; font-size: 11px; font-weight: 600; cursor: pointer;"
              >
                ✏️ Seleccionar / Editar
              </button>
            </div>
          `;

          m.bindPopup(popupContent);

          m.on('popupopen', () => {
            const btn = document.getElementById(`btn-edit-${p.id || p.nombre.replace(/\s+/g, '-')}`);
            if (btn && onSelectPoint) {
              btn.onclick = () => onSelectPoint(p);
            }
          });

          group.addLayer(m);
        }
      });

      group.addTo(map);

      // Auto-fit bounds si hay marcadores
      if (group.getLayers().length > 0) {
        try {
          map.fitBounds(group.getBounds().pad(0.12));
        } catch (_) {}
      }
    }

    updateOverviewPoints();
  }, [mode, points, leafletReady, onSelectPoint]);

  // Cambiar entre OpenStreetMap y Satélite
  const handleLayerSwitch = (layer: 'osm' | 'satellite') => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const map = mapInstanceRef.current;
    if (layer === 'satellite') {
      map.removeLayer(tileLayerRef.current.osm);
      tileLayerRef.current.satellite.addTo(map);
    } else {
      map.removeLayer(tileLayerRef.current.satellite);
      tileLayerRef.current.osm.addTo(map);
    }
    setCurrentLayer(layer);
  };

  // Saltar a preset geográfico
  const jumpToPreset = (preset: typeof PRESETS[0]) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([preset.lat, preset.lng], preset.zoom, { duration: 1 });
    if (mode === 'picker' && markerRef.current) {
      markerRef.current.setLatLng([preset.lat, preset.lng]);
      setCurrentCoords([preset.lat, preset.lng]);
      if (onChange) onChange(preset.lat, preset.lng);
    }
  };

  // Capturar GPS del navegador
  const handleGetLiveLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        setCurrentCoords([newLat, newLng]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 16, { duration: 1 });
        }
        if (markerRef.current && mode === 'picker') {
          markerRef.current.setLatLng([newLat, newLng]);
        }
        if (onChange) onChange(newLat, newLng);
      },
      (err) => {
        setLocating(false);
        alert(`No se pudo obtener la ubicación: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 flex flex-col">
      {/* Contenedor Leaflet */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10" />

      {/* Selector de capa OpenStreetMap vs Satélite */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-gray-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleLayerSwitch('osm')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            currentLayer === 'osm'
              ? 'bg-[#10352b] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          OpenStreetMap
        </button>
        <button
          type="button"
          onClick={() => handleLayerSwitch('satellite')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            currentLayer === 'satellite'
              ? 'bg-[#10352b] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Satélite
        </button>
      </div>

      {/* Controles de navegación y presets */}
      {mode === 'picker' && (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1 max-w-[70%]">
          <button
            type="button"
            onClick={handleGetLiveLocation}
            disabled={locating}
            className="bg-[#10352b] hover:bg-[#0a231c] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md border border-emerald-900 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Usar mi ubicación GPS actual"
          >
            <Crosshair className={`w-3 h-3 text-[#c29b38] ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Obteniendo GPS...' : 'Mi Ubicación'}</span>
          </button>

          {PRESETS.slice(0, 3).map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => jumpToPreset(preset)}
              className="bg-white/95 hover:bg-white text-gray-800 text-[10px] font-bold px-2 py-1 rounded-lg shadow-xs border border-gray-200 backdrop-blur-xs transition-all flex items-center gap-1"
            >
              <Navigation className="w-2.5 h-2.5 text-[#10352b]" />
              {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Barra de coordenadas en tiempo real */}
      {mode === 'picker' && (
        <div className="bg-white/95 backdrop-blur-xs border-t border-gray-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-20 text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-gray-800">Coordenadas del punto:</span>
            <span className="font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-[#10352b] font-bold text-[11px]">
              {currentCoords[0].toFixed(6)}, {currentCoords[1].toFixed(6)}
            </span>
          </div>
          <span className="text-[11px] text-gray-500">
            💡 <strong>Arrastra el marcador 📍</strong> o haz <strong>clic en el mapa</strong> para mover el punto
          </span>
        </div>
      )}
    </div>
  );
}
