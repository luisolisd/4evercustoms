import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Dos aplicaciones instalables con el mismo código:
//   · index.html   → panel del taller (admin / supervisor / técnico)  · manifest.webmanifest
//   · cliente.html → portal de clientes (se instala desde un QR)       · manifest-cliente.webmanifest
// Cada HTML enlaza SU manifiesto, así "Agregar a inicio" abre la app correcta.
const portalFallback = (server) => {
  server.middlewares.use((req, _res, next) => {
    const url = req.url || '';
    if (/^\/cliente(\/|\?|$)/.test(url) && !url.split('?')[0].includes('.')) req.url = '/cliente.html';
    next();
  });
};
const multiPage = () => ({
  name: 'portal-html-fallback',
  configureServer: portalFallback,
  configurePreviewServer: portalFallback,
});

export default defineConfig({
  plugins: [
    react(),
    multiPage(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false, // el registro se hace en src/main.jsx (sirve a ambos HTML)
      manifest: false,       // manifiestos estáticos en /public
      includeAssets: ['apple-touch-icon.png', 'color.png', 'negro.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        globIgnores: ['**/WorkOrderPDF-*.js'], // PDF (admin) se carga bajo demanda, no se precachea
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: { main: 'index.html', cliente: 'cliente.html' },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
});
