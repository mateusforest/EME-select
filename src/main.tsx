import './mobile.css';
import {setupMobileViewport} from './mobile-viewport';
setupMobileViewport();
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

const isSelect = /^\/acesso-select(?:\/|$)/.test(window.location.pathname);
const SelectApp = lazy(() => import('./select/SelectPortal'));
const isPortal = /^\/portalselect(?:\/|$)/.test(window.location.pathname);
const isSubmission = /^\/enviar-imovel\/?$/.test(window.location.pathname);
const isPresentation = /^\/apresentar\/(g400|cenario)\/?$/.test(window.location.pathname);
const Presentation = lazy(() => import('./presentation/Presentation'));
const PublicApp = lazy(() => import('./PublicApp'));
const PortalApp = lazy(() => import('./portal/PortalEntry'));
const SubmissionPage = lazy(() => import('./SubmissionPage'));
const App = isSelect ? SelectApp : isPresentation ? Presentation : isPortal ? PortalApp : isSubmission ? SubmissionPage : PublicApp;

const legacyPublic = /^#\/(?:empreendimentos|curadoria|comparar|equipe|pessoas|perfil)(?:\/|\?|$)/.test(window.location.hash);
if (!isSelect && !isPresentation && !isPortal && !isSubmission && !legacyPublic) {
  void import('./experience/bootstrap.js').then(module => module.startExperience());
} else {
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Suspense fallback={<div role="status" style={{ padding: 32, color: '#173c32', fontFamily: 'Arial, sans-serif' }}>Carregando EME Select…</div>}><App /></Suspense></React.StrictMode>,
);
}
