import customerApi from './customerApi';

const data = (r) => r.data; // el interceptor ya devuelve el body { success, data }

// ── Autenticación ────────────────────────────────────────────────────────────
export const customerStatus = (phone) =>
  customerApi.post('/auth/customer/status', { phone }).then(data);
export const customerSetPassword = (phone, password) =>
  customerApi.post('/auth/customer/set-password', { phone, password }).then(data);
export const customerLogin = (phone, password) =>
  customerApi.post('/auth/customer/login', { phone, password }).then(data);

// ── Datos del cliente ────────────────────────────────────────────────────────
export const getMe = () => customerApi.get('/customer/me').then(data);
export const getVehicles = () => customerApi.get('/customer/vehicles').then(data);
export const getVehicle = (id) => customerApi.get(`/customer/vehicles/${id}`).then(data);
export const getOrder = (id) => customerApi.get(`/customer/work-orders/${id}`).then(data);
export const signOrder = (id, signature) =>
  customerApi.patch(`/customer/work-orders/${id}/sign`, { signature }).then(data);
export const getAppointments = () => customerApi.get('/customer/appointments').then(data);
export const createAppointment = (payload) =>
  customerApi.post('/customer/appointments', payload).then(data);
export const cancelAppointment = (id) =>
  customerApi.patch(`/customer/appointments/${id}/cancel`).then(data);
export const getQuotes = () => customerApi.get('/customer/quotes').then(data);
export const respondQuote = (id, decision, reason) =>
  customerApi.patch(`/customer/quotes/${id}/respond`, { decision, reason }).then(data);
export const getNotifications = () => customerApi.get('/customer/notifications').then(data);
export const markNotificationRead = (id) =>
  customerApi.patch(`/customer/notifications/${id}/read`).then(data);
export const deleteNotification = (id) =>
  customerApi.delete(`/customer/notifications/${id}`).then(data);
export const clearNotifications = () =>
  customerApi.delete('/customer/notifications').then(data);
export const getPromotions = () => customerApi.get('/customer/promotions').then(data);
