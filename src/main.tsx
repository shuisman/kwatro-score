import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { initPwa } from './pwa';
import { RouterProvider } from './router';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <RouterProvider initialPath={window.location.pathname}>
      <App />
    </RouterProvider>
  </StrictMode>
);

// Prerendered pages hydrate; the SPA fallback (404.html, dev server) renders from scratch.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);

initPwa();
