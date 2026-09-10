'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutateApi, setCookie } from '@/lib/api';
import { Lock, User, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await mutateApi('/auth/login', {
        method: 'POST',
        body: { username, password },
      });

      if (res.success && res.token) {
        setCookie('session_token', res.token, 7);
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        } else {
          router.push('/');
        }
      } else if (res.status === 'starting' || res.message?.includes('iniciando')) {
        throw new Error(res.message || 'El servidor API está iniciando en Hostinger. Espera 10-20 segundos y vuelve a intentar.');
      } else {
        throw new Error(res.error || res.message || 'Credenciales inválidas');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a231c] relative px-4 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#10352b] rounded-full filter blur-[120px] pointer-events-none opacity-60"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-[#c29b38]/10 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl space-y-6 relative border border-gray-100">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#10352b] flex items-center justify-center font-bold text-[#c29b38] text-2xl mx-auto shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bearded Mountaineer Lodge</h1>
          <p className="text-gray-500 text-xs">Acceso al Panel de Administración</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Usuario o Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all"
                placeholder="admin"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#10352b] focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#10352b] hover:bg-[#0a231c] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Ingresar al Sistema</span>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-gray-400 border-t border-gray-100">
          Bearded Mountaineer Lodge — Cusco, Perú
        </div>
      </div>
    </div>
  );
}
