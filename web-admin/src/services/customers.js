import api from './api';

const base = (wid) => `/workshops/${wid}/customers`;

export const getCustomers  = (wid, p) => api.get(base(wid), { params: p });
export const getCustomer   = (wid, id) => api.get(`${base(wid)}/${id}`);
export const createCustomer= (wid, d) => api.post(base(wid), d);
export const updateCustomer= (wid, id, d) => api.put(`${base(wid)}/${id}`, d);
export const deleteCustomer= (wid, id) => api.delete(`${base(wid)}/${id}`);
