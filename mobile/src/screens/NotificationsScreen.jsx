import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { getNotifications, markAsRead, markAllRead, registerPushToken } from '../services/notifications';
import { COLORS } from '../constants/theme';

const NOTIF_ICONS = {
  ORDER_STATUS_CHANGE: { name: 'car', color: COLORS.primary },
  APPOINTMENT_REMINDER: { name: 'calendar', color: COLORS.blue },
  QUOTE_APPROVED: { name: 'checkmark-circle', color: COLORS.green },
  QUOTE_REJECTED: { name: 'close-circle', color: COLORS.red },
  PAYMENT_DUE: { name: 'cash', color: COLORS.yellow },
  VEHICLE_READY: { name: 'checkmark-done-circle', color: COLORS.green },
  GENERAL: { name: 'information-circle', color: COLORS.gray500 },
};

function NotifItem({ notif, onPress }) {
  const icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.GENERAL;
  const time = new Date(notif.createdAt);
  const now = new Date();
  const diffMin = Math.floor((now - time) / 60000);
  const timeStr = diffMin < 60
    ? `${diffMin}m`
    : diffMin < 1440
    ? `${Math.floor(diffMin / 60)}h`
    : time.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity
      style={[styles.item, !notif.isRead && styles.itemUnread]}
      onPress={() => onPress(notif)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: icon.color + '20' }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
        <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.time}>{timeStr}</Text>
        {!notif.isRead && <View style={styles.dot} />}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 30 }),
    enabled: !!user,
  });

  const markMut = useMutation({
    mutationFn: (id) => markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMut = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handlePress = (notif) => {
    if (!notif.isRead) markMut.mutate(notif.id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notificaciones</Text>
          {unreadCount > 0 && <Text style={styles.badge}>{unreadCount} nuevas</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllMut.mutate()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotifItem notif={item} onPress={handlePress} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray200} />
              <Text style={styles.emptyTitle}>Sin notificaciones</Text>
              <Text style={styles.emptySub}>Aquí aparecerán las actualizaciones de tu vehículo</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  badge: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.primaryLight, borderRadius: 8 },
  markAllText: { fontSize: 12, color: COLORS.primaryDark, fontWeight: '700' },
  list: { paddingVertical: 8, flexGrow: 1 },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: COLORS.card },
  itemUnread: { backgroundColor: '#fff7ed' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shrink: 0 },
  body: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  notifMessage: { fontSize: 13, color: COLORS.gray500, marginTop: 2, lineHeight: 18 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 11, color: COLORS.gray400 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  separator: { height: 1, backgroundColor: COLORS.gray100 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray700, marginTop: 12 },
  emptySub: { fontSize: 13, color: COLORS.gray400, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});
