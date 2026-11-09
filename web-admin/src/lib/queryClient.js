import { QueryClient } from '@tanstack/react-query';

// Cliente único de react-query; se exporta para poder vaciar la caché al cerrar sesión.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});
