import api from './api';

const base = (wid) => `/workshops/${wid}/reminders`;

export const getReminders = (wid, p) => api.get(base(wid), { params: p });
export const createReminder = (wid, d) => api.post(base(wid), d);
export const updateReminder = (wid, id, d) => api.put(`${base(wid)}/${id}`, d);
export const contactReminder = (wid, id) => api.post(`${base(wid)}/${id}/contact`);
export const setReminderStatus = (wid, id, status) => api.patch(`${base(wid)}/${id}/status`, { status });
export const decideQuote = (wid, id, decision) => api.post(`${base(wid)}/${id}/quote-decision`, { decision });
export const deleteReminder = (wid, id) => api.delete(`${base(wid)}/${id}`);
