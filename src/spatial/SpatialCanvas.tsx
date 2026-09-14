import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import gsap from 'gsap'
import type { EnvironmentId } from '../data'
import type { CameraPose, SpatialScene } from './types'

export interface SpatialActions { zoom: (direction: number) => void; reset: () => void }
interface Props {
  environment: EnvironmentId
  interior: boolean
  view: string
  onReady: () => void
  onFail: () => void
  onSelect: (id: string) => void
  onStats: (stats: { camera: string; meshes: number; triangles: number }) => void
}

const SpatialCanvas = forwardRef<SpatialActions, Props>(function SpatialCanvas(props, ref) {
  const mount = useRef<HTMLDivElement>(null)
  const callbacks = useRef(props)
  callbacks.current = props
  const controlsRef = useRef<SpatialActions & { view: (name: string) => void } | null>(null)
  useImperativeHandle(ref, () => ({ zoom: direction => controlsRef.current?.zoom(direction), reset: () => controlsRef.current?.reset() }), [])
  useEffect(() => { controlsRef.current?.view(props.view) }, [props.view])

  useEffect(() => {
    const container = mount.current!
    let cancelled = false
    let teardown: (() => void) | undefined
    const init = async () => {
      let model: SpatialScene | undefined
      let renderer: THREE.WebGLRenderer | undefined
      let environmentMap: THREE.WebGLRenderTarget | undefined
      let sourceEnvironment: RoomEnvironment | undefined
      let pmrem: THREE.PMREMGenerator | undefined
      const cleanupMaterials = () => {
        if (!model) return
        const geometries = new Set<THREE.BufferGeometry>()
        const materials = new Set<THREE.Material>()
        const textures = new Set<THREE.Texture>()
        model.group.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return
          geometries.add(object.geometry)
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(material)
            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value) })
          }
        })
        geometries.forEach(value => value.dispose())
        materials.forEach(value => value.dispose())
        textures.forEach(value => value.dispose())
        model.dispose?.()
      }
      try {
        model = props.interior
          ? (await import('./interior')).buildInteriorScene()
          : (await import('./exterior')).buildExteriorScene(props.environment)
        if (cancelled) { cleanupMaterials(); return }
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 650 ? 1.25 : 1.6))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = props.interior ? 1.03 : 1.1
        renderer.outputColorSpace = THREE.SRGBColorSpace
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(props.interior ? model.clearColor : '#f6f4ec')
        scene.add(model.group)
        pmrem = new THREE.PMREMGenerator(renderer)
        sourceEnvironment = new RoomEnvironment()
        environmentMap = pmrem.fromScene(sourceEnvironment, .04)
        scene.environment = environmentMap.texture
        scene.environmentIntensity = props.interior ? .65 : .45
        sourceEnvironment.dispose()
        pmrem.dispose()
        const hemisphere = new THREE.HemisphereLight('#f6f4ed', '#b4aa96', props.interior ? .8 : 1.7)
        scene.add(hemisphere)
        const sunlight = new THREE.DirectionalLight('#fff1d8', props.interior ? 3.5 : 3.2)
        sunlight.position.set(...(props.interior ? [8, 7, -12] : [-10, 22, 14]) as [number, number, number])
        sunlight.castShadow = true
        sunlight.shadow.mapSize.set(2048, 2048)
        sunlight.shadow.camera.left = -24
        sunlight.shadow.camera.right = 24
        sunlight.shadow.camera.top = 24
        sunlight.shadow.camera.bottom = -24
        sunlight.shadow.camera.near = .5
        sunlight.shadow.camera.far = 80
        sunlight.shadow.normalBias = .025
        sunlight.shadow.bias = -.00012
        scene.add(sunlight)
        const camera = new THREE.PerspectiveCamera(40, 1, .08, 220)
        const target = new THREE.Vector3()
        const fitPose = (pose: CameraPose): CameraPose => {
          if (props.interior || innerWidth > 600) return pose
          const target = new THREE.Vector3(...pose.target)
          const position = new THREE.Vector3(...pose.position).sub(target).multiplyScalar(1.25).add(target)
          return { ...pose, position: position.toArray() as [number, number, number] }
        }
        const homePose = () => fitPose(model!.views[callbacks.current.view] || model!.views.overview)
        const place = (pose: CameraPose) => {
          camera.position.fromArray(pose.position)
          target.fromArray(pose.target)
          camera.fov = pose.fov || (props.interior ? 65 : 39)
          camera.updateProjectionMatrix()
          camera.lookAt(target)
        }
        place(homePose())
        const canvas = renderer.domElement
        canvas.tabIndex = 0
        canvas.setAttribute('aria-label', props.interior ? 'Interior em 3D. Arraste para olhar ao redor. Use as setas para girar e as teclas mais e menos para aproximar.' : 'Cenário em 3D. Arraste para girar. Use as setas para girar, mais e menos para aproximar e Home para centralizar.')
        canvas.setAttribute('role', 'img')
        container.appendChild(canvas)
        const pinLayer = document.createElement('div')
        pinLayer.className = 'spatial-pins'
        container.appendChild(pinLayer)
        const pins = model.hotspots.map(pin => {
          const button = document.createElement('button')
          button.className = 'spatial-pin'
          button.type = 'button'
          button.setAttribute('aria-label', props.interior ? `Ir para ${pin.label.toLocaleLowerCase('pt-BR')}` : pin.label)
          const label = document.createElement('span')
          label.className = 'spatial-pin-label'
          label.textContent = pin.label
          const dot = document.createElement('span')
          dot.className = 'spatial-pin-dot'
          dot.textContent = '+'
          dot.setAttribute('aria-hidden', 'true')
          button.append(label, dot)
          button.onclick = () => callbacks.current.onSelect(pin.id)
          pinLayer.appendChild(button)
          return { button, position: new THREE.Vector3(...pin.position) }
        })
        let width = 1, height = 1
        let frame = 0
        let settling = 0
        let visible = true
        let lost = false
        let moving = false
        let poseTween: gsap.core.Tween | undefined
        let lookTween: gsap.core.Tween | undefined
        let orbit: OrbitControls | undefined
        const reduced = matchMedia('(prefers-reduced-motion: reduce)')
        let meshCount = 0
        model.group.traverse(object => { if (object instanceof THREE.Mesh) meshCount++ })
        const projection = new THREE.Vector3()
        const schedule = () => { if (!frame && !lost && visible && !cancelled && !document.hidden) frame = requestAnimationFrame(draw) }
        const draw = () => {
          frame = 0
          if (lost || cancelled || !visible || document.hidden) return
          if (orbit && !moving) { orbit.update(); target.copy(orbit.target) }
          camera.lookAt(target)
          renderer!.render(scene, camera)
          pins.forEach(pin => {
            projection.copy(pin.position).project(camera)
            const inside = projection.z > -1 && projection.z < 1 && Math.abs(projection.x) < .93 && Math.abs(projection.y) < .88
            pin.button.hidden = !inside
            if (inside) pin.button.style.transform = `translate(${(projection.x * .5 + .5) * width}px, ${(-projection.y * .5 + .5) * height}px) translate(-50%, -100%)`
          })
          callbacks.current.onStats({ camera: JSON.stringify({ position: camera.position.toArray(), target: target.toArray(), fov: camera.fov }), meshes: meshCount, triangles: renderer!.info.render.triangles })
          if (moving || lookTween?.isActive() || settling-- > 0) schedule()
        }
        if (!props.interior) {
          orbit = new OrbitControls(camera, canvas)
          orbit.target.copy(target)
          orbit.enableDamping = !reduced.matches
          orbit.dampingFactor = .09
          orbit.rotateSpeed = .48
          orbit.zoomSpeed = .62
          orbit.enablePan = false
          orbit.minPolarAngle = Math.PI * .14
          orbit.maxPolarAngle = Math.PI * .46
          const distance = camera.position.distanceTo(target)
          orbit.minDistance = distance * .52
          orbit.maxDistance = distance * 1.48
          orbit.addEventListener('change', schedule)
          orbit.addEventListener('start', () => { poseTween?.kill(); moving = false; settling = 100; schedule() })
          orbit.addEventListener('end', () => { settling = 100; schedule() })
          orbit.update()
        }
        const stop = () => { poseTween?.kill(); lookTween?.kill(); moving = false; if (orbit) { orbit.enabled = true; orbit.enableDamping = false; orbit.update(); orbit.enableDamping = !reduced.matches } }
        const fly = (pose: CameraPose) => {
          stop()
          if (orbit) { const distance = new THREE.Vector3(...pose.position).distanceTo(new THREE.Vector3(...pose.target)); orbit.minDistance = distance * .52; orbit.maxDistance = distance * 1.48 }
          const state = { x: camera.position.x, y: camera.position.y, z: camera.position.z, tx: target.x, ty: target.y, tz: target.z, fov: camera.fov }
          moving = true
          if (orbit) orbit.enabled = false
          poseTween = gsap.to(state, {
            x: pose.position[0], y: pose.position[1], z: pose.position[2], tx: pose.target[0], ty: pose.target[1], tz: pose.target[2], fov: pose.fov || (props.interior ? 65 : 39),
            duration: reduced.matches ? 0 : props.interior ? 1.45 : .9, ease: 'power2.inOut',
            onUpdate: () => { camera.position.set(state.x, state.y, state.z); target.set(state.tx, state.ty, state.tz); camera.fov = state.fov; camera.updateProjectionMatrix(); orbit?.target.copy(target); schedule() },
            onComplete: () => { moving = false; if (orbit) { orbit.enabled = true; orbit.update() } schedule() },
          })
          schedule()
        }
        const zoom = (direction: number) => {
          stop()
          if (props.interior) {
            const fov = THREE.MathUtils.clamp(camera.fov - direction * 6, 38, 78)
            const state = { fov: camera.fov }
            poseTween = gsap.to(state, { fov, duration: reduced.matches ? 0 : .4, ease: 'power2.out', onUpdate: () => { camera.fov = state.fov; camera.updateProjectionMatrix(); schedule() } })
          } else {
            const offset = camera.position.clone().sub(target)
            const next = THREE.MathUtils.clamp(offset.length() * (direction > 0 ? .82 : 1.22), orbit!.minDistance, orbit!.maxDistance)
            offset.setLength(next).add(target)
            const state = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
            moving = true
            poseTween = gsap.to(state, { x: offset.x, y: offset.y, z: offset.z, duration: reduced.matches ? 0 : .38, ease: 'power2.out', onUpdate: () => { camera.position.set(state.x, state.y, state.z); schedule() }, onComplete: () => { moving = false; schedule() } })
          }
        }
        const look = { yaw: 0, pitch: 0, radius: 1 }
        const desiredLook = { yaw: 0, pitch: 0 }
        const readLook = () => { const delta = target.clone().sub(camera.position); look.radius = delta.length(); look.yaw = Math.atan2(delta.x, -delta.z); look.pitch = Math.asin(delta.y / look.radius) }
        const applyLook = () => { target.set(camera.position.x + Math.sin(look.yaw) * Math.cos(look.pitch) * look.radius, camera.position.y + Math.sin(look.pitch) * look.radius, camera.position.z - Math.cos(look.yaw) * Math.cos(look.pitch) * look.radius); schedule() }
        const pointers = new Map<number, { x: number; y: number }>()
        let pinchDistance = 0
        const pointerDown = (event: PointerEvent) => {
          if (!props.interior) return
          stop(); readLook(); desiredLook.yaw = look.yaw; desiredLook.pitch = look.pitch
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
          canvas.setPointerCapture(event.pointerId)
          canvas.classList.add('is-dragging')
          if (pointers.size === 2) { const values = [...pointers.values()]; pinchDistance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y) }
        }
        const pointerMove = (event: PointerEvent) => {
          const previous = pointers.get(event.pointerId)
          if (!previous) return
          const dx = event.clientX - previous.x, dy = event.clientY - previous.y
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
          if (pointers.size === 2) {
            const values = [...pointers.values()]
            const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y)
            if (pinchDistance) { camera.fov = THREE.MathUtils.clamp(camera.fov * pinchDistance / distance, 38, 78); camera.updateProjectionMatrix(); schedule() }
            pinchDistance = distance
          } else {
            desiredLook.yaw -= dx * .004
            desiredLook.pitch = THREE.MathUtils.clamp(desiredLook.pitch + dy * .003, -.7, .6)
            lookTween?.kill()
            lookTween = gsap.to(look, { yaw: desiredLook.yaw, pitch: desiredLook.pitch, duration: reduced.matches ? 0 : .16, ease: 'power2.out', onUpdate: applyLook })
          }
        }
        const pointerUp = (event: PointerEvent) => { pointers.delete(event.pointerId); pinchDistance = 0; if (!pointers.size) canvas.classList.remove('is-dragging'); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId) }
        const wheel = (event: WheelEvent) => { if (!props.interior) return; event.preventDefault(); zoom(event.deltaY < 0 ? 1 : -1) }
        const keyboard = (event: KeyboardEvent) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return
          event.preventDefault()
          if (event.key === 'Home') { fly(homePose()); return }
          if (['+', '=', '-'].includes(event.key)) { zoom(event.key === '-' ? -1 : 1); return }
          stop()
          const dx = event.key === 'ArrowLeft' ? -.12 : event.key === 'ArrowRight' ? .12 : 0
          const dy = event.key === 'ArrowUp' ? .08 : event.key === 'ArrowDown' ? -.08 : 0
          if (props.interior) { readLook(); look.yaw += dx; look.pitch = THREE.MathUtils.clamp(look.pitch + dy, -.7, .6); applyLook() }
          else { const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target)); spherical.theta += dx; spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy, orbit!.minPolarAngle, orbit!.maxPolarAngle); camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(target)); orbit!.update(); schedule() }
        }
        const resize = () => {
          const bounds = container.getBoundingClientRect()
          width = Math.max(1, bounds.width); height = Math.max(1, bounds.height)
          renderer!.setSize(width, height)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          schedule()
        }
        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(container)
        const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) schedule() }, { rootMargin: '80px' })
        intersection.observe(container)
        const visibility = () => { if (!document.hidden) schedule() }
        const contextLost = (event: Event) => { event.preventDefault(); lost = true; stop(); callbacks.current.onFail() }
        const mediaChange = () => { if (orbit) orbit.enableDamping = !reduced.matches; if (reduced.matches && poseTween?.isActive()) poseTween.progress(1); schedule() }
        canvas.addEventListener('webglcontextlost', contextLost)
        canvas.addEventListener('pointerdown', pointerDown)
        canvas.addEventListener('pointermove', pointerMove)
        canvas.addEventListener('pointerup', pointerUp)
        canvas.addEventListener('pointercancel', pointerUp)
        canvas.addEventListener('lostpointercapture', pointerUp)
        canvas.addEventListener('wheel', wheel, { passive: false })
        canvas.addEventListener('keydown', keyboard)
        document.addEventListener('visibilitychange', visibility)
        reduced.addEventListener('change', mediaChange)
        controlsRef.current = { zoom, reset: () => fly(homePose()), view: name => fly(fitPose(model!.views[name] || model!.views.overview)) }
        resize()
        renderer.render(scene, camera)
        callbacks.current.onReady()
        schedule()
        teardown = () => {
          stop(); cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect(); orbit?.dispose()
          document.removeEventListener('visibilitychange', visibility)
          reduced.removeEventListener('change', mediaChange)
          canvas.removeEventListener('webglcontextlost', contextLost)
          canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove)
          canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('lostpointercapture', pointerUp)
          canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('keydown', keyboard)
          cleanupMaterials(); environmentMap?.dispose(); renderer!.dispose(); renderer!.forceContextLoss()
          canvas.remove(); pinLayer.remove(); controlsRef.current = null
        }
      } catch (error) {
        cleanupMaterials(); environmentMap?.dispose(); sourceEnvironment?.dispose(); pmrem?.dispose(); renderer?.dispose()
        if (!cancelled) { console.warn('Visualização espacial indisponível.', error); callbacks.current.onFail() }
      }
    }
    void init()
    return () => { cancelled = true; teardown?.() }
  }, [props.environment, props.interior])
  return <div ref={mount} className="spatial-world" />
})

export default SpatialCanvas
