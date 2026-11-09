import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Service worker (notificaciones push y actualización automática) para panel y portal
if (import.meta.env.PROD) registerSW({ immediate: true });

// iOS ignora user-scalable=no: bloqueamos el zoom por pellizco con JS.
['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) =>
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false })
);
// Bloquea el zoom por doble-tap (respaldo al touch-action de CSS)
let _lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - _lastTouchEnd <= 300) e.preventDefault();
  _lastTouchEnd = now;
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);


