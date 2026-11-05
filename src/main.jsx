import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

// Minimal path router: each route is lazy-loaded so its stylesheet only applies on its own page.
const routes = {
  '/': lazy(() => import('./prototype/RippleApp.jsx')),
  '/design-system': lazy(() => import('./design-system/DesignSystem.jsx')),
};

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const Page = routes[path] || routes['/'];

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  </React.StrictMode>,
);
