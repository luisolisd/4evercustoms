import api from './api';

export const getMyVehicles = (workshopId, customerId) =>
  api.get(`/workshops/${workshopId}/vehicles`, { params: { customerId, limit: 50 } });

export const getVehicleOrders = (workshopId, vehicleId) =>
  api.get(`/workshops/${workshopId}/work-orders`, { params: { vehicleId, limit: 20 } });

export const getWorkOrder = (workshopId, orderId) =>
  api.get(`/workshops/${workshopId}/work-orders/${orderId}`);
