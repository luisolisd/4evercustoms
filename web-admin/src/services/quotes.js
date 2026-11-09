import api from './api';

const base = (wid) => `/workshops/${wid}/quotes`;

export const getQuotes    = (wid, p) => api.get(base(wid), { params: p });
export const createQuote  = (wid, d) => api.post(base(wid), d);
export const updateQuoteStatus = (wid, id, status, rejectionReason) =>
  api.patch(`${base(wid)}/${id}/status`, { status, rejectionReason });
export const addQuoteItem    = (wid, id, d) => api.post(`${base(wid)}/${id}/items`, d);
export const removeQuoteItem = (wid, qid, itemId) => api.delete(`${base(wid)}/${qid}/items/${itemId}`);
export const deleteQuote     = (wid, id) => api.delete(`${base(wid)}/${id}`);
export const createOrderFromQuote = (wid, id, vehicleId) => api.post(`${base(wid)}/${id}/create-order`, { vehicleId });
