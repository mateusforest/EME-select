import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { environments, properties } from './data';
import {sceneForLocation} from './sceneCategories';

const prepared = new Map<string, Promise<void>>();
const pathOf = (hash: string) => hash.split('?')[0];
function imageFor(hash: string) {
  const path = pathOf(hash).replace(/^#\/?/, '').split('/');
  if (!path[0]) return environments[0].image;
  if (path[0] === 'ambientes') {const env=environments.find(env => env.id === path[1]);return env?sceneForLocation(env,'').image:undefined;}
  if (path[0] === 'visita' || path[0] === 'imovel') return properties.find(property => property.id === path[1])?.image;
}

// Decode the actual asset before changing the page. Failures never trap navigation.
function prepareImage(source?: string): Promise<void> {
  if (!source) return Promise.resolve();
  const existing = prepared.get(source);
  if (existing) return existing;
  const request = new Promise<void>((resolve, reject) => {
    const image = new Image();
    let finished = false;
    const finish = (success: boolean) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (success) resolve(); else reject(new Error('Image unavailable'));
    };
    const timeout = window.setTimeout(() => finish(false), 8000);
    image.onload = () => { image.decode().then(() => finish(true), () => finish(false)); };
    image.onerror = () => finish(false);
    image.src = source;
  });
  prepared.set(source, request);
  void request.catch(() => { if (prepared.get(source) === request) prepared.delete(source); });
  return request;
}

interface Snapshot { element: HTMLElement; tween?: gsap.core.Timeline }

export function useSceneNavigation() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  const current = useRef(hash);
  const sequence = useRef(0);
  const waiting = useRef(false);
  const snapshots = useRef<Snapshot[]>([]);
  const pendingSnapshot = useRef<Snapshot | null>(null);
  current.current = hash;

  const status = (value: 'loading' | 'entering' | 'idle') => { document.documentElement.dataset.pageTransition = value; };
  function removeSnapshot(snapshot: Snapshot) {
    snapshot.tween?.kill();
    snapshot.element.remove();
    snapshots.current = snapshots.current.filter(item => item !== snapshot);
    if (!waiting.current && !snapshots.current.length) status('idle');
  }
  function capturePage() {
    const main = document.querySelector<HTMLElement>('#root main');
    if (!main || !main.matches('.scene-page, .tour-page')) return null;
    const rect = main.getBoundingClientRect();
    const copy = main.cloneNode(true) as HTMLElement;
    // A visual-only layer: no duplicate IDs, accessibility controls or app data hooks.
    for (const element of [copy, ...copy.querySelectorAll<HTMLElement>('*')]) {
      for (const attribute of [...element.attributes]) {
        if (['id', 'for', 'form', 'list', 'aria-labelledby', 'aria-describedby', 'aria-controls'].includes(attribute.name) || attribute.name.startsWith('data-')) element.removeAttribute(attribute.name);
      }
    }
    copy.inert = true;
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('role', 'presentation');
    copy.classList.add('page-visual-snapshot');
    Object.assign(copy.style, {
      // Document coordinates keep both scenes aligned when navigation resets mobile scroll.
      position: 'absolute', top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`,
      height: `${rect.height}px`, minHeight: '0', maxHeight: 'none', margin: '0', opacity: '1',
      transform: 'none', pointerEvents: 'none', overflow: 'hidden', zIndex: '10',
    });
    // Keep an already fading frame above the fresh snapshot during rapid choices.
    const oldest = snapshots.current[0]?.element;
    document.body.insertBefore(copy, oldest || null);
    const snapshot: Snapshot = { element: copy };
    snapshots.current.unshift(snapshot);
    if (snapshots.current.length > 4) removeSnapshot(snapshots.current[snapshots.current.length - 1]);
    return snapshot;
  }

  useEffect(() => {
    const update = async () => {
      const ticket = ++sequence.current;
      const next = window.location.hash || '#/';
      if (pathOf(next) === pathOf(current.current)) {
        waiting.current = false;
        setHash(next);
        status(snapshots.current.length ? 'entering' : 'idle');
        return;
      }
      waiting.current = true;
      status('loading');
      try { await prepareImage(imageFor(next)); } catch { /* The destination offers its image error state and navigation. */ }
      if (ticket !== sequence.current) return;
      waiting.current = false;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) pendingSnapshot.current = capturePage();
      status(pendingSnapshot.current ? 'entering' : 'idle');
      setHash(next);
    };
    const anticipate = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#/"]') : null;
      if (target) void prepareImage(imageFor(target.hash)).catch(() => {});
    };
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => {
      if (preference.matches) {
        for (const snapshot of [...snapshots.current]) removeSnapshot(snapshot);
        pendingSnapshot.current = null;
        status(waiting.current ? 'loading' : 'idle');
      }
    };
    window.addEventListener('hashchange', update);
    document.addEventListener('pointerover', anticipate, { passive: true });
    document.addEventListener('focusin', anticipate);
    preference.addEventListener('change', reduce);
    status('idle');
    return () => {
      ++sequence.current;
      window.removeEventListener('hashchange', update);
      document.removeEventListener('pointerover', anticipate);
      document.removeEventListener('focusin', anticipate);
      preference.removeEventListener('change', reduce);
      for (const snapshot of [...snapshots.current]) removeSnapshot(snapshot);
      pendingSnapshot.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.displayedRoute = pathOf(hash);
    const snapshot = pendingSnapshot.current;
    pendingSnapshot.current = null;
    if (!snapshot) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { removeSnapshot(snapshot); return; }
    const copy = snapshot.element;
    snapshot.tween = gsap.timeline({ onComplete: () => removeSnapshot(snapshot) });
    snapshot.tween.to(copy.querySelectorAll('.hero-copy, .scene-bottom, .scene-footnote, .scene-selection, .scene-location, .photographic-home__pins, .photographic-home__caption, .photographic-home__controls, .photographic-home__hint, .tour-heading, .tour-bottom, .tour-back, .tour-side-actions, .photographic-interior__controls'), {
      opacity: 0, duration: .28, ease: 'power2.out',
    }, 0).to(copy, { opacity: 0, duration: .95, ease: 'sine.inOut' }, 0);
  }, [hash]);

  return hash;
}
