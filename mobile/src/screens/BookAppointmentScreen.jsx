import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { createAppointment } from '../services/appointments';
import { getMyVehicles } from '../services/vehicles';
import { COLORS } from '../constants/theme';

const SERVICES = [
  'Cambio de aceite', 'Afinación menor', 'Afinación mayor', 'Balanceo y alineación',
  'Revisión de frenos', 'Cambio de llantas', 'Servicio de transmisión',
  'Revisión de motor', 'Diagnóstico electrónico', 'Otro',
];

const HOURS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
               '12:00', '12:30', '13:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

function SelectOption({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function BookAppointmentScreen({ navigation }) {
  const { workshopId, customerId } = useAuthStore();
  const qc = useQueryClient();

  const [vehicleId, setVehicleId] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(1);

  const { data: vehiclesRes } = useQuery({
    queryKey: ['my-vehicles', workshopId, customerId],
    queryFn: () => getMyVehicles(workshopId, customerId),
    enabled: !!workshopId && !!customerId,
  });
  const vehicles = vehiclesRes?.data || [];

  const mut = useMutation({
    mutationFn: () => {
      const [y, m, d] = date.split('-');
      const [h, min] = hour.split(':');
      const scheduledAt = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min)).toISOString();
      return createAppointment(workshopId, {
        customerId,
        vehicleId,
        serviceType: service,
        scheduledAt,
        duration: 60,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments', workshopId, customerId] });
      Alert.alert('¡Cita agendada!', 'Tu cita ha sido registrada. Te confirmaremos pronto.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e) => Alert.alert('Error', e?.message || 'No se pudo agendar la cita'),
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gray900} />
        </TouchableOpacity>
        <Text style={styles.title}>Agendar cita</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Selecciona tu vehículo</Text>
          {vehicles.length === 0 ? (
            <Text style={styles.noVehicle}>No tienes vehículos registrados.</Text>
          ) : (
            <View style={styles.optionGrid}>
              {vehicles.map((v) => (
                <SelectOption
                  key={v.id}
                  label={`${v.year} ${v.make} ${v.model}`}
                  selected={vehicleId === v.id}
                  onPress={() => setVehicleId(v.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Step 2: Service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Tipo de servicio</Text>
          <View style={styles.optionGrid}>
            {SERVICES.map((s) => (
              <SelectOption key={s} label={s} selected={service === s} onPress={() => setService(s)} />
            ))}
          </View>
        </View>

        {/* Step 3: Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Fecha</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={COLORS.gray400}
            />
          </View>
          <Text style={styles.hint}>Formato: 2026-07-15</Text>
        </View>

        {/* Step 4: Hour */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Hora</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
            {HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setHour(h)}
                style={[styles.hourChip, hour === h && styles.hourChipSelected]}
              >
                <Text style={[styles.hourText, hour === h && styles.hourTextSelected]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Step 5: Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Notas adicionales (opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe el problema o solicitud especial..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholderTextColor={COLORS.gray400}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!vehicleId || !service || !date || !hour) && styles.submitDisabled]}
          disabled={!vehicleId || !service || !date || !hour || mut.isPending}
          onPress={() => mut.mutate()}
          activeOpacity={0.8}
        >
          {mut.isPending ? (
            <Text style={styles.submitText}>Agendando...</Text>
          ) : (
            <>
              <Ionicons name="calendar-check-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Confirmar cita</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray900, marginBottom: 12 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.gray200, backgroundColor: COLORS.card,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  optionText: { fontSize: 13, color: COLORS.gray700, fontWeight: '500' },
  optionTextSelected: { color: COLORS.primaryDark, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.gray200,
    paddingHorizontal: 14, height: 48,
  },
  inputIcon: {},
  input: { flex: 1, fontSize: 15, color: COLORS.gray900 },
  hint: { fontSize: 11, color: COLORS.gray400, marginTop: 4, marginLeft: 4 },
  hourRow: { gap: 8, paddingVertical: 4 },
  hourChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.gray200, backgroundColor: COLORS.card,
  },
  hourChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  hourText: { fontSize: 13, color: COLORS.gray700, fontWeight: '600' },
  hourTextSelected: { color: '#fff' },
  textArea: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.gray200,
    padding: 14, fontSize: 14, color: COLORS.gray900, minHeight: 80,
  },
  noVehicle: { fontSize: 13, color: COLORS.gray400 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
