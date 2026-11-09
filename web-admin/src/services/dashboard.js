import api from './api';

export const getDashboard = (wid) => api.get(`/workshops/${wid}/dashboard`);
