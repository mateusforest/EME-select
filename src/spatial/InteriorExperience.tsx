import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Maximize2, Minimize2, Minus, Move, Plus, RotateCcw, Share2 } from 'lucide-react'
import gsap from 'gsap'
import { environmentById, type Property } from '../data'
import PhotoExplorer, { type PhotoActions } from './PhotoExplorer'
import './photographic-interior.css'

export default function InteriorExperience({ property, favorite, onFavorite, onBook, onShare }: { property: Property; favorite: boolean; onFavorite: () => void; onBook: () => void; onShare: () => void }) {
  const [room, setRoom] = useState('sala')
  const [expanded, setExpanded] = useState(false)
  const [fallbackExpanded, setFallbackExpanded] = useState(false)
  const page = useRef<HTMLElement>(null)
  const photo = useRef<PhotoActions>(null)
  const environment = environmentById(property.environment)
  useLayoutEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => { gsap.from('.tour-heading > *, .tour-back', { opacity: 0, y: 9, stagger: .07, duration: .75, ease: 'power2.out' }); gsap.from('.tour-bottom', { opacity: 0, y: 12, duration: .65, delay: .2 }) }, page)
    return () => ctx.revert()
  }, [])
  useEffect(() => {
    const update = () => setExpanded(Boolean(document.fullscreenElement))
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFallbackExpanded(false) }
    document.addEventListener('fullscreenchange', update); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('fullscreenchange', update); document.removeEventListener('keydown', escape) }
  }, [])
  useEffect(() => { if (!fallbackExpanded) return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous } }, [fallbackExpanded])
  async function fullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (fallbackExpanded) setFallbackExpanded(false)
    else { try { await page.current!.requestFullscreen() } catch { setFallbackExpanded(true) } }
  }
  return <main className={`tour-page tour-page--photographic${fallbackExpanded ? ' tour-page--overlay' : ''}`} data-photographic-interior ref={page} id="conteudo">
    <PhotoExplorer ref={photo} image="/assets/interior-living.png" interior view={room} markers={[]} onSelect={setRoom} />
    <div className="tour-shade" />
    <a className="tour-back" href={`#/ambientes/${property.environment}`}><ArrowLeft size={17} />Voltar para {environment.name}</a>
    <div className="tour-heading"><span className="eyebrow">{property.environment === 'urbano' ? 'Coleção Urbana' : `Coleção ${environment.name}`}</span><h1>{property.title}</h1><p>{property.area} m² <span>·</span> {property.bedrooms} quartos <span>·</span> {property.parking} vagas</p></div>
    <div className="tour-side-actions"><button className="icon-button" aria-label={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'} aria-pressed={favorite} onClick={onFavorite}><Heart size={20} fill={favorite ? 'currentColor' : 'none'} /></button><button className="icon-button" aria-label="Compartilhar imóvel" onClick={onShare}><Share2 size={19} /></button><button className="icon-button" aria-label={expanded || fallbackExpanded ? 'Sair da tela cheia' : 'Tela cheia'} aria-pressed={expanded || fallbackExpanded} onClick={fullscreen}>{expanded || fallbackExpanded ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button></div>
    <div className="photographic-interior__controls">
      <div className="photographic-interior__toolbar" role="group" aria-label="Controles da imagem">
        <button className="photographic-interior__reset" aria-label="Centralizar imagem" onClick={() => photo.current?.reset()}><RotateCcw size={15} strokeWidth={1.5} /><span>Restaurar enquadramento</span></button>
        <span className="photographic-interior__divider" aria-hidden="true" />
        <button aria-label="Afastar imagem" onClick={() => photo.current?.zoom(-1)}><Minus size={17} /></button>
        <button aria-label="Aproximar imagem" onClick={() => photo.current?.zoom(1)}><Plus size={17} /></button>
      </div>
      <p><Move size={12} /><span>Arraste para explorar a imagem</span></p>
    </div>
    <div className="tour-bottom"><div className="tour-room-nav"><span className="eyebrow">Um olhar pelos espaços</span><nav aria-label="Espaços do imóvel">{['sala', 'varanda', 'cozinha'].map(name => <button key={name} aria-pressed={room === name} onClick={() => setRoom(name)}>{name === 'sala' ? 'Sala' : name === 'varanda' ? 'Varanda' : 'Cozinha'}</button>)}</nav><small>Enquadramentos da mesma imagem · imóvel ilustrativo</small></div><div className="tour-cta"><a href={`#/imovel/${property.id}`}>Detalhes e curadoria <ArrowRight size={17} /></a><button onClick={onBook}>Agendar visita <ArrowUpRight size={18} /></button></div></div>
  </main>
}
