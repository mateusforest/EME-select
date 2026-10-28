import './mobile.css';
import {setupMobileViewport} from './mobile-viewport';
setupMobileViewport();
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import {canonicalSelectPath} from '../shared/select-routes.mjs';

const canonicalPath = canonicalSelectPath(window.location.pathname);
if (canonicalPath !== window.location.pathname) history.replaceState(history.state, '', canonicalPath + location.search + location.hash);

const isSelect = /^\/acesso-select(?:\/|$)/.test(window.location.pathname);
const isSwitch = /^\/switch\/?$/.test(window.location.pathname);
const SwitchPage = lazy(() => import('./switch/SwitchPage'));
const SelectApp = lazy(() => import('./select/SelectPortal'));
const isSubmission = /^\/enviar-imovel\/?$/.test(window.location.pathname);
const isPresentation = /^\/apresentar\/(g400|cenario)\/?$/.test(window.location.pathname);
const Presentation = lazy(() => import('./presentation/Presentation'));
const PublicApp = lazy(() => import('./PublicApp'));
const SubmissionPage = lazy(() => import('./SubmissionPage'));
const App = isSwitch ? SwitchPage : isSelect ? SelectApp : isPresentation ? Presentation : isSubmission ? SubmissionPage : PublicApp;

const legacyPublic = /^#\/(?:empreendimentos|curadoria|comparar|equipe|pessoas|perfil)(?:\/|\?|$)/.test(window.location.hash);
if (!isSwitch && !isSelect && !isPresentation && !isSubmission && !legacyPublic) {
  void import('./experience/bootstrap.js').then(module => module.startExperience());
} else {
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Suspense fallback={<div role="status" style={{ padding: 32, color: '#173c32', fontFamily: 'Arial, sans-serif' }}>Carregando EME Select…</div>}><App /></Suspense></React.StrictMode>,
);
}
