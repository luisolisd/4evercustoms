import { create } from 'zustand';

let nextId = 0;

export const useToastStore = create((set) => ({
  toasts: [],

  success: (message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: ++nextId, type: 'success', message }],
    })),

  error: (message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: ++nextId, type: 'error', message }],
    })),

  info: (message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: ++nextId, type: 'info', message }],
    })),

  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
