import api from './api';

const base = (wid) => `/workshops/${wid}/reports`;

export const getReports      = (wid, type, params) => api.get(`${base(wid)}/${type}`, { params });
export const getSummary      = (wid, p) => api.get(`${base(wid)}/summary`, { params: p });
export const getRevenue      = (wid, p) => api.get(`${base(wid)}/revenue`, { params: p });
export const getOrdersByStatus = (wid) => api.get(`${base(wid)}/orders-by-status`);
export const getTopServices  = (wid, p) => api.get(`${base(wid)}/top-services`, { params: p });
export const getWorkshopStats = (wid) => api.get(`/workshops/${wid}/stats`);
