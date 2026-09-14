(() => {
  const frame = document.getElementById('composition');
  const stage = document.getElementById('stage');
  const play = document.getElementById('play');
  const replay = document.getElementById('replay');
  const progress = document.getElementById('progress');
  const status = document.getElementById('status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timeline;

  function resize() { frame.style.transform = `scale(${stage.clientWidth / 1920})`; }
  new ResizeObserver(resize).observe(stage);
  resize();

  function applyPreference() {
    if (!timeline) return;
    timeline.pause(4.8);
    play.textContent = 'Reproduzir';
    play.disabled = reducedMotion.matches;
    replay.disabled = reducedMotion.matches;
    progress.disabled = reducedMotion.matches;
    status.textContent = reducedMotion.matches
      ? 'Animação reduzida conforme sua preferência.'
      : 'Uma breve apresentação. Reproduza quando quiser.';
  }

  frame.addEventListener('load', () => {
    timeline = frame.contentWindow.__timelines?.['eme-select-dobra'];
    if (!timeline) { status.textContent = 'A apresentação não pôde ser carregada. Você pode voltar à coleção.'; return; }
    timeline.eventCallback('onUpdate', () => { progress.value = String(timeline.time()); });
    timeline.eventCallback('onComplete', () => { play.textContent = 'Reproduzir'; status.textContent = 'Apresentação concluída.'; });
    applyPreference();
  });
  reducedMotion.addEventListener('change', applyPreference);
  play.addEventListener('click', () => {
    if (!timeline || reducedMotion.matches) return;
    if (!timeline.paused() && timeline.time() < 4.8) {
      timeline.pause(); play.textContent = 'Continuar'; status.textContent = 'Apresentação pausada.';
    } else {
      if (timeline.time() >= 4.79) timeline.restart(); else timeline.play();
      play.textContent = 'Pausar'; status.textContent = 'Apresentação em reprodução.';
    }
  });
  replay.addEventListener('click', () => {
    if (!timeline || reducedMotion.matches) return;
    timeline.restart(); play.textContent = 'Pausar'; status.textContent = 'Apresentação em reprodução.';
  });
  progress.addEventListener('input', () => {
    timeline.pause(Number(progress.value)); play.textContent = 'Continuar'; status.textContent = 'Apresentação pausada.';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && timeline && !timeline.paused()) { timeline.pause(); play.textContent = 'Continuar'; }
  });
  document.getElementById('return-link').addEventListener('click', (event) => {
    if (window.parent !== window) {
      event.preventDefault();
      window.parent.postMessage({ type: 'eme-select:close-intro' }, window.location.origin);
    }
  });
})();
