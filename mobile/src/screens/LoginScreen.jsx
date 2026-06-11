import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const { setSession } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'create' | 'login'
  const [loading, setLoading] = useState(false);

  const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 10);

  // Paso 1: validar el número contra los clientes registrados por el taller
  const checkPhone = async () => {
    if (phone.length !== 10) return Alert.alert('Número inválido', 'Escribe tu número a 10 dígitos.');
    setLoading(true);
    try {
      const res = await api.post('/auth/customer/status', { phone });
      const { registered, hasPassword, firstName: fn } = res.data;
      if (!registered) {
        Alert.alert('No registrado', 'Tu número no está registrado. Pide al taller que te dé de alta.');
        return;
      }
      setFirstName(fn || '');
      setStep(hasPassword ? 'login' : 'create');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo validar el número');
    } finally { setLoading(false); }
  };

  // Paso 2a: crear contraseña por primera vez
  const createPassword = async () => {
    if (password.length < 6) return Alert.alert('Contraseña corta', 'Debe tener al menos 6 caracteres.');
    if (password !== confirm) return Alert.alert('No coincide', 'Las contraseñas no coinciden.');
    setLoading(true);
    try {
      const res = await api.post('/auth/customer/set-password', { phone, password });
      await setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo crear la contraseña');
    } finally { setLoading(false); }
  };

  // Paso 2b: iniciar sesión
  const login = async () => {
    if (!password) return Alert.alert('Falta contraseña', 'Escribe tu contraseña.');
    setLoading(true);
    try {
      const res = await api.post('/auth/customer/login', { phone, password });
      await setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
    } catch (e) {
      Alert.alert('Error', e.message || 'Número o contraseña incorrectos');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep('phone'); setPassword(''); setConfirm('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>4EVRcustoms</Text>

        {step === 'phone' && (
          <>
            <Text style={styles.subtitle}>Ingresa tu número de teléfono</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.prefix}>+52</Text>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="6641234567"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(v) => setPhone(onlyDigits(v))}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={checkPhone} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continuar</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'create' && (
          <>
            <Text style={styles.subtitle}>
              {firstName ? `¡Hola ${firstName}! ` : ''}Crea tu contraseña
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña (mín. 6)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
            <TouchableOpacity style={styles.btn} onPress={createPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear y entrar</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={reset} style={styles.link}>
              <Text style={styles.linkText}>Cambiar número</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'login' && (
          <>
            <Text style={styles.subtitle}>
              {firstName ? `¡Hola ${firstName}! ` : ''}Ingresa tu contraseña
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.btn} onPress={login} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Iniciar sesión</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={reset} style={styles.link}>
              <Text style={styles.linkText}>Cambiar número</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  prefix: { fontSize: 16, fontWeight: '600', color: '#374151', paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, marginRight: 8, backgroundColor: '#f9fafb' },
  phoneInput: { flex: 1, marginBottom: 0 },
  btn: { backgroundColor: '#ea580c', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { alignItems: 'center', padding: 8 },
  linkText: { color: '#6b7280', fontSize: 14 },
});
