'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  Music,
  Loader2,
  Link as LinkIcon,
  Plus,
  FileText,
  Video,
  ExternalLink
} from 'lucide-react';
import { uploadApi, resolveMediaUrl } from '@/lib/api';

interface MediaUploadProps {
  label: string;
  mode?: 'image' | 'gallery' | 'audio' | 'pdf' | 'video';
  value: any;
  onChange: (value: any) => void;
  help?: string;
  required?: boolean;
}

export default function MediaUpload({
  label,
  mode = 'image',
  value,
  onChange,
  help,
  required = false
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
      }

      const res = await uploadApi('/upload', formData);
      const data = res?.data !== undefined ? res.data : res;

      if (mode === 'gallery') {
        const newUrls: string[] = data?.urls || (data?.url ? [data.url] : []);
        const currentUrls: string[] = Array.isArray(value)
          ? value
          : (typeof value === 'string' && value ? value.split('\n').map((s: string) => s.trim()).filter(Boolean) : []);
        onChange([...currentUrls, ...newUrls]);
      } else {
        const singleUrl = data?.url || (Array.isArray(data?.urls) ? data.urls[0] : '');
        onChange(singleUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeGalleryItem = (index: number) => {
    if (Array.isArray(value)) {
      onChange(value.filter((_, i) => i !== index));
    }
  };

  const isAudio = mode === 'audio';
  const isGallery = mode === 'gallery';
  const isPdf = mode === 'pdf';
  const isVideo = mode === 'video';

  let acceptTypes = 'image/*';
  if (isAudio) acceptTypes = 'audio/*';
  if (isPdf) acceptTypes = '.pdf,application/pdf';
  if (isVideo) acceptTypes = 'video/mp4,video/webm,video/ogg,image/gif,image/webp';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-[#10352b] hover:underline flex items-center gap-1 font-medium cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? 'Ocultar URL manual' : 'Ingresar URL manual'}
        </button>
      </div>

      {showUrlInput && (
        <div className="pt-1">
          {isGallery ? (
            <textarea
              rows={3}
              value={Array.isArray(value) ? value.join('\n') : (value || '')}
              onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
              placeholder="https://ejemplo.com/foto1.webp&#10;https://ejemplo.com/foto2.webp"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 font-mono focus:bg-white focus:ring-2 focus:ring-[#10352b] focus:outline-none transition-all"
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={
                isPdf
                  ? 'https://.../catalogo.pdf o /uploads/catalogo.pdf'
                  : isVideo
                  ? 'https://.../video.webm o /uploads/video.webp'
                  : isAudio
                  ? 'https://.../canto.mp3'
                  : 'https://.../foto.webp'
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-mono focus:bg-white focus:ring-2 focus:ring-[#10352b] focus:outline-none transition-all"
            />
          )}
        </div>
      )}

      {/* 1. Galería Múltiple */}
      {isGallery ? (
        <div className="space-y-3">
          {Array.isArray(value) && value.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100 max-h-56 overflow-y-auto">
              {value.map((url: string, index: number) => (
                <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                  <img
                    src={resolveMediaUrl(url)}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = '0.3';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryItem(index)}
                    className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity shadow cursor-pointer"
                    title="Eliminar de la galería"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Botón Drag & Drop de Galería */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
              dragActive
                ? 'border-[#10352b] bg-[#10352b]/5'
                : 'border-gray-300 hover:border-[#10352b] hover:bg-gray-50/80 bg-white'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={acceptTypes}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#10352b]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Subiendo y optimizando a WebP...</span>
              </div>
            ) : (
              <>
                <Plus className="w-5 h-5 text-gray-400" />
                <span className="text-xs font-medium text-gray-700">
                  {Array.isArray(value) && value.length > 0 ? '+ Agregar más fotos a la galería' : 'Subir fotos para la galería'}
                </span>
                <span className="text-[11px] text-gray-400">Arrastra archivos aquí o haz clic (se optimizarán automáticamente a WebP)</span>
              </>
            )}
          </div>
        </div>
      ) : isPdf ? (
        /* 2. Subida de Archivo PDF */
        <div className="space-y-2">
          {value ? (
            <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-gray-900 truncate block">Documento PDF Cargado</span>
                  <a
                    href={resolveMediaUrl(value)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-red-700 hover:underline flex items-center gap-1 font-mono truncate"
                  >
                    <span>{typeof value === 'string' ? value.split('/').pop() : 'ver documento'}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 shadow-2xs cursor-pointer transition-colors"
                >
                  Reemplazar PDF
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-100/50 transition-colors cursor-pointer"
                  title="Eliminar PDF"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                dragActive
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-gray-300 hover:border-red-500 hover:bg-gray-50/80 bg-white'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={acceptTypes}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              {uploading ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-700 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo y validando PDF...</span>
                </div>
              ) : (
                <>
                  <FileText className="w-7 h-7 text-red-500" />
                  <span className="text-xs font-semibold text-gray-800">
                    Haz clic o arrastra el archivo PDF del Catálogo aquí
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Formato: .pdf (Máx. 30MB) — Este archivo estará disponible para descarga en el frontend
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      ) : isVideo ? (
        /* 3. Subida de Video / Animación WebP */
        <div className="space-y-2">
          {value ? (
            <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-white space-y-2">
              <video
                controls
                src={resolveMediaUrl(value)}
                className="w-full max-h-56 rounded-lg bg-black object-contain"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-300 font-mono truncate max-w-[65%]">
                  {typeof value === 'string' ? value.split('/').pop() : value}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Cambiar Video
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('')}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="Eliminar video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                dragActive
                  ? 'border-[#c29b38] bg-[#c29b38]/5'
                  : 'border-gray-300 hover:border-[#c29b38] hover:bg-gray-50/80 bg-white'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={acceptTypes}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              {uploading ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-[#10352b] py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo y procesando video / WebP animado...</span>
                </div>
              ) : (
                <>
                  <Video className="w-7 h-7 text-[#c29b38]" />
                  <span className="text-xs font-semibold text-gray-800">
                    Haz clic o arrastra el video aquí
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Formatos: MP4, WebM o animaciones WebP/GIF (optimizado para carga web instantánea)
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      ) : isAudio ? (
        /* 4. Reproductor y Subida de Audio */
        <div className="space-y-2">
          {value && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              <Music className="w-6 h-6 text-[#10352b] shrink-0" />
              <div className="flex-1 min-w-0">
                <audio controls src={resolveMediaUrl(value)} className="w-full h-8" />
                <span className="text-[10px] text-gray-400 truncate block mt-1">{value}</span>
              </div>
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Quitar audio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-[#10352b] hover:bg-gray-50/80 rounded-xl p-3 text-center cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <input
              ref={inputRef}
              type="file"
              accept={acceptTypes}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#10352b]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Subiendo audio...</span>
              </div>
            ) : (
              <>
                <Music className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-700">
                  {value ? 'Cambiar archivo de audio (.mp3, .wav, .m4a)' : 'Seleccionar canto de ave o audio (.mp3, .wav)'}
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        /* 5. Imagen Individual */
        <div className="space-y-2">
          {value ? (
            <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={resolveMediaUrl(value)}
                alt="Vista previa"
                className="w-full h-44 object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.opacity = '0.3';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="bg-white/90 hover:bg-white text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition-all cursor-pointer"
                >
                  Cambiar foto
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow transition-all cursor-pointer"
                  title="Eliminar foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                dragActive
                  ? 'border-[#10352b] bg-[#10352b]/5'
                  : 'border-gray-300 hover:border-[#10352b] hover:bg-gray-50/80 bg-white'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={acceptTypes}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              {uploading ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-[#10352b] py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo y optimizando a WebP...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-800">
                    Haz clic o arrastra la foto de portada aquí
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Formatos: JPG, PNG, WebP (Se convertirá y optimizará automáticamente a WebP)
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>
      )}

      {help && !error && (
        <p className="text-[11px] text-gray-400">{help}</p>
      )}
    </div>
  );
}
