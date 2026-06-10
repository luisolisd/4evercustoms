import api from './api';

export const updateProfile  = (wid, d) => api.put(`/workshops/${wid}/users/me`, d);
export const changePassword = (wid, d) => api.post(`/workshops/${wid}/users/me/change-password`, d);
export const getMe          = (wid) => api.get(`/workshops/${wid}/users/me`);
