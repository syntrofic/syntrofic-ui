import {
  BoxGeometry, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, GridHelper, Group,
  InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Points, PointsMaterial,
  Scene, Spherical, Vector3, WebGLRenderer, type Material, type Object3D,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { prefersReducedMotion, themeTempo } from '../internal/motion'
import { resolveMotionSpring, solveSpring } from '../internal/motion-physics'
import type { ChartRange } from './types'
import { clamp, domainFor, finite, fraction, numberAt } from './values'

export type SpatialMark = 'scatter' | 'bars' | 'surface'
export interface SpatialPoint {
  id: string
  label?: string
  x: number
  y: number
  z: number
  color?: string
}
export interface SpatialView { azimuth: number; elevation: number; distance: number }
export interface SpatialDomains { x?: ChartRange; y?: ChartRange; z?: ChartRange }
export interface SpatialStyle { domains?: SpatialDomains; pointSize?: number; barWidth?: number; opacity?: number; wireframe?: boolean }

const origin = new Vector3(0, .7, 0)
const initialOffset = new Vector3(2.65, 1.5, 3.1)
export const initialSpatialView: Readonly<SpatialView> = Object.freeze({
  azimuth: Math.atan2(initialOffset.x, initialOffset.z), elevation: Math.asin(initialOffset.y / initialOffset.length()), distance: initialOffset.length(),
})
export function spatialView(view: Partial<SpatialView> = {}): SpatialView {
  return {
    azimuth: numberAt(view.azimuth, initialSpatialView.azimuth),
    elevation: clamp(numberAt(view.elevation, initialSpatialView.elevation), -Math.PI / 2 + .02, Math.PI / 2 - .02),
    distance: clamp(numberAt(view.distance, initialSpatialView.distance), 2.2, 12),
  }
}
export function placeSpatialCamera(camera: PerspectiveCamera, view: SpatialView) {
  const pose = spatialView(view)
  camera.position.setFromSphericalCoords(pose.distance, Math.PI / 2 - pose.elevation, pose.azimuth).add(origin)
  camera.lookAt(origin)
  camera.updateMatrixWorld()
}

export function spatialData(rows: readonly SpatialPoint[], mark: SpatialMark, primary: string, secondary: string, domains: SpatialDomains = {}) {
  const data = rows.filter(point => [point.x, point.y, point.z].every(finite))
  const xs = domainFor(data.map(point => point.x), domains.x)
  const ys = domainFor(data.map(point => point.y), domains.y, mark === 'bars')
  const zs = domainFor(data.map(point => point.z), domains.z)
  const positions = data.map(({ x, y, z }) => new Vector3(
    fraction(x, xs) * 1.8 - .9, fraction(y, ys) * 1.5 + .02, fraction(z, zs) * 1.8 - .9,
  ))
  const main = new Color(primary)
  const highlight = new Color(secondary)
  const colors = data.map(point => point.color ? new Color(point.color) : main.clone().lerp(highlight, clamp(fraction(point.y, ys), 0, 1)))
  return { data, positions, colors, baseline: clamp(fraction(0, ys), 0, 1) * 1.5 }
}
export function spatialBarWidth(length: number, width?: number) {
  return clamp(numberAt(width, Math.min(.21, 1.6 / Math.sqrt(Math.max(1, length)))), .035, .6)
}

function dispose(object: Object3D) {
  object.traverse(node => {
    const part = node as Partial<Mesh>
    part.geometry?.dispose()
    const materials = part.material ? ([] as Material[]).concat(part.material) : []
    for (const material of materials) material.dispose()
    if (node instanceof InstancedMesh) node.dispose()
  })
}

function pointsMesh(positions: Vector3[], colors: Color[], style: SpatialStyle) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions.flatMap(point => point.toArray()), 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors.flatMap(color => color.toArray()), 3))
  const opacity = clamp(numberAt(style.opacity, 1), 0, 1)
  return new Points(geometry, new PointsMaterial({ size: clamp(numberAt(style.pointSize, .12), .01, 1), vertexColors: true, opacity, transparent: opacity < 1 }))
}

function barsMesh(positions: Vector3[], colors: Color[], baseline: number, style: SpatialStyle) {
  const opacity = clamp(numberAt(style.opacity, 1), 0, 1)
  const bars = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ opacity, transparent: opacity < 1 }), positions.length)
  const side = spatialBarWidth(positions.length, style.barWidth)
  const matrix = new Matrix4()
  positions.forEach(({ x, y, z }, index) => {
    matrix.makeScale(side, Math.max(.008, Math.abs(y - baseline)), side)
    matrix.setPosition(x, (y + baseline) / 2, z)
    bars.setMatrixAt(index, matrix)
    bars.setColorAt(index, colors[index])
  })
  if (bars.instanceColor) bars.instanceColor.needsUpdate = true
  return bars
}

export function spatialTriangles(source: readonly SpatialPoint[]) {
  const x = [...new Set(source.map(point => point.x))].sort((a, b) => a - b)
  const z = [...new Set(source.map(point => point.z))].sort((a, b) => a - b)
  const indexByX = new Map(x.map((value, index) => [value, index]))
  const indexByZ = new Map(z.map((value, index) => [value, index]))
  const indices = new Map(source.map((point, index) => [indexByX.get(point.x)! + ':' + indexByZ.get(point.z)!, index]))
  const triangles: number[] = []
  for (const point of source) {
    const a = indexByX.get(point.x)!
    const b = indexByZ.get(point.z)!
    const ul = indices.get(a + ':' + b)!
    const ur = indices.get((a + 1) + ':' + b)
    const ll = indices.get(a + ':' + (b + 1))
    const lr = indices.get((a + 1) + ':' + (b + 1))
    if (ur !== undefined && ll !== undefined && lr !== undefined) triangles.push(ul, ur, ll, ll, ur, lr)
  }
  return triangles
}

function surfaceMesh(source: readonly SpatialPoint[], positions: Vector3[], colors: Color[], style: SpatialStyle) {
  const triangles = spatialTriangles(source)
  if (!triangles.length) return pointsMesh(positions, colors, style)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions.flatMap(point => point.toArray()), 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors.flatMap(color => color.toArray()), 3))
  geometry.setIndex(triangles)
  const opacity = clamp(numberAt(style.opacity, 1), 0, 1)
  return new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide, vertexColors: true, wireframe: style.wireframe, opacity, transparent: opacity < 1 }))
}

type SpatialMesh = ReturnType<typeof pointsMesh> | ReturnType<typeof barsMesh> | ReturnType<typeof surfaceMesh>

export function mountSpatialChart(canvas: HTMLCanvasElement, callbacks: {
  contextLost: (lost: boolean) => void
  changeView: (view: SpatialView) => void
  interacting: (active: boolean) => void
}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  const scene = new Scene()
  const plot = new Group()
  scene.add(plot)
  const camera = new PerspectiveCamera(36, 1, .05, 100)
  const controls = new OrbitControls(camera, canvas)
  controls.enablePan = false
  controls.minDistance = 2.2
  controls.maxDistance = 12
  controls.target.copy(origin)
  let lost = false
  let applyingView = false
  let grid: GridHelper | undefined
  let gridColor: string | undefined
  const window = canvas.ownerDocument.defaultView
  const layers = new Set<SpatialMesh>()
  let transition = 0

  function draw() {
    if (!lost) renderer.render(scene, camera)
  }
  function remove(layer: SpatialMesh) {
    layers.delete(layer)
    plot.remove(layer)
    dispose(layer)
  }
  function replaceMarks(incoming: SpatialMesh | undefined, animate: boolean) {
    if (transition) window?.cancelAnimationFrame(transition)
    transition = 0
    const outgoing = [...layers].filter(layer => {
      if (layer.material.opacity > .005) return true
      remove(layer)
      return false
    }).map(layer => ({ layer, alpha: layer.material.opacity }))
    const opacity = incoming?.material.opacity ?? 1
    if (incoming) { plot.add(incoming); layers.add(incoming) }

    function paint(layer: SpatialMesh, alpha: number, fading: boolean) {
      const material = layer.material
      material.opacity = alpha
      const transparent = fading || alpha < 1
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true }
      material.depthWrite = !fading
    }
    function finish() {
      transition = 0
      for (const entry of outgoing) remove(entry.layer)
      if (incoming) paint(incoming, opacity, false)
      draw()
    }
    if (!window || !outgoing.length || !animate || prefersReducedMotion(canvas)) { finish(); return }
    const tempo = themeTempo(canvas)
    const motion = solveSpring({ from: 0, to: 1, spring: resolveMotionSpring(canvas) })
    const start = window.performance.now()
    if (incoming) paint(incoming, 0, true)
    draw()
    function tick(now: number) {
      const elapsed = Math.max(0, now - start) / (1000 * tempo)
      const { value } = motion(elapsed)
      if (elapsed >= 1 || value >= .995 || prefersReducedMotion(canvas)) { finish(); return }
      const blend = clamp(value, 0, 1)
      for (const { layer, alpha } of outgoing) paint(layer, alpha * (1 - blend), true)
      if (incoming) paint(incoming, opacity * blend, true)
      draw()
      transition = window!.requestAnimationFrame(tick)
    }
    transition = window.requestAnimationFrame(tick)
  }
  function setView(view: SpatialView) {
    applyingView = true
    placeSpatialCamera(camera, view)
    controls.target.copy(origin)
    controls.update()
    applyingView = false
    draw()
  }
  function viewChanged() {
    draw()
    if (applyingView) return
    const spherical = new Spherical().setFromVector3(camera.position.clone().sub(controls.target))
    callbacks.changeView({ azimuth: spherical.theta, elevation: Math.PI / 2 - spherical.phi, distance: spherical.radius })
  }
  function size() {
    renderer.setPixelRatio(Math.min(canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1, 2))
    renderer.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight), false)
    camera.aspect = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight)
    camera.updateProjectionMatrix()
    draw()
  }
  function onLost(event: Event) { event.preventDefault(); lost = true; callbacks.contextLost(true) }
  function onRestored() { lost = false; size(); callbacks.contextLost(false) }
  const start = () => callbacks.interacting(true)
  const end = () => callbacks.interacting(false)

  const resize = new ResizeObserver(size)
  resize.observe(canvas)
  controls.addEventListener('change', viewChanged)
  controls.addEventListener('start', start)
  controls.addEventListener('end', end)
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  setView(initialSpatialView)
  size()

  return {
    drawData(points: readonly SpatialPoint[], mark: SpatialMark, primary: string, secondary: string, border: string, style: SpatialStyle, animate: boolean) {
      if (!grid || gridColor !== border) {
        if (grid) { scene.remove(grid); dispose(grid) }
        grid = new GridHelper(2, 8, border, border)
        scene.add(grid)
        gridColor = border
      }
      const { data, positions, colors, baseline } = spatialData(points, mark, primary, secondary, style.domains)
      const marks = !data.length ? undefined : mark === 'bars' ? barsMesh(positions, colors, baseline, style)
        : mark === 'surface' ? surfaceMesh(data, positions, colors, style) : pointsMesh(positions, colors, style)
      replaceMarks(marks, animate)
    },
    setView,
    setInteractive(enabled: boolean) {
      controls.enabled = enabled
      canvas.style.touchAction = enabled ? 'none' : ''
    },
    dispose() {
      if (transition) window?.cancelAnimationFrame(transition)
      resize.disconnect()
      controls.removeEventListener('change', viewChanged)
      controls.removeEventListener('start', start)
      controls.removeEventListener('end', end)
      controls.dispose()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      dispose(scene)
      renderer.dispose()
    },
  }
}
