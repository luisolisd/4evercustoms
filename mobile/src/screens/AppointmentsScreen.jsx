import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { getMyAppointments, cancelAppointment } from '../services/appointments';
import { COLORS, APPOINTMENT_STATUS } from '../constants/theme';

function AppointmentItem({ appointment, onCancel }) {
  const date = new Date(appointment.scheduledAt);
  const sc = APPOINTMENT_STATUS[appointment.status] || { bg: COLORS.gray100, text: COLORS.gray500, label: appointment.status };
  const canCancel = ['PENDING', 'CONFIRMED'].includes(appointment.status);

  return (
    <View style={styles.item}>
      <View style={styles.itemTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{date.getDate()}</Text>
          <Text style={styles.dateMonth}>{date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}</Text>
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.service} numberOfLines={1}>{appointment.serviceType}</Text>
          <Text style={styles.vehicle} numberOfLines={1}>
            {appointment.vehicle?.year} {appointment.vehicle?.make} {appointment.vehicle?.model}
          </Text>
          <Text style={styles.time}>
            {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · {appointment.duration} min
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.text }]}>{sc.label}</Text>
        </View>
      </View>
      {appointment.notes ? (
        <Text style={styles.notes} numberOfLines={2}>{appointment.notes}</Text>
      ) : null}
      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(appointment)}>
          <Text style={styles.cancelBtnText}>Cancelar cita</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AppointmentsScreen({ navigation }) {
  const { workshopId, customerId } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-appointments', workshopId, customerId],
    queryFn: () => getMyAppointments(workshopId, customerId),
    enabled: !!workshopId && !!customerId,
  });

  const cancelMut = useMutation({
    mutationFn: (id) => cancelAppointment(workshopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-appointments', workshopId, customerId] }),
    onError: (e) => Alert.alert('Error', e?.message || 'No se pudo cancelar la cita'),
  });

  const handleCancel = (appointment) => {
    Alert.alert(
      'Cancelar cita',
      `¿Deseas cancelar tu cita del ${new Date(appointment.scheduledAt).toLocaleDateString('es-MX')}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelMut.mutate(appointment.id) },
      ]
    );
  };

  const appointments = data?.data || [];
  const upcoming = appointments.filter((a) => !['COMPLETED', 'CANCELLED'].includes(a.status));
  const past = appointments.filter((a) => ['COMPLETED', 'CANCELLED'].includes(a.status));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis citas</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('BookAppointment')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AppointmentItem appointment={item} onCancel={handleCancel} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          upcoming.length > 0 && past.length > 0 ? (
            <Text style={styles.sectionLabel}>Próximas ({upcoming.length})</Text>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.gray200} />
              <Text style={styles.emptyTitle}>No tienes citas</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('BookAppointment')}>
                <Text style={styles.emptyBtnText}>Agendar ahora</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          past.length > 0 ? <Text style={styles.sectionLabel}>Historial ({past.length})</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 12, paddingBottom: 32, flexGrow: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginVertical: 8 },
  item: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBox: {
    width: 46, height: 52, backgroundColor: COLORS.primaryLight, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  dateMonth: { fontSize: 10, fontWeight: '600', color: COLORS.primaryDark },
  itemBody: { flex: 1 },
  service: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  vehicle: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  time: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  notes: { fontSize: 12, color: COLORS.gray500, marginTop: 10, fontStyle: 'italic' },
  cancelBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  cancelBtnText: { fontSize: 13, color: COLORS.red, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray700, marginTop: 12 },
  emptyBtn: { marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
