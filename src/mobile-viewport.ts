// Safari keeps the layout viewport behind the keyboard. Move floating controls
// into the visible viewport without changing the page's scroll position.
export function setupMobileViewport() {
  const viewport = window.visualViewport;
  const update = () => {
    const height = viewport?.height ?? window.innerHeight;
    const inset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
    document.documentElement.style.setProperty('--eme-visible-height', `${height}px`);
    document.documentElement.style.setProperty('--eme-keyboard-inset', `${inset > 100 ? inset : 0}px`);
  };
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  update();
}
