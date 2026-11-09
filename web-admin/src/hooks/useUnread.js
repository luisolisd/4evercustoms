import { useQuery } from '@tanstack/react-query';
import { getMyNotifications } from '../services/notifications';

// Cantidad de avisos sin leer del usuario (se refresca cada minuto)
export const useUnread = () => {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getMyNotifications({ limit: 1 }).then((r) => r.unread || 0),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  return data || 0;
};
