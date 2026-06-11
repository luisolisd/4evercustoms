import api from './api';

export const getWorkshop = (wid) => api.get(`/workshops/${wid}`);
export const updateWorkshop = (wid, d) => api.put(`/workshops/${wid}`, d);
