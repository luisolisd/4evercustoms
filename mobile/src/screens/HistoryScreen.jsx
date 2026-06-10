import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { getVehicleOrders } from '../services/vehicles';
import { getMyVehicles } from '../services/vehicles';
import { COLORS, STATUS_COLORS, STATUS_LABELS } from '../constants/theme';

function OrderCard({ order, onPress }) {
  const sc = STATUS_COLORS[order.status] || { bg: COLORS.gray100, text: COLORS.gray500 };
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNum}>{order.orderNumber}</Text>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.text }]}>{STATUS_LABELS[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.vehicle} numberOfLines={1}>
        {order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}
      </Text>
      {order.description && <Text style={styles.desc} numberOfLines={2}>{order.description}</Text>}
      <View style={styles.cardBottom}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.gray400} />
          <Text style={styles.metaText}>
            {new Date(order.receivedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        {Number(order.totalAmount) > 0 && (
          <Text style={styles.total}>
            ${Number(order.totalAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen({ navigation }) {
  const { workshopId, customerId } = useAuthStore();

  const { data: vehiclesRes } = useQuery({
    queryKey: ['my-vehicles', workshopId, customerId],
    queryFn: () => getMyVehicles(workshopId, customerId),
    enabled: !!workshopId && !!customerId,
  });

  const vehicleIds = (vehiclesRes?.data || []).map((v) => v.id);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['all-orders', workshopId, customerId],
    queryFn: async () => {
      if (!vehicleIds.length) return { data: [] };
      const results = await Promise.all(vehicleIds.map((vid) => getVehicleOrders(workshopId, vid)));
      const all = results.flatMap((r) => r?.data || []);
      all.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
      return { data: all };
    },
    enabled: !!workshopId && vehicleIds.length > 0,
  });

  const orders = data?.data || [];
  const active = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const history = orders.filter((o) => ['DELIVERED', 'CANCELLED'].includes(o.status));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de servicios</Text>
        <Text style={styles.subtitle}>{orders.length} servicios</Text>
      </View>

      <FlatList
        data={[...active, ...history]}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.vehicleId })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.gray200} />
              <Text style={styles.emptyTitle}>Sin historial</Text>
              <Text style={styles.emptySub}>Tus servicios aparecerán aquí</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          active.length > 0 && history.length > 0 ? (
            <Text style={styles.groupLabel}>En proceso ({active.length})</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  subtitle: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  list: { padding: 16, gap: 12, paddingBottom: 32, flexGrow: 1 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  orderNum: { fontSize: 15, fontWeight: '800', color: COLORS.gray900, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  vehicle: { fontSize: 13, color: COLORS.gray500, marginBottom: 6 },
  desc: { fontSize: 13, color: COLORS.gray700, marginBottom: 8, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: COLORS.gray400 },
  total: { fontSize: 15, fontWeight: '800', color: COLORS.gray900 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray700, marginTop: 12 },
  emptySub: { fontSize: 13, color: COLORS.gray400, marginTop: 6 },
});
