import api from './api';

export const getParts       = (wid, p) => api.get(`/workshops/${wid}/parts`, { params: p });
export const createPart     = (wid, d) => api.post(`/workshops/${wid}/parts`, d);
export const updatePart     = (wid, id, d) => api.put(`/workshops/${wid}/parts/${id}`, d);
export const deletePart     = (wid, id) => api.delete(`/workshops/${wid}/parts/${id}`);
export const getInventory   = (wid, p) => api.get(`/workshops/${wid}/inventory`, { params: p });
export const getLowStock    = (wid) => api.get(`/workshops/${wid}/inventory/low-stock`);
export const addMovement    = (wid, d) => api.post(`/workshops/${wid}/inventory/movements`, d);
export const createMovement = (wid, partId, d) => api.post(`/workshops/${wid}/inventory/movements`, { ...d, partId });
