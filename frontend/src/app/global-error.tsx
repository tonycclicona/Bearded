'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-stone-900 text-white p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Ha ocurrido un error inesperado</h2>
          <p className="text-stone-400 mb-6 text-sm">{error.message || 'Error del sistema'}</p>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
