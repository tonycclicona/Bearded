'use client';

import { useState } from 'react';
import ResourceTable, { Column } from '@/components/ResourceTable';
import { mutateApi } from '@/lib/api';
import { X, Save, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface HummingbirdPassItem {
  id?: string;
  title: string;
  price: number;
  priceUSD?: number;
  showPEN?: boolean;
  showUSD?: boolean;
  description: string;
  features: string[] | string;
  featured?: boolean;
  sortOrder?: number;
  active?: boolean;
}

const DEFAULT_FORM: HummingbirdPassItem = {
  title: '',
  price: 25,
  priceUSD: 8,
  showPEN: true,
  showUSD: true,
  description: '',
  features: '',
  featured: false,
  sortOrder: 1,
  active: true
};

export default function PassesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HummingbirdPassItem | null>(null);
  const [formData, setFormData] = useState<HummingbirdPassItem>(DEFAULT_FORM);
  const [featuresText, setFeaturesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: Column[] = [
    {
      header: 'Nombre / Pase',
      accessor: (item) => (
        <div>
          <div className="font-semibold text-gray-900">{item.title || item.name || 'Sin título'}</div>
          {item.description && (
            <div className="text-[11px] text-gray-400 line-clamp-1 max-w-xs">{item.description}</div>
          )}
        </div>
      )
    },
    {
      header: 'Categoría',
      accessor: (item) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${item.featured ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-gray-100 text-gray-700'}`}>
          {item.featured ? <Sparkles className="w-3 h-3 text-amber-600" /> : null}
          {item.featured ? 'Destacado' : 'Estándar'}
        </span>
      )
    },
    {
      header: 'Precio (PEN)',
      accessor: (item) => `S/ ${Number(item.price || item.pricePEN || 0).toFixed(2)}`,
      className: 'font-semibold text-gray-900'
    },
    {
      header: 'Precio (USD)',
      accessor: (item) => `$${Number(item.priceUSD || item.priceUsd || 0).toFixed(2)}`,
      className: 'font-bold text-[#10352b]'
    },
    {
      header: 'Estado',
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          {item.active !== false ? 'ACTIVO' : 'INACTIVO'}
        </span>
      )
    }
  ];

  const handleOpenNew = () => {
    setEditingItem(null);
    setFormData(DEFAULT_FORM);
    setFeaturesText('Acceso a observatorios y bebederos\nGuía de campo digital\nCafé e infusión local');
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    const feats = Array.isArray(item.features)
      ? item.features.join('\n')
      : (typeof item.features === 'string' ? item.features : '');

    setFormData({
      id: item.id,
      title: item.title || item.name || '',
      price: Number(item.price || item.pricePEN || 0),
      priceUSD: Number(item.priceUSD || item.priceUsd || 0),
      showPEN: item.showPEN !== false,
      showUSD: item.showUSD !== false,
      description: item.description || '',
      features: item.features || [],
      featured: Boolean(item.featured),
      sortOrder: Number(item.sortOrder || 0),
      active: item.active !== false
    });
    setFeaturesText(feats);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const featuresArray = featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        price: Number(formData.price),
        priceUSD: Number(formData.priceUSD || 0),
        showPEN: formData.showPEN,
        showUSD: formData.showUSD,
        description: formData.description.trim(),
        features: featuresArray,
        featured: formData.featured,
        sortOrder: Number(formData.sortOrder || 0),
        active: formData.active
      };

      if (!payload.title) {
        throw new Error('El nombre o título del pase es obligatorio.');
      }

      if (editingItem?.id) {
        await mutateApi(`/passes/${editingItem.id}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        await mutateApi('/passes', {
          method: 'POST',
          body: payload
        });
      }

      setModalOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el pase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ResourceTable
        title="Pases de Observación de Colibríes"
        description="Gestión de pases de acceso al jardín sagrado, tarifas y beneficios para visitantes."
        endpoint="/passes"
        columns={columns}
        onNew={handleOpenNew}
        onEdit={handleOpenEdit}
        refreshKey={refreshKey}
      />

      {/* Modal interactivo de creación / edición */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Encabezado del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingItem ? 'Editar Pase de Observación' : 'Crear Nuevo Pase'}
                </h2>
                <p className="text-xs text-gray-500">
                  {editingItem ? 'Modifica los valores del pase existente' : 'Ingresa las tarifas y beneficios del nuevo pase'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del formulario */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                  Título del Pase *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej. Pase Diario - Jardín Sagrado"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                    Precio en Soles (PEN) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">S/</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                    Precio en Dólares (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={formData.priceUSD}
                      onChange={(e) => setFormData({ ...formData, priceUSD: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                  Descripción breve
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el acceso, horarios o recomendaciones para el visitante..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs resize-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                    Características y Beneficios (un ítem por línea)
                  </label>
                  <span className="text-[10px] text-gray-400">Presiona Enter para agregar otro</span>
                </div>
                <textarea
                  rows={4}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Acceso de 6:00 AM a 5:00 PM&#10;Uso de miradores y bebederos&#10;Guía de campo digital de aves&#10;Café e infusión local de cortesía"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded border-gray-300 text-[#10352b] focus:ring-[#10352b] w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-gray-800 text-xs">Pase Destacado</span>
                    <p className="text-[10px] text-gray-400">Resalta con insignia en la web pública</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-gray-300 text-[#10352b] focus:ring-[#10352b] w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-gray-800 text-xs">Activo / Visible</span>
                    <p className="text-[10px] text-gray-400">Disponible para compra y reserva</p>
                  </div>
                </label>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#10352b] hover:bg-[#0a231c] text-white px-5 py-2 rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-[#c29b38]" />
                      <span>{editingItem ? 'Guardar Cambios' : 'Crear Pase'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
