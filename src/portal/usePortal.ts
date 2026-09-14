import { useEffect, useState } from 'react';
import { initialState, isPortalState, STORAGE_KEY, type PortalState } from './model';
export function usePortal() {
  const [loadWarning] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw && !isPortalState(JSON.parse(raw)) ? 'Os dados locais não puderam ser lidos. Os exemplos iniciais foram carregados.' : ''; }
    catch { return 'O armazenamento local está indisponível. As alterações podem durar apenas esta sessão.'; }
  });
  const [state, setState] = useState<PortalState>(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); const saved: unknown = raw ? JSON.parse(raw) : null; return isPortalState(saved) ? saved : initialState(); }
    catch { return initialState(); }
  });
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageError(''); }
    catch { setStorageError('Não foi possível guardar as alterações neste navegador. Mantenha esta página aberta.'); }
  }, [state]);
  return { state, setState, storageError: storageError || loadWarning };
}
export function usePortalRoute() {
  const route = () => window.location.pathname.replace(/^\/portalselect\/demo\/?/, '').replace(/\/$/, '') || 'hoje';
  const [page, setPage] = useState(route);
  useEffect(() => { const changed = () => setPage(route()); window.addEventListener('popstate', changed); return () => window.removeEventListener('popstate', changed); }, []);
  function navigate(next: string) {
    const path = next === 'hoje' ? '/portalselect/demo' : '/portalselect/demo/' + next;
    window.history.pushState({}, '', path);
    setPage(next); window.scrollTo({ top: 0 });
  }
  return { page, navigate };
}

