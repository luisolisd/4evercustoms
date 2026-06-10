import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { getVehicleOrders } from '../services/vehicles';
import { COLORS, STATUS_COLORS, STATUS_LABELS } from '../constants/theme';

const STEPS = [
  'RECEIVED', 'DIAGNOSIS', 'AWAITING_AUTH', 'IN_REPAIR',
  'FINAL_TESTING', 'READY_FOR_PICKUP', 'DELIVERED',
];

function StatusTimeline({ status }) {
  const curIdx = STEPS.indexOf(status);
  return (
    <View style={styles.timeline}>
      {STEPS.map((s, i) => {
        const done = i <= curIdx;
        const active = s === status;
        return (
          <View key={s} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done && !active && <Ionicons name="checkmark" size={10} color="#fff" />}
                {active && <View style={styles.dotInner} />}
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.line, done && i < curIdx && styles.lineDone]} />
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive, done && !active && styles.stepLabelDone]}>
              {STATUS_LABELS[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicleId } = route.params;
  const { workshopId } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-orders', workshopId, vehicleId],
    queryFn: () => getVehicleOrders(workshopId, vehicleId),
    enabled: !!workshopId,
  });

  const orders = data?.data || [];
  const activeOrder = orders.find((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const latestOrder = activeOrder || orders[0];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estado del vehículo</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!latestOrder ? (
          <View style={styles.noOrder}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.green} />
            <Text style={styles.noOrderTitle}>¡Todo bien!</Text>
            <Text style={styles.noOrderSub}>No hay órdenes activas para este vehículo.</Text>
          </View>
        ) : (
          <>
            {/* Order header */}
            <View style={styles.card}>
              <View style={styles.orderTop}>
                <Text style={styles.orderNum}>{latestOrder.orderNumber}</Text>
                {activeOrder && (
                  <View style={[styles.activeBadge, { backgroundColor: STATUS_COLORS[latestOrder.status]?.bg || COLORS.gray100 }]}>
                    <Text style={[styles.activeBadgeText, { color: STATUS_COLORS[latestOrder.status]?.text || COLORS.gray500 }]}>
                      Activo
                    </Text>
                  </View>
                )}
              </View>
              {latestOrder.description && (
                <Text style={styles.orderDesc} numberOfLines={2}>{latestOrder.description}</Text>
              )}
              {latestOrder.estimatedReady && (
                <View style={styles.estimateRow}>
                  <Ionicons name="time-outline" size={14} color={COLORS.gray500} />
                  <Text style={styles.estimateText}>
                    Entrega estimada: {new Date(latestOrder.estimatedReady).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>

            {/* Status timeline */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Progreso</Text>
              <StatusTimeline status={latestOrder.status} />
            </View>

            {/* Diagnosis */}
            {latestOrder.diagnosis && (
              <View style={[styles.card, styles.diagCard]}>
                <Text style={styles.diagLabel}>Diagnóstico del técnico</Text>
                <Text style={styles.diagText}>{latestOrder.diagnosis}</Text>
              </View>
            )}

            {/* Parts */}
            {latestOrder.workOrderParts?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Refacciones utilizadas</Text>
                {latestOrder.workOrderParts.map((p) => (
                  <View key={p.id} style={styles.partRow}>
                    <Text style={styles.partName}>{p.part?.name}</Text>
                    <Text style={styles.partQty}>x{p.quantity}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Total */}
            {Number(latestOrder.totalAmount) > 0 && (
              <View style={styles.card}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total del servicio</Text>
                  <Text style={styles.totalAmount}>
                    ${Number(latestOrder.totalAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: COLORS.gray500 }]}>Estatus de pago</Text>
                  <View style={[styles.payBadge, { backgroundColor: latestOrder.paymentStatus === 'PAID' ? COLORS.greenLight : COLORS.yellowLight }]}>
                    <Text style={[styles.payText, { color: latestOrder.paymentStatus === 'PAID' ? '#15803d' : '#92400e' }]}>
                      {latestOrder.paymentStatus === 'PAID' ? 'Pagado' : latestOrder.paymentStatus === 'PENDING' ? 'Pendiente' : latestOrder.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  orderNum: { fontSize: 18, fontWeight: '800', color: COLORS.gray900, fontFamily: 'monospace' },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },
  orderDesc: { fontSize: 13, color: COLORS.gray500, marginTop: 4 },
  estimateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  estimateText: { fontSize: 13, color: COLORS.gray500 },
  timeline: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 20 },
  dot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.gray200,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card,
  },
  dotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dotActive: { backgroundColor: COLORS.card, borderColor: COLORS.primary, borderWidth: 3 },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  line: { width: 2, height: 24, backgroundColor: COLORS.gray200, marginVertical: 2 },
  lineDone: { backgroundColor: COLORS.primary },
  stepLabel: { fontSize: 13, color: COLORS.gray400, paddingTop: 2, paddingBottom: 24, flex: 1 },
  stepLabelDone: { color: COLORS.gray500 },
  stepLabelActive: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  diagCard: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  diagLabel: { fontSize: 11, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  diagText: { fontSize: 14, color: '#1e40af', lineHeight: 20 },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  partName: { fontSize: 13, color: COLORS.gray700 },
  partQty: { fontSize: 13, color: COLORS.gray500 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: COLORS.gray700, fontWeight: '600' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: COLORS.gray900 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  payText: { fontSize: 12, fontWeight: '700' },
  noOrder: { alignItems: 'center', paddingTop: 60 },
  noOrderTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 14 },
  noOrderSub: { fontSize: 14, color: COLORS.gray500, marginTop: 8, textAlign: 'center' },
});
