import api from './api';

const base = (wid) => `/workshops/${wid}/appointments`;

export const getAppointments   = (wid, p) => api.get(base(wid), { params: p });
export const getAppointment    = (wid, id) => api.get(`${base(wid)}/${id}`);
export const createAppointment = (wid, d) => api.post(base(wid), d);
export const updateAppointment = (wid, id, d) => api.put(`${base(wid)}/${id}`, d);
export const updateAppStatus   = (wid, id, status) => api.patch(`${base(wid)}/${id}/status`, { status });
export const cancelAppointment = (wid, id) => api.delete(`${base(wid)}/${id}`);
