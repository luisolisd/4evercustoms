import api from './api';

export const getMyAppointments = (workshopId, customerId) =>
  api.get(`/workshops/${workshopId}/appointments`, { params: { customerId, limit: 20 } });

export const createAppointment = (workshopId, data) =>
  api.post(`/workshops/${workshopId}/appointments`, data);

export const cancelAppointment = (workshopId, id) =>
  api.patch(`/workshops/${workshopId}/appointments/${id}/status`, { status: 'CANCELLED' });
