import api from './api';

const base = (wid) => `/workshops/${wid}/promotions`;

export const getPromotions = (wid) => api.get(base(wid));
export const createPromotion = (wid, d) => api.post(base(wid), d);
export const togglePromotion = (wid, id) => api.patch(`${base(wid)}/${id}/toggle`);
export const deletePromotion = (wid, id) => api.delete(`${base(wid)}/${id}`);
