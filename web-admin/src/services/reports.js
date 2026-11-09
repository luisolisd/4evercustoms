import api from './api';

export const getReports = (wid, type, params) => api.get(`/workshops/${wid}/reports/${type}`, { params });
