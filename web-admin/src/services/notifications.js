import api from './api';

// Bandeja de avisos del personal del taller (asignaciones de órdenes y citas)
export const getMyNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');
