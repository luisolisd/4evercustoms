import api from './api';

const base = (wid) => `/workshops/${wid}`;

// Catálogo de fotos del taller
export const getPhotoTemplates = (wid, all = false) =>
  api.get(`${base(wid)}/photo-templates`, { params: all ? { all: true } : undefined });
export const createPhotoTemplate = (wid, label) => api.post(`${base(wid)}/photo-templates`, { label });
export const updatePhotoTemplate = (wid, id, d) => api.patch(`${base(wid)}/photo-templates/${id}`, d);
export const deletePhotoTemplate = (wid, id) => api.delete(`${base(wid)}/photo-templates/${id}`);

// Fotos requeridas por orden
export const addPhotoSlots = (wid, orderId, d) => api.post(`${base(wid)}/work-orders/${orderId}/photo-slots`, d);
export const removePhotoSlot = (wid, slotId) => api.delete(`${base(wid)}/photo-slots/${slotId}`);

// Galería y borrado
export const getGallery = (wid, p) => api.get(`${base(wid)}/photos`, { params: p });
export const bulkDeletePhotos = (wid, ids) => api.post(`${base(wid)}/photos/bulk-delete`, { ids });
