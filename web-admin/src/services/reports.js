import api from './api';

export const exportExcel = (wid, params) => api.get(`/workshops/${wid}/reports/export`, { params, responseType: 'blob' });
export const getReports =(wid, type, params) => api.get(`/workshops/${wid}/reports/${type}`, { params });
