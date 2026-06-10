import api from './api';

export const getNotifications = (params) =>
  api.get('/notifications', { params });

export const markAsRead = (notifId) =>
  api.patch(`/notifications/${notifId}/read`);

export const markAllRead = () =>
  api.patch('/notifications/read-all');

export const registerPushToken = (token) =>
  api.post('/notifications/push-token', { token });
