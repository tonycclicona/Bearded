'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'list';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string | number }[];
  step?: string;
  help?: string;
  prefix?: string;
  rows?: number;
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
      if (initialData && initialData[field.name] !== undefined) {
        if (field.type === 'list') {
          const val = initialData[field.name];
          data[field.name] = Array.isArray(val) ? val.join('\n') : (val || '');
        } else {
          data[field.name] = initialData[field.name];
        }
      } else {
        if (field.type === 'checkbox') data[field.name] = true;
        else if (field.type === 'number') data[field.name] = 0;
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
        const val = formData[field.name];
        if (field.type === 'number') {
          payload[field.name] = parseFloat(val) || 0;
        } else if (field.type === 'checkbox') {
          payload[field.name] = Boolean(val);
        } else if (field.type === 'list') {
          payload[field.name] = typeof val === 'string'
            ? val.split('\n').map((s) => s.trim()).filter(Boolean)
            : (Array.isArray(val) ? val : []);
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
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field) => {
              const value = formData[field.name];

              if (field.type === 'checkbox') {
                return (
                  <label key={field.name} className="flex items-center gap-2 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => handleChange(field.name, e.target.checked)}
                      className="rounded border-gray-300 text-[#10352b] focus:ring-[#10352b] w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-gray-800 text-xs">{field.label}</span>
                      {field.help && <p className="text-[10px] text-gray-400">{field.help}</p>}
                    </div>
                  </label>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.name} className="space-y-1">
                    <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                      {field.label} {field.required && '*'}
                    </label>
                    <textarea
                      rows={field.rows || 3}
                      required={field.required}
                      value={value || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs resize-none"
                    />
                    {field.help && <p className="text-[10px] text-gray-400">{field.help}</p>}
                  </div>
                );
              }

              if (field.type === 'list') {
                return (
                  <div key={field.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                        {field.label} {field.required && '*'}
                      </label>
                      <span className="text-[10px] text-gray-400">Un ítem por línea</span>
                    </div>
                    <textarea
                      rows={field.rows || 4}
                      required={field.required}
                      value={value || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder || 'Elemento 1\nElemento 2'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs resize-none"
                    />
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.name} className="space-y-1">
                    <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                      {field.label} {field.required && '*'}
                    </label>
                    <select
                      value={value || ''}
                      required={field.required}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs"
                    >
                      <option value="">Selecciona una opción...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={field.name} className="space-y-1">
                  <label className="font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                    {field.label} {field.required && '*'}
                  </label>
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">
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
                      className={`w-full bg-gray-50 border border-gray-200 rounded-lg py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all text-xs ${
                        field.prefix ? 'pl-8 pr-3' : 'px-3'
                      }`}
                    />
                  </div>
                  {field.help && <p className="text-[10px] text-gray-400">{field.help}</p>}
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
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
