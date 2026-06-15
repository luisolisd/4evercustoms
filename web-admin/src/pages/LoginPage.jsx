import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { APP_VERSION } from '../version';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Posición normalizada del cursor (0..1) para el fondo interactivo
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });

  const handlePointerMove = (e) => {
    setPointer({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/admin/login', { email, password });
      setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  // Desplazamientos sutiles basados en el cursor (efecto parallax)
  const dx = (pointer.x - 0.5);
  const dy = (pointer.y - 0.5);

  return (
    <div
      onMouseMove={handlePointerMove}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-700 via-gray-900 to-black"
    >
      {/* Marca de agua: logo en negro, grande y tenue, donde el logo "se pierde" en el gris */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[140vmax] max-w-none opacity-[0.07] blur-[1px] transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `translate(-50%, -50%) translate(${dx * 50}px, ${dy * 50}px) rotate(-3deg)`,
        }}
      >
        <img src="/negro.png" alt="" className="w-full select-none invert" draggable={false} />
      </div>

      {/* Reflejo / spotlight rojizo que sigue el cursor → fondo interactivo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-150"
        style={{
          background: `radial-gradient(620px circle at ${pointer.x * 100}% ${pointer.y * 100}%, rgba(234,88,12,0.22), transparent 55%)`,
        }}
      />

      {/* Viñeta para profundizar el gris en los bordes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
      />

      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-elevated ring-1 ring-white/10 p-8 w-full max-w-sm animate-scale-in">
        {/* Logo a color contrastado en la parte central superior */}
        <div className="flex items-center justify-center mb-3">
          <img src="/color.png" alt="4EVRcustoms" className="h-12 w-auto select-none" draggable={false} />
        </div>
        <p className="eyebrow text-center mb-8">Panel Administrativo</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@taller.mx"
              required
              autoComplete="email"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-soft transition focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 shadow-soft transition focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gradient text-white rounded-xl py-3 font-semibold shadow-glow hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 transition-all"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-2">¿Eres cliente del taller?</p>
          <button
            type="button"
            onClick={() => navigate('/cliente')}
            className="w-full border border-brand-200 text-brand-700 rounded-xl py-2.5 font-semibold hover:bg-brand-50 hover:border-brand-300 transition-colors"
          >
            Soy cliente
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-4">{APP_VERSION}</p>
      </div>
    </div>
  );
}
