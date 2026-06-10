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
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!phone.trim()) return Alert.alert('Error', 'Ingresa tu número de teléfono');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setStep('code');
    } catch (e) {
      Alert.alert('Error', e.message || 'Error al enviar el código');
    } finally { setLoading(false); }
  };

  const verify = async () => {
    if (!code.trim()) return Alert.alert('Error', 'Ingresa el código SMS');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone, code });
      await setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
    } catch (e) {
      Alert.alert('Código incorrecto', e.message || 'Inténtalo de nuevo');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>4EVRcustoms</Text>
        <Text style={styles.subtitle}>Inicia sesión con tu teléfono</Text>

        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="+526641234567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Enviar código</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.hint}>Código enviado a {phone}</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <TouchableOpacity style={styles.btn} onPress={verify} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Verificar</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.link}>
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
  hint: { color: '#6b7280', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 8 },
  btn: { backgroundColor: '#ea580c', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { alignItems: 'center', padding: 8 },
  linkText: { color: '#6b7280', fontSize: 14 },
});
