import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Volume2, X } from 'lucide-react';
import './atmosphere-player.css';

const playlistUrl = 'https://open.spotify.com/playlist/79BMpNy8NQiujxA5qVUGJy';
const embedUrl = 'https://open.spotify.com/embed/playlist/79BMpNy8NQiujxA5qVUGJy?utm_source=generator&theme=0';

export default function AtmospherePlayer({ suspended = false }: { suspended?: boolean }) {
  const [open, setOpen] = useState(false);
  const [volumeHelp, setVolumeHelp] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function close() {
    // Removing the official player stops its audio; closing must never leave hidden music playing.
    setOpen(false);
    setVolumeHelp(false);
    trigger.current?.focus();
  }

  useEffect(() => { if (suspended) setOpen(false); }, [suspended]);
  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setSlow(false);
    const timeout = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [open]);

  return <div className="eme-atmosphere" onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); close(); }
  }}>
    <button ref={trigger} type="button" className="eme-atmosphere-trigger" aria-label={open ? 'Fechar playlist e parar música' : 'Abrir playlist Atmosfera EME'} aria-expanded={open} aria-controls="eme-atmosphere-panel" onClick={() => open ? close() : setOpen(true)}>
      <Volume2 size={18} strokeWidth={1.5} aria-hidden="true" />
      <span>Atmosfera <b>EME</b></span>
    </button>
    {open && <section className="eme-atmosphere-panel" id="eme-atmosphere-panel" aria-label="Atmosfera EME — playlist do Spotify">
      <div className="eme-atmosphere-heading">
        <div><span className="eme-atmosphere-eyebrow">SUA VISITA, NO SEU RITMO</span><h2>Atmosfera EME</h2></div>
        <button type="button" className="eme-atmosphere-close" onClick={close} aria-label="Fechar playlist e parar música"><X size={18} /></button>
      </div>
      <p className="eme-atmosphere-intro">Uma seleção para acompanhar sua descoberta. Dê o play quando quiser.</p>
      <div className="eme-atmosphere-embed">
        {!loaded && <p className="eme-atmosphere-loading" role="status">{slow ? 'O Spotify está demorando. Você também pode abrir a playlist pelo link abaixo.' : 'Carregando playlist…'}</p>}
        <iframe src={embedUrl} title="Playlist Atmosfera EME no Spotify" width="100%" height="352" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoaded(true)} />
      </div>
      <div className="eme-atmosphere-tools">
        <button type="button" aria-expanded={volumeHelp} aria-controls="eme-atmosphere-volume" onClick={() => setVolumeHelp(value => !value)}><Volume2 size={16} aria-hidden="true" /> Volume</button>
        <a href={playlistUrl} target="_blank" rel="noopener noreferrer">Abrir no Spotify <ArrowUpRight size={15} /></a>
      </div>
      {volumeHelp && <p className="eme-atmosphere-volume" id="eme-atmosphere-volume">Ajuste o volume pelos controles do seu celular ou computador. O player incorporado do Spotify não permite um controle de volume separado neste site.</p>}
      <p className="eme-atmosphere-note">A reprodução segue as condições do Spotify. Ao fechar este painel, a música para.</p>
    </section>}
  </div>;
}
