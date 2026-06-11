import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerStatus, customerSetPassword, customerLogin } from '../../services/customer';
import { useCustomerStore } from '../../store/customerAuthStore';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-900 to-black p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm">
        <div className="flex justify-center mb-2">
          <img src="/color.png" alt="4EVRcustoms" className="h-11 w-auto" />
        </div>
        <p className="text-center text-gray-500 text-sm mb-6">Portal de clientes</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        {step === 'phone' && (
          <form onSubmit={checkPhone} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu número de teléfono</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium">+52</span>
                <input
                  type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(onlyDigits(e.target.value))}
                  placeholder="6641234567" autoFocus
                  className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
            <Btn loading={loading}>Crear y entrar</Btn>
            <LinkBtn onClick={back}>Cambiar número</LinkBtn>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={login} className="space-y-4">
            <p className="text-sm text-gray-600">{firstName ? `¡Hola ${firstName}! ` : ''}Ingresa tu contraseña.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
            <Btn loading={loading}>Iniciar sesión</Btn>
            <LinkBtn onClick={back}>Cambiar número</LinkBtn>
          </form>
        )}
      </div>
    </div>
  );
}

const Btn = ({ loading, children }) => (
  <button type="submit" disabled={loading}
    className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
    {loading ? 'Un momento…' : children}
  </button>
);

const LinkBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="w-full text-center text-xs text-gray-500 hover:text-gray-700">
    {children}
  </button>
);
