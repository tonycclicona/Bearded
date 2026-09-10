'use client';

import { useState, useEffect } from 'react';
import { fetcher, mutateApi } from '@/lib/api';
import { Plus, Trash2, Edit2, Search, AlertCircle } from 'lucide-react';

export interface Column<T = any> {
  header: string;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface ResourceTableProps<T = any> {
  title: string;
  description: string;
  endpoint: string;
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onNew?: () => void;
  idKey?: keyof T;
  refreshKey?: number | string;
  onDataLoaded?: (items: T[]) => void;
}

export default function ResourceTable<T extends Record<string, any>>({
  title,
  description,
  endpoint,
  columns,
  onEdit,
  onNew,
  idKey = 'id' as keyof T,
  refreshKey,
  onDataLoaded
}: ResourceTableProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetcher(endpoint);
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      if (onDataLoaded) onDataLoaded(arr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [endpoint, refreshKey]);

  const handleDelete = async (id: any) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      await mutateApi(`${endpoint}/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item[idKey] !== id));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : typeof err === 'object' && err !== null
          ? (err as any).message || JSON.stringify(err)
          : 'Error al eliminar el registro';
      alert(msg);
    }
  };

  const filtered = items.filter((item) => {
    if (!search) return true;
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-xs mt-1">{description}</p>
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 bg-[#10352b] hover:bg-[#0a231c] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition-all self-start"
          >
            <Plus className="w-4 h-4 text-[#c29b38]" />
            Crear Nuevo
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar registros..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#10352b]"
          />
        </div>
        <div className="text-xs text-gray-400">
          Total: <span className="font-bold text-gray-700">{filtered.length}</span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#10352b] mx-auto mb-3"></div>
              Cargando registros...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No se encontraron registros para mostrar.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-[11px]">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className={`p-3.5 ${col.className || ''}`}>
                      {col.header}
                    </th>
                  ))}
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((item, idx) => (
                  <tr key={item[idKey] || idx} className="hover:bg-gray-50/70 transition-colors">
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`p-3.5 ${col.className || ''}`}>
                        {typeof col.accessor === 'function'
                          ? col.accessor(item)
                          : col.accessor
                          ? (item[col.accessor] as any)
                          : null}
                      </td>
                    ))}
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-[#10352b] hover:bg-gray-100 rounded-md transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item[idKey])}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
