import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function SetupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: '', password: '', confirmPassword: '',
    name: '', phone: '',
    address: '', city: '', state: '', zipCode: '',
    timezone: 'America/Mexico_City',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setErr('Las contraseñas no coinciden');
      return;
    }
    setLoading(true); setErr('');
    try {
      const res = await api.post('/workshops', form);
      setUser(res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setErr(e.message || 'Error al crear el taller');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, required, children }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );

  const Input = ({ ...props }) => (
    <input
      {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
    />
  );

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-brand-100 p-2 rounded-lg">
            <Wrench className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configura tu taller</h1>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-11">
          Completa los datos para comenzar. Puedes editar todo más tarde.
        </p>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm">{err}</div>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* Admin account */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Tu cuenta de administrador
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" required>
                <Input
                  type="text" value={form.firstName} onChange={set('firstName')}
                  placeholder="Tu nombre" required
                />
              </Field>
              <Field label="Apellido" required>
                <Input
                  type="text" value={form.lastName} onChange={set('lastName')}
                  placeholder="Tu apellido" required
                />
              </Field>
              <Field label="Correo (para iniciar sesión)" required>
                <Input
                  type="email" value={form.email} onChange={set('email')}
                  placeholder="admin@taller.mx" required
                />
              </Field>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
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
              <Field label="Confirmar contraseña" required>
                <Input
                  type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                  placeholder="Repite la contraseña" required
                />
              </Field>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Workshop info */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Datos del taller
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre del taller" required>
                <Input
                  type="text" value={form.name} onChange={set('name')}
                  placeholder="4EVRcustoms" required
                />
              </Field>
              <Field label="Teléfono del taller" required>
                <Input
                  type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="+526641234567" required
                />
              </Field>
              <div className="col-span-2">
                <Field label="Dirección">
                  <Input
                    type="text" value={form.address} onChange={set('address')}
                    placeholder="Blvd. Insurgentes 1234"
                  />
                </Field>
              </div>
              <Field label="Ciudad">
                <Input type="text" value={form.city} onChange={set('city')} placeholder="Tijuana" />
              </Field>
              <Field label="Estado">
                <Input type="text" value={form.state} onChange={set('state')} placeholder="Baja California" />
              </Field>
              <Field label="Código postal">
                <Input type="text" value={form.zipCode} onChange={set('zipCode')} placeholder="22010" />
              </Field>
              <Field label="Zona horaria">
                <select
                  value={form.timezone}
                  onChange={set('timezone')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                >
                  <option value="America/Mexico_City">Ciudad de México (CST)</option>
                  <option value="America/Tijuana">Tijuana (PST)</option>
                  <option value="America/Chihuahua">Chihuahua (MST)</option>
                  <option value="America/Cancun">Cancún (EST)</option>
                </select>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg py-3 font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando taller...' : 'Crear taller y comenzar'}
          </button>
        </form>
      </div>
    </div>
  );
}
