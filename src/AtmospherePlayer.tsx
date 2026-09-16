import { useEffect, useRef, useState } from 'react';
import { ListMusic, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import './atmosphere-player.css';

type Track = { id: string; title: string; artist?: string; src: string };
const volumeKey = 'eme-select:audio-volume';
function savedVolume() {
  try {
    const saved = localStorage.getItem(volumeKey);
    const value = saved === null ? 0.35 : Number(saved);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.35;
  } catch { return 0.35; }
}

export default function AtmospherePlayer({ suspended = false }: { suspended?: boolean }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [volume, setVolume] = useState(savedVolume);
  const [deviceVolume, setDeviceVolume] = useState(false);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const volumeButton = useRef<HTMLButtonElement>(null);
  const request = useRef(0);
  const activeIndex = useRef(0);
  const restoreVolume = useRef(volume || 0.35);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/audio/playlist.json', { signal: controller.signal, cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) return;
        const manifest = await response.json();
        if (controller.signal.aborted || !Array.isArray(manifest.tracks)) return;
        const ids = new Set<string>();
        setTracks(manifest.tracks.filter((track: Track) => {
          if (!track || typeof track.id !== 'string' || !track.id || ids.has(track.id) || typeof track.title !== 'string' || !track.title.trim()) return false;
          if (typeof track.src !== 'string' || !/^\/audio\/[a-zA-Z0-9/_-]+\.(mp3|m4a|ogg|wav)$/i.test(track.src)) return false;
          if (track.artist !== undefined && typeof track.artist !== 'string') return false;
          ids.add(track.id);
          return true;
        }).slice(0, 100));
      }).catch(() => { /* No public player until a playlist is available. */ });
    return () => { controller.abort(); request.current++; };
  }, []);

  useEffect(() => {
    if (suspended) setOpen(false); // Close only controls; playback belongs to the persistent header.
  }, [suspended]);

  useEffect(() => {
    if (!audio.current) return;
    audio.current.muted = volume === 0;
    audio.current.volume = volume;
    setDeviceVolume(Math.abs(audio.current.volume - volume) > 0.01);
    if (volume > 0) restoreVolume.current = volume;
    try { localStorage.setItem(volumeKey, String(volume)); } catch { /* Optional preference. */ }
  }, [volume, tracks.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    const player = audio.current;
    return () => { request.current++; player?.pause(); };
  }, [tracks.length]);

  async function playTrack(nextIndex: number) {
    const player = audio.current;
    const track = tracks[nextIndex];
    if (!player || !track) return;
    const attempt = ++request.current;
    activeIndex.current = nextIndex;
    setIndex(nextIndex);
    setError('');
    setWaiting(true);
    if (player.getAttribute('src') !== track.src) {
      player.src = track.src;
      player.load();
    }
    try { await player.play(); }
    catch {
      if (attempt !== request.current) return;
      setWaiting(false);
      setPlaying(false);
      setError('Não foi possível tocar esta faixa. Tente novamente ou escolha outra.');
    }
  }

  function togglePlay() {
    if (playing || waiting) {
      request.current++;
      audio.current?.pause();
      setWaiting(false);
    } else { void playTrack(activeIndex.current); }
  }

  function changeTrack(step: number) {
    if (!tracks.length) return;
    void playTrack((activeIndex.current + step + tracks.length) % tracks.length);
  }

  function close() { setOpen(false); volumeButton.current?.focus(); }
  const track = tracks[index];
  // Hide dead controls until authorized audio files have been supplied.
  if (!track) return null;
  const previous = <button type="button" onClick={() => changeTrack(-1)} disabled={tracks.length < 2} aria-label="Faixa anterior"><SkipBack size={16} /></button>;
  const next = <button type="button" onClick={() => changeTrack(1)} disabled={tracks.length < 2} aria-label="Próxima faixa"><SkipForward size={16} /></button>;

  return <div className="eme-atmosphere" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); close(); }
  }}>
    <audio ref={audio} preload="none" onPlaying={() => { setPlaying(true); setWaiting(false); setError(''); }} onPause={() => setPlaying(false)} onWaiting={() => { if (!audio.current?.paused) setWaiting(true); }} onEnded={() => changeTrack(1)} onError={() => {
      setPlaying(false); setWaiting(false); setError('Esta faixa está indisponível. Escolha outra ou tente novamente.');
    }} />
    <div className="eme-atmosphere-controls" role="group" aria-label="Música ambiente">
      <span className="eme-atmosphere-caption">Atmosfera <b>EME</b></span>
      <span className="eme-atmosphere-skip">{previous}</span>
      <button type="button" className="eme-atmosphere-play" aria-label={playing || waiting ? 'Pausar música' : 'Reproduzir música'} aria-busy={waiting} onClick={togglePlay}>{playing || waiting ? <Pause size={17} /> : <Play size={17} />}</button>
      <span className="eme-atmosphere-skip">{next}</span>
      <button ref={volumeButton} type="button" aria-label="Volume e playlist" aria-expanded={open} aria-controls="eme-atmosphere-panel" onClick={() => setOpen(value => !value)}>{volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
    </div>
    {error && !open && <span className="eme-atmosphere-error" role="status">Áudio indisponível. Abra a playlist para tentar outra faixa.</span>}
    {open && <section className="eme-atmosphere-panel" id="eme-atmosphere-panel" aria-label="Volume e playlist Atmosfera EME">
      <div className="eme-atmosphere-heading"><div><span>ATMOSFERA EME</span><h2>{track.title}</h2>{track.artist && <p>{track.artist}</p>}</div><button type="button" onClick={close} aria-label="Fechar controles de música"><X size={18} /></button></div>
      <div className="eme-atmosphere-mobile-skip">{previous}<span>{index + 1} / {tracks.length}</span>{next}</div>
      <div className="eme-atmosphere-volume"><button type="button" aria-label={volume === 0 ? 'Ativar som' : 'Silenciar música'} onClick={() => setVolume(volume === 0 ? restoreVolume.current : 0)}>{volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><label htmlFor="eme-music-volume" className="sr-only">Volume da música</label><input id="eme-music-volume" type="range" disabled={deviceVolume} min="0" max="100" value={Math.round(volume * 100)} onChange={event => setVolume(Number(event.target.value) / 100)} /><output htmlFor="eme-music-volume">{deviceVolume ? 'Dispositivo' : Math.round(volume * 100) + '%'}</output></div>
      {deviceVolume && <p className="eme-atmosphere-note">Neste navegador, ajuste a intensidade do som pelos botões do dispositivo.</p>}
      {error && <p className="eme-atmosphere-message" role="status">{error}</p>}
      <div className="eme-atmosphere-list-title"><ListMusic size={15} /><span>Sua trilha</span></div>
      <ol className="eme-atmosphere-list">{tracks.map((item, position) => <li key={item.id}><button type="button" aria-current={index === position ? 'true' : undefined} onClick={() => void playTrack(position)}><span>{String(position + 1).padStart(2, '0')}</span><span>{item.title}{item.artist && <small>{item.artist}</small>}</span>{index === position && playing && <Volume2 size={14} />}</button></li>)}</ol>
      <p className="eme-atmosphere-note">Feche os controles e continue explorando. A música acompanha você.</p>
    </section>}
  </div>;
}
