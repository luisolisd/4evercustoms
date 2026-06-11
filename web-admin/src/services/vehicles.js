import api from './api';

const base = (wid) => `/workshops/${wid}/vehicles`;

export const getVehicles  = (wid, p) => api.get(base(wid), { params: p });
export const getVehicle   = (wid, id) => api.get(`${base(wid)}/${id}`);
export const createVehicle= (wid, d) => api.post(base(wid), d);
export const updateVehicle= (wid, id, d) => api.put(`${base(wid)}/${id}`, d);
export const deleteVehicle= (wid, id) => api.delete(`${base(wid)}/${id}`);
export const getVehicleHistory = (wid, id, p) => api.get(`${base(wid)}/${id}/history`, { params: p });
