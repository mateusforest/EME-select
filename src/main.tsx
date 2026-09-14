import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

const isPortal = /^\/portalselect(?:\/|$)/.test(window.location.pathname);
const PublicApp = lazy(() => import('./PublicApp'));
const PortalApp = lazy(() => import('./portal/PortalEntry'));
const App = isPortal ? PortalApp : PublicApp;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Suspense fallback={<div role="status" style={{ padding: 32, color: '#173c32', fontFamily: 'Arial, sans-serif' }}>Carregando EME Select…</div>}><App /></Suspense></React.StrictMode>,
);
