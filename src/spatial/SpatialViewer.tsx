import { lazy, Suspense, useRef, useState } from 'react'
import { Box, Compass, Image, Minus, Move, Plus } from 'lucide-react'
import gsap from 'gsap'
import PhotoExplorer from './PhotoExplorer'
import type { SpatialActions } from './SpatialCanvas'
import type { Environment } from '../data'
import './spatial.css'

const SpatialCanvas = lazy(() => import('./SpatialCanvas'))
export default function SpatialViewer({ environment, image, interior = false, view = 'overview', onSelect }: { environment: Environment; image: string; interior?: boolean; view?: string; onSelect: (id: string) => void }) {
  const [mode, setMode] = useState<'3d' | 'photo'>('3d')
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [attempt, setAttempt] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const world = useRef<SpatialActions>(null)
  const photo = useRef<SpatialActions>(null)
  const isPhoto = mode === 'photo' || status === 'fallback'
  const active = () => isPhoto ? photo.current : world.current
  const reveal = () => { setStatus('ready'); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(root.current?.querySelector('.spatial-world') || {}, { opacity: 0 }, { opacity: 1, duration: .85, ease: 'power2.out' }) }
  return <div ref={root} className={`spatial-viewer${interior ? ' spatial-viewer--interior' : ''}${isPhoto ? ' spatial-viewer--photo' : ''}`} data-spatial-viewer data-status={status} data-mode={isPhoto ? 'photo' : '3d'}>
    {!isPhoto && <Suspense fallback={null}><SpatialCanvas key={attempt} ref={world} environment={environment.id} interior={interior} view={view} onReady={reveal} onFail={() => setStatus('fallback')} onSelect={onSelect} onStats={stats => { if (!root.current) return; root.current.dataset.camera = stats.camera; root.current.dataset.meshes = String(stats.meshes); root.current.dataset.triangles = String(stats.triangles) }} /></Suspense>}
    {(isPhoto || status === 'loading') && <PhotoExplorer ref={photo} image={image} interior={interior} view={view} markers={isPhoto && !interior ? environment.markers.map(marker => ({ id: marker.propertyId, label: marker.label, x: marker.x, y: marker.y })) : []} onSelect={onSelect} />}
    {status === 'loading' && !isPhoto && <div className="spatial-loading" role="status"><span />Preparando o ambiente</div>}
    <div className="spatial-caption"><span className="spatial-status-dot" />{isPhoto ? 'Imagem ilustrativa' : 'Cenário conceitual em 3D'}</div>
    {status === 'fallback' && <p className="spatial-fallback" role="status">A visualização em imagem está disponível neste dispositivo.</p>}
    <div className="spatial-toolbar">
      <button className="spatial-mode" onClick={() => { if (isPhoto) { setStatus('loading'); setAttempt(value => value + 1); setMode('3d') } else setMode('photo') }}>{isPhoto ? <Box size={15} /> : <Image size={15} />}{isPhoto ? 'Explorar em 3D' : 'Ver imagem'}</button>
      <div className="spatial-zoom" role="group" aria-label="Controles da visualização"><button aria-label="Afastar cenário" onClick={() => active()?.zoom(-1)}><Minus size={17} /></button><button aria-label="Aproximar cenário" onClick={() => active()?.zoom(1)}><Plus size={17} /></button><span /><button aria-label="Centralizar cenário" onClick={() => active()?.reset()}><Compass size={20} strokeWidth={1.4} /></button></div>
    </div>
    <p className="spatial-hint"><Move size={13} /><span>{isPhoto ? 'Arraste para explorar a imagem' : interior ? 'Arraste para olhar ao redor' : 'Arraste para girar o cenário'}</span></p>
  </div>
}
