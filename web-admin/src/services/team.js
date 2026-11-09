import api from './api';

export const getUsers = (wid) => api.get(`/workshops/${wid}/users`);
export const getTechnicians = (wid) => api.get(`/workshops/${wid}/technicians`);
export const createUser = (wid, d) => api.post(`/workshops/${wid}/users`, d);
export const updateUser = (wid, userId, d) => api.patch(`/workshops/${wid}/users/${userId}`, d);
export const resetUserPassword = (wid, userId, password) =>
  api.put(`/workshops/${wid}/users/${userId}/password`, { password });
export const removeUser = (wid, userId) => api.delete(`/workshops/${wid}/users/${userId}`);
