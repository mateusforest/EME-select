import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import gsap from 'gsap'

export interface PhotoActions { zoom: (direction: number) => void; reset: () => void }
interface Props { image: string; interior: boolean; view: string; markers: { id: string; label: string; x: number; y: number }[]; onSelect: (id: string) => void }
type Pose = { x: number; y: number; scale: number }

const PhotoExplorer = forwardRef<PhotoActions, Props>(function PhotoExplorer({ image, interior, view, markers, onSelect }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const photograph = useRef<HTMLImageElement>(null)
  const [failed, setFailed] = useState(false)
  const pose = useRef<Pose>({ x: 0, y: 0, scale: 1 })
  const desired = useRef<Pose>({ ...pose.current })
  const bounds = useRef({ width: 0, height: 0, imageWidth: 0, imageHeight: 0, naturalWidth: 0, naturalHeight: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const tween = useRef<gsap.core.Tween | null>(null)
  const activeView = useRef(view)
  activeView.current = view
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

  function constrain(value: Pose): Pose {
    const b = bounds.current
    const scale = Math.max(1, Math.min(2.3, value.scale))
    const mx = Math.max(0, (b.imageWidth * scale - b.width) / 2)
    const my = Math.max(0, (b.imageHeight * scale - b.height) / 2)
    return { scale, x: Math.max(-mx, Math.min(mx, value.x)), y: Math.max(-my, Math.min(my, value.y)) }
  }

  function draw() {
    if (!layer.current || !container.current) return
    layer.current.style.transform = `translate3d(${pose.current.x}px, ${pose.current.y}px, 0) scale(${pose.current.scale})`
    const b = bounds.current
    container.current.dataset.photoPose = JSON.stringify({ x: pose.current.x, y: pose.current.y, scale: pose.current.scale, imageWidth: b.imageWidth, imageHeight: b.imageHeight, viewportWidth: b.width, viewportHeight: b.height, naturalWidth: b.naturalWidth, naturalHeight: b.naturalHeight })
  }

  function move(next: Pose, duration = .55, ease = 'power3.out') {
    desired.current = constrain(next)
    tween.current?.kill()
    if (reduced() || duration === 0) { pose.current = { ...desired.current }; draw(); return }
    tween.current = gsap.to(pose.current, { ...desired.current, duration, ease, onUpdate: draw, onComplete: () => { tween.current = null } })
  }

  function frame(duration = 1.1) {
    const b = bounds.current
    if (!b.imageWidth) return
    const mobile = b.width < 650
    // The targets are areas of one photograph, not different spatial camera positions.
    const target = !interior || activeView.current === 'sala'
      ? { x: mobile ? .46 : .5, y: .53, scale: 1 }
      : activeView.current === 'varanda'
        ? { x: .745, y: .455, scale: mobile ? 1.08 : 1.32 }
        : { x: .30, y: .395, scale: mobile ? 1.18 : 1.75 }
    move({ x: (.5 - target.x) * b.imageWidth * target.scale, y: (.5 - target.y) * b.imageHeight * target.scale, scale: target.scale }, duration, 'power3.inOut')
  }

  function zoom(direction: number) {
    const scale = Math.max(1, Math.min(2.3, desired.current.scale + direction * .2))
    const factor = scale / desired.current.scale
    move({ x: desired.current.x * factor, y: desired.current.y * factor, scale }, .5)
  }

  function layout() {
    const element = container.current, img = photograph.current, visual = layer.current
    if (!element || !img?.naturalWidth || !visual) return
    const rect = element.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const previous = bounds.current
    const ratio = img.naturalWidth / img.naturalHeight
    const imageWidth = Math.max(rect.width, rect.height * ratio), imageHeight = imageWidth / ratio
    bounds.current = { width: rect.width, height: rect.height, imageWidth, imageHeight, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }
    visual.style.width = `${imageWidth}px`; visual.style.height = `${imageHeight}px`
    visual.style.left = `${(rect.width - imageWidth) / 2}px`; visual.style.top = `${(rect.height - imageHeight) / 2}px`
    if (!previous.imageWidth) frame(0)
    else move({ x: pose.current.x * imageWidth / previous.imageWidth, y: pose.current.y * imageHeight / previous.imageHeight, scale: pose.current.scale }, 0)
    element.dataset.status = 'ready'
  }

  useImperativeHandle(ref, () => ({ zoom, reset: () => frame() }))
  useEffect(() => { frame() }, [view])
  useLayoutEffect(() => {
    bounds.current = { width: 0, height: 0, imageWidth: 0, imageHeight: 0, naturalWidth: 0, naturalHeight: 0 }
    setFailed(false)
    if (container.current) container.current.dataset.status = 'loading'
    layout()
    const observer = new ResizeObserver(layout)
    observer.observe(container.current!)
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => { if (motion.matches) move({ ...desired.current }, 0) }
    motion.addEventListener('change', updateMotion)
    return () => { observer.disconnect(); tween.current?.kill(); pointers.current.clear(); motion.removeEventListener('change', updateMotion) }
  }, [image])

  function down(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button') || (event.pointerType === 'mouse' && event.button !== 0)) return
    tween.current?.kill(); desired.current = { ...pose.current }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.dataset.dragging = 'true'
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const before = [...pointers.current.values()]
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const after = [...pointers.current.values()]
      const priorDistance = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y)
      if (priorDistance < 1) return
      const distance = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y)
      const rect = event.currentTarget.getBoundingClientRect()
      const centerBefore = { x: (before[0].x + before[1].x) / 2 - rect.left - rect.width / 2, y: (before[0].y + before[1].y) / 2 - rect.top - rect.height / 2 }
      const centerAfter = { x: (after[0].x + after[1].x) / 2 - rect.left - rect.width / 2, y: (after[0].y + after[1].y) / 2 - rect.top - rect.height / 2 }
      const scale = Math.max(1, Math.min(2.3, desired.current.scale * distance / priorDistance))
      const factor = scale / desired.current.scale
      move({ scale, x: centerAfter.x - (centerBefore.x - desired.current.x) * factor, y: centerAfter.y - (centerBefore.y - desired.current.y) * factor }, .13)
    } else if (pointers.current.size === 1) {
      move({ ...desired.current, x: desired.current.x + event.clientX - previous.x, y: desired.current.y + event.clientY - previous.y }, .16)
    }
  }

  function up(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (!pointers.current.size) event.currentTarget.dataset.dragging = 'false'
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div ref={container} className="spatial-photo" data-photo-explorer data-status="loading" data-mode="photographic" onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} tabIndex={0} role="region" aria-label={interior ? 'Explorar a imagem do imóvel' : 'Explorar a imagem do cenário'} onKeyDown={event => {
    if ((event.target as HTMLElement).closest('button')) return
    if (event.key === 'Home') { event.preventDefault(); frame() }
    if (['+', '=', '-', '_'].includes(event.key)) { event.preventDefault(); zoom(event.key === '-' || event.key === '_' ? -1 : 1) }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      move({ ...desired.current, x: desired.current.x + (event.key === 'ArrowLeft' ? 55 : event.key === 'ArrowRight' ? -55 : 0), y: desired.current.y + (event.key === 'ArrowUp' ? 55 : event.key === 'ArrowDown' ? -55 : 0) }, .35)
    }
  }}>
    <div className="spatial-photo-layer" ref={layer}>
      <img ref={photograph} src={image} onLoad={layout} onError={() => { if (container.current) container.current.dataset.status = 'error'; setFailed(true) }} alt={interior ? 'Sala integrada à varanda, com cozinha ao fundo, no apartamento ilustrativo EME Select.' : 'Paisagem arquitetônica ilustrativa da coleção EME Select.'} draggable={false} fetchPriority="high" />
      {markers.map(marker => <button key={marker.id} className="spatial-photo-pin" aria-label={marker.label} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} onClick={() => onSelect(marker.id)}><span className="spatial-pin-label">{marker.label}</span><span className="spatial-pin-dot" aria-hidden="true">+</span></button>)}
    </div>
    {failed && <p className="photographic-interior__error" role="status">A imagem não carregou. Você pode acessar os detalhes do imóvel ou tentar novamente recarregando a página.</p>}
  </div>
})
export default PhotoExplorer
