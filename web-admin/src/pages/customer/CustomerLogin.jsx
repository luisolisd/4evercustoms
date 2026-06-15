import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerStatus, customerSetPassword, customerLogin } from '../../services/customer';
import { useCustomerStore } from '../../store/customerAuthStore';
import { APP_VERSION } from '../../version';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { setSession } = useCustomerStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'create' | 'login'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 10);

  const finish = (res) => {
    setSession(res.accessToken, res.refreshToken, res.user);
    navigate('/cliente/inicio', { replace: true });
  };

  const checkPhone = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) return setError('Escribe tu número a 10 dígitos');
    setLoading(true); setError('');
    try {
      const s = await customerStatus(phone);
      if (!s.registered) {
        setError('Tu número no está registrado. Pide al taller que te dé de alta.');
        return;
      }
      setFirstName(s.firstName || '');
      setStep(s.hasPassword ? 'login' : 'create');
    } catch (err) {
      setError(err.message || 'No se pudo validar el número');
    } finally { setLoading(false); }
  };

  const create = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    if (password !== confirm) return setError('Las contraseñas no coinciden');
    setLoading(true); setError('');
    try {
      finish(await customerSetPassword(phone, password));
    } catch (err) {
      setError(err.message || 'No se pudo crear la contraseña');
    } finally { setLoading(false); }
  };

  const login = async (e) => {
    e.preventDefault();
    if (!password) return setError('Escribe tu contraseña');
    setLoading(true); setError('');
    try {
      finish(await customerLogin(phone, password));
    } catch (err) {
      setError(err.message || 'Número o contraseña incorrectos');
    } finally { setLoading(false); }
  };

  const back = () => { setStep('phone'); setPassword(''); setConfirm(''); setError(''); };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-5 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh opacity-80" />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-elevated ring-1 ring-white/10 p-7 w-full max-w-sm animate-scale-in">
        <div className="flex justify-center mb-2">
          <img src="/color.png" alt="4EVRcustoms" className="h-11 w-auto" />
        </div>
        <p className="eyebrow text-center mb-6">Portal de clientes</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm animate-fade-in">{error}</div>
        )}

        {step === 'phone' && (
          <form onSubmit={checkPhone} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu número de teléfono</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-600 text-sm font-semibold">+52</span>
                <input
                  type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(onlyDigits(e.target.value))}
                  placeholder="6641234567" autoFocus
                  className="flex-1 border border-gray-200 rounded-r-xl px-3.5 py-2.5 shadow-soft transition focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm"
                />
              </div>
            </div>
            <Btn loading={loading}>Continuar</Btn>
          </form>
        )}

        {step === 'create' && (
          <form onSubmit={create} className="space-y-4">
            <p className="text-sm text-gray-600">{firstName ? `¡Hola ${firstName}! ` : ''}Crea tu contraseña para tu primer acceso.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña (mín. 6)" autoFocus
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-soft transition focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-soft transition focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm" />
            <Btn loading={loading}>Crear y entrar</Btn>
            <LinkBtn onClick={back}>Cambiar número</LinkBtn>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={login} className="space-y-4">
            <p className="text-sm text-gray-600">{firstName ? `¡Hola ${firstName}! ` : ''}Ingresa tu contraseña.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" autoFocus
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-soft transition focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 text-sm" />
            <Btn loading={loading}>Iniciar sesión</Btn>
            <LinkBtn onClick={back}>Cambiar número</LinkBtn>
          </form>
        )}
        <p className="text-center text-[10px] text-gray-400 mt-5">{APP_VERSION}</p>
      </div>
    </div>
  );
}

const Btn = ({ loading, children }) => (
  <button type="submit" disabled={loading}
    className="w-full bg-brand-gradient text-white rounded-xl py-3 font-semibold shadow-glow hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 transition-all">
    {loading ? 'Un momento…' : children}
  </button>
);

const LinkBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="w-full text-center text-xs text-gray-500 hover:text-gray-700">
    {children}
  </button>
);
