import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Wrench } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="bg-brand-100 p-2 rounded-lg">
            <Wrench className="w-5 h-5 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">4EVRcustoms</h1>
        </div>
        <p className="text-gray-500 text-center mb-8 text-sm">Panel Administrativo</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
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
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Primera vez? Inicia sesión OTP con tu teléfono para configurar el taller.
        </p>
        <OtpSetupLink />
      </div>
    </div>
  );
}

function OtpSetupLink() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/admin/setup-otp', { phone });
      setStep('code');
    } catch (err) {
      setError(err.message || 'Error al enviar el código');
    } finally { setLoading(false); }
  };

  const verify = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/admin/verify-setup-otp', { phone, code });
      setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(err.message || 'Código incorrecto');
    } finally { setLoading(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-xs text-brand-600 hover:text-brand-700 mt-1"
      >
        Configurar taller por primera vez →
      </button>
    );
  }

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-medium text-gray-600 mb-3">Acceso de primera configuración (OTP)</p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {step === 'phone' ? (
        <div className="flex gap-2">
          <input
            type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+526641234567"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={sendOtp} disabled={loading || !phone}
            className="bg-brand-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Código 6 dígitos" maxLength={6}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={verify} disabled={loading || code.length < 6}
            className="bg-brand-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-50"
          >
            Verificar
          </button>
        </div>
      )}
    </div>
  );
}
