import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { getMyVehicles } from '../services/vehicles';
import { COLORS, STATUS_COLORS, STATUS_LABELS } from '../constants/theme';

function VehicleItem({ vehicle, onPress }) {
  const order = vehicle.workOrders?.[0];
  const status = order?.status;
  const sc = status ? STATUS_COLORS[status] : { bg: COLORS.gray100, text: COLORS.gray500 };

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBox}>
        <Ionicons name="car" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemName}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
        <Text style={styles.itemSub}>{vehicle.licensePlate || 'Sin placa'}{vehicle.color ? ` · ${vehicle.color}` : ''}</Text>
        {status && (
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{STATUS_LABELS[status]}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
    </TouchableOpacity>
  );
}

export default function VehiclesScreen({ navigation }) {
  const { workshopId, customerId } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-vehicles', workshopId, customerId],
    queryFn: () => getMyVehicles(workshopId, customerId),
    enabled: !!workshopId && !!customerId,
  });

  const vehicles = data?.data || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis vehículos</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <VehicleItem
            vehicle={item}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color={COLORS.gray200} />
              <Text style={styles.emptyTitle}>Sin vehículos</Text>
              <Text style={styles.emptySub}>Tus vehículos registrados aparecerán aquí</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  item: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.gray900 },
  itemSub: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray700, marginTop: 12 },
  emptySub: { fontSize: 13, color: COLORS.gray400, marginTop: 6, textAlign: 'center' },
});
