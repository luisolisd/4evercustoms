import api from './api';

const base = (wid) => `/workshops/${wid}/work-orders`;

export const getWorkOrders  = (wid, p) => api.get(base(wid), { params: p });
export const getWorkOrder   = (wid, id) => api.get(`${base(wid)}/${id}`);
export const createWorkOrder= (wid, d) => api.post(base(wid), d);
export const deleteWorkOrder= (wid, id) => api.delete(`${base(wid)}/${id}`);
export const updateWorkOrder= (wid, id, d) => api.put(`${base(wid)}/${id}`, d);
export const updateWOStatus = (wid, id, status, paymentStatus) =>
  api.patch(`${base(wid)}/${id}/status`, { status, paymentStatus });
export const updateWOTotal = (wid, id, totalAmount) => api.patch(`${base(wid)}/${id}/payment`, { totalAmount });
export const linkQuoteToOrder = (wid, id, quoteId) => api.patch(`${base(wid)}/${id}/link-quote`, { quoteId });
export const addWOPart    = (wid, id, d) => api.post(`${base(wid)}/${id}/parts`, d);
export const removeWOPart = (wid, id, lineId) => api.delete(`${base(wid)}/${id}/parts/${lineId}`);
export const uploadWOPhotos = (wid, id, formData) =>
  api.post(`/workshops/${wid}/work-orders/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deletePhoto  = (wid, photoId) => api.delete(`/workshops/${wid}/photos/${photoId}`);
export const addWOPayment = (wid, id, d) => api.post(`${base(wid)}/${id}/payments`, d);
export const removeWOPayment = (wid, id, paymentId) => api.delete(`${base(wid)}/${id}/payments/${paymentId}`);
export const signReception = (wid, id, d) => api.post(`${base(wid)}/${id}/reception-signature`, d);
export const clearReceptionSignature = (wid, id) => api.delete(`${base(wid)}/${id}/reception-signature`);
