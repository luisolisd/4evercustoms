import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { getMyVehicles } from '../services/vehicles';
import { getMyAppointments } from '../services/appointments';
import { COLORS, STATUS_COLORS, STATUS_LABELS } from '../constants/theme';

function VehicleCard({ vehicle, onPress }) {
  const order = vehicle.workOrders?.[0];
  const status = order?.status;
  const colors = status ? STATUS_COLORS[status] : { bg: COLORS.gray100, text: COLORS.gray500 };

  return (
    <TouchableOpacity style={styles.vehicleCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.vehicleCardTop}>
        <View style={styles.vehicleIcon}>
          <Ionicons name="car" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
          <Text style={styles.vehiclePlate}>{vehicle.licensePlate || 'Sin placa'}</Text>
        </View>
      </View>
      {order ? (
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {STATUS_LABELS[status] || status}
          </Text>
        </View>
      ) : (
        <Text style={styles.noOrder}>Sin órdenes activas</Text>
      )}
    </TouchableOpacity>
  );
}

function AppointmentCard({ appointment, onPress }) {
  const date = new Date(appointment.scheduledAt);
  return (
    <TouchableOpacity style={styles.apptCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.apptDateBox}>
        <Text style={styles.apptDay}>{date.getDate()}</Text>
        <Text style={styles.apptMonth}>{date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}</Text>
      </View>
      <View style={styles.apptInfo}>
        <Text style={styles.apptService} numberOfLines={1}>{appointment.serviceType}</Text>
        <Text style={styles.apptVehicle} numberOfLines={1}>
          {appointment.vehicle?.year} {appointment.vehicle?.make} {appointment.vehicle?.model}
        </Text>
        <Text style={styles.apptTime}>{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <View style={[styles.apptStatus, { backgroundColor: appointment.status === 'CONFIRMED' ? COLORS.greenLight : COLORS.yellowLight }]}>
        <Text style={[styles.apptStatusText, { color: appointment.status === 'CONFIRMED' ? '#15803d' : '#92400e' }]}>
          {appointment.status === 'CONFIRMED' ? 'Confirmada' : 'Pendiente'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, workshopId, customerId } = useAuthStore();

  const { data: vehiclesRes, refetch: refetchVehicles, isRefetching } = useQuery({
    queryKey: ['my-vehicles', workshopId, customerId],
    queryFn: () => getMyVehicles(workshopId, customerId),
    enabled: !!workshopId && !!customerId,
  });

  const { data: apptsRes, refetch: refetchAppts } = useQuery({
    queryKey: ['my-appointments', workshopId, customerId],
    queryFn: () => getMyAppointments(workshopId, customerId),
    enabled: !!workshopId && !!customerId,
  });

  const vehicles = vehiclesRes?.data || [];
  const appointments = (apptsRes?.data || []).filter((a) => !['COMPLETED', 'CANCELLED'].includes(a.status)).slice(0, 3);

  const refetch = () => { refetchVehicles(); refetchAppts(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.firstName} 👋</Text>
            <Text style={styles.subtitle}>Panel del cliente</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('BookAppointment')}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.quickBtnText}>Agendar cita</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('History')}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.quickBtnText}>Mi historial</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis vehículos</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Vehicles')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {vehicles.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={32} color={COLORS.gray400} />
              <Text style={styles.emptyText}>Sin vehículos registrados</Text>
            </View>
          ) : (
            vehicles.slice(0, 3).map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                onPress={() => navigation.navigate('VehicleDetail', { vehicleId: v.id })}
              />
            ))
          )}
        </View>

        {/* Upcoming appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximas citas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {appointments.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.gray400} />
              <Text style={styles.emptyText}>No tienes citas próximas</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('BookAppointment')}>
                <Text style={styles.emptyBtnText}>Agendar ahora</Text>
              </TouchableOpacity>
            </View>
          ) : (
            appointments.map((a) => (
              <AppointmentCard key={a.id} appointment={a} onPress={() => navigation.navigate('Appointments')} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.dark },
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: COLORS.dark, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: COLORS.gray400, fontSize: 13, marginTop: 2 },
  notifBtn: { padding: 8 },
  quickActions: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16,
  },
  quickBtn: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  quickBtnText: { color: COLORS.gray700, fontWeight: '600', fontSize: 14 },
  section: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  sectionLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  vehicleCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  vehicleCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  vehicleIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: '700', color: COLORS.gray900 },
  vehiclePlate: { fontSize: 12, color: COLORS.gray500, marginTop: 2, fontFamily: 'monospace' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  noOrder: { fontSize: 12, color: COLORS.gray400 },
  apptCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  apptDateBox: {
    width: 46, height: 52, backgroundColor: COLORS.primaryLight, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  apptDay: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  apptMonth: { fontSize: 10, fontWeight: '600', color: COLORS.primaryDark },
  apptInfo: { flex: 1 },
  apptService: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
  apptVehicle: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  apptTime: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  apptStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  apptStatusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: COLORS.gray400, fontSize: 14, marginTop: 8 },
  emptyBtn: { marginTop: 12, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
