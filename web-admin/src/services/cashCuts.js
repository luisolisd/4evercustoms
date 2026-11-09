import api from './api';

const base = (wid) => `/workshops/${wid}/cash-cuts`;

export const previewCashCut = (wid, p) => api.get(`${base(wid)}/preview`, { params: p });
export const createCashCut = (wid, d) => api.post(base(wid), d);
export const getCashCuts = (wid, p) => api.get(base(wid), { params: p });
