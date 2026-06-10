import api from './api';

const base = (wid) => `/workshops/${wid}/work-orders`;

export const getWorkOrders  = (wid, p) => api.get(base(wid), { params: p });
export const getWorkOrder   = (wid, id) => api.get(`${base(wid)}/${id}`);
export const createWorkOrder= (wid, d) => api.post(base(wid), d);
export const updateWorkOrder= (wid, id, d) => api.put(`${base(wid)}/${id}`, d);
export const updateWOStatus = (wid, id, status, paymentStatus) =>
  api.patch(`${base(wid)}/${id}/status`, { status, paymentStatus });
export const addWOPart    = (wid, id, d) => api.post(`${base(wid)}/${id}/parts`, d);
export const removeWOPart = (wid, id, partId) => api.delete(`${base(wid)}/${id}/parts/${partId}`);
export const getWOPhotos  = (wid, id) => api.get(`/workshops/${wid}/work-orders/${id}/photos`);
export const uploadWOPhotos = (wid, id, formData) =>
  api.post(`/workshops/${wid}/work-orders/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deletePhoto  = (wid, photoId) => api.delete(`/workshops/${wid}/photos/${photoId}`);
