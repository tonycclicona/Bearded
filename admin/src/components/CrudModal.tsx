'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import MediaUpload from '@/components/MediaUpload';
import GisMap from '@/components/GisMap';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'list' | 'image' | 'gallery' | 'audio' | 'gis_picker';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string | number }[];
  step?: string;
  help?: string;
  prefix?: string;
  rows?: number;
  colSpan?: 1 | 2;
  latField?: string;
  lngField?: string;
}

interface CrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: FormField[];
  initialData?: Record<string, any> | null;
  onSave: (formData: Record<string, any>) => Promise<void>;
}

export default function CrudModal({
  isOpen,
  onClose,
  title,
  subtitle,
  fields,
  initialData,
  onSave
}: CrudModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const data: Record<string, any> = {};
    fields.forEach((field) => {
      if (field.type === 'gis_picker') return;

      if (initialData && initialData[field.name] !== undefined && initialData[field.name] !== null) {
        if (field.type === 'list') {
          const val = initialData[field.name];
          data[field.name] = Array.isArray(val) ? val.join('\n') : String(val);
        } else if (field.type === 'gallery') {
          const val = initialData[field.name];
          data[field.name] = Array.isArray(val)
            ? val
            : (typeof val === 'string' && val ? val.split('\n').map((s) => s.trim()).filter(Boolean) : []);
        } else {
          data[field.name] = initialData[field.name];
        }
      } else {
        if (field.type === 'checkbox') data[field.name] = false;
        else if (field.type === 'number') data[field.name] = 0;
        else if (field.type === 'gallery') data[field.name] = [];
        else data[field.name] = '';
      }
    });

    setFormData(data);
    setError(null);
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, any> = {};

      fields.forEach((field) => {
        if (field.type === 'gis_picker') return;

        const val = formData[field.name];
        if (field.type === 'number') {
          payload[field.name] = val !== '' && !isNaN(Number(val)) ? parseFloat(val) : 0;
        } else if (field.type === 'checkbox') {
          payload[field.name] = Boolean(val);
        } else if (field.type === 'list') {
          payload[field.name] = typeof val === 'string'
            ? val.split('\n').map((s) => s.trim()).filter(Boolean)
            : (Array.isArray(val) ? val : []);
        } else if (field.type === 'gallery') {
          payload[field.name] = Array.isArray(val)
            ? val
            : (typeof val === 'string' && val ? val.split('\n').map((s) => s.trim()).filter(Boolean) : []);
        } else {
          payload[field.name] = val !== undefined ? String(val).trim() : '';
        }
      });

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const value = formData[field.name];
              const isWide =
                field.colSpan === 2 ||
                field.type === 'image' ||
                field.type === 'gallery' ||
                field.type === 'audio' ||
                field.type === 'textarea' ||
                field.type === 'list' ||
                field.type === 'gis_picker';

              // GIS Map Picker interactivo
              if (field.type === 'gis_picker') {
                const latKey = field.latField || 'latitud';
                const lngKey = field.lngField || 'longitud';
                const latVal = Number(formData[latKey]) || -13.315;
                const lngVal = Number(formData[lngKey]) || -72.155;

                return (
                  <div key={field.name} className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                        {field.label}
                      </label>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        OpenStreetMap & Satélite
                      </span>
                    </div>
                    <GisMap
                      mode="picker"
                      lat={latVal}
                      lng={lngVal}
                      height="300px"
                      onChange={(newLat, newLng) => {
                        handleChange(latKey, newLat);
                        handleChange(lngKey, newLng);
                      }}
                    />
                    {field.help && <p className="text-[11px] text-gray-400">{field.help}</p>}
                  </div>
                );
              }

              // Media: Image, Gallery, Audio
              if (field.type === 'image' || field.type === 'gallery' || field.type === 'audio') {
                return (
                  <div key={field.name} className={isWide ? 'md:col-span-2' : ''}>
                    <MediaUpload
                      label={field.label}
                      mode={field.type}
                      value={value}
                      onChange={(val) => handleChange(field.name, val)}
                      help={field.help}
                      required={field.required}
                    />
                  </div>
                );
              }

              // Checkbox / Toggle
              if (field.type === 'checkbox') {
                return (
                  <div key={field.name} className={isWide ? 'md:col-span-2' : ''}>
                    <label className="flex items-center gap-3 p-3 bg-gray-50/80 border border-gray-200 rounded-xl cursor-pointer select-none hover:bg-gray-100/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => handleChange(field.name, e.target.checked)}
                        className="rounded border-gray-300 text-[#10352b] focus:ring-[#10352b] w-4 h-4"
                      />
                      <div>
                        <span className="font-semibold text-gray-800 text-xs">{field.label}</span>
                        {field.help && <p className="text-[11px] text-gray-400 mt-0.5">{field.help}</p>}
                      </div>
                    </label>
                  </div>
                );
              }

              // Textarea
              if (field.type === 'textarea') {
                return (
                  <div key={field.name} className={`space-y-1.5 ${isWide ? 'md:col-span-2' : ''}`}>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      rows={field.rows || 3}
                      required={field.required}
                      value={value || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                    />
                    {field.help && <p className="text-[11px] text-gray-400">{field.help}</p>}
                  </div>
                );
              }

              // Multiline list
              if (field.type === 'list') {
                return (
                  <div key={field.name} className={`space-y-1.5 ${isWide ? 'md:col-span-2' : ''}`}>
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <span className="text-[10px] text-gray-400">Un ítem por línea</span>
                    </div>
                    <textarea
                      rows={field.rows || 4}
                      required={field.required}
                      value={value || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder || 'Elemento 1\nElemento 2'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                    />
                    {field.help && <p className="text-[11px] text-gray-400">{field.help}</p>}
                  </div>
                );
              }

              // Select
              if (field.type === 'select') {
                return (
                  <div key={field.name} className={`space-y-1.5 ${isWide ? 'md:col-span-2' : ''}`}>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={value || ''}
                      required={field.required}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                    >
                      <option value="">Selecciona una opción...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {field.help && <p className="text-[11px] text-gray-400">{field.help}</p>}
                  </div>
                );
              }

              // Standard Input (text, number)
              return (
                <div key={field.name} className={`space-y-1.5 ${isWide ? 'md:col-span-2' : ''}`}>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        {field.prefix}
                      </span>
                    )}
                    <input
                      type={field.type}
                      step={field.step}
                      required={field.required}
                      value={value !== undefined ? value : ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs ${
                        field.prefix ? 'pl-9 pr-3.5' : 'px-3.5'
                      }`}
                    />
                  </div>
                  {field.help && <p className="text-[11px] text-gray-400">{field.help}</p>}
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#10352b] hover:bg-[#0a231c] text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#c29b38]" />
                  <span>{initialData ? 'Guardar Cambios' : 'Crear Registro'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
