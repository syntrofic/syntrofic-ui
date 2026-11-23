import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Line, LineBasicMaterial, Mesh, MeshBasicMaterial,
  NoBlending, OrthographicCamera, Points, Scene, ShaderMaterial, Uint8BufferAttribute, Vector2, WebGLRenderer, WebGLRenderTarget,
  type InterleavedBufferAttribute, type InstancedInterleavedBuffer,
} from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { clamp, domainFor, fraction } from './values'
import type { ChartHit, ChartRange } from './types'

export interface WebGLDatum { id: string; x: number | string; y: number | string; value?: number; label?: string }
export type WebGLMark = 'dot' | 'dot-interactive' | 'heatmap' | 'stream'
export interface WebGLPlotPoint { x: number; y: number; width?: number; height?: number }
export interface WebGLProjection { points: readonly WebGLPlotPoint[]; cellWidth: number; cellHeight: number }
export interface WebGLDrawOptions {
  colors: readonly string[]
  colorDomain?: ChartRange
  cellGap: number
  opacity: number
  pointSize: number
  lineWidth?: number
}

export function plotPoints(data: readonly WebGLDatum[], mark: WebGLMark, xRange?: ChartRange, yRange?: ChartRange): WebGLProjection {
  const xs = data.map(point => point.x)
  const ys = data.map(point => point.y)
  const xDomain = domainFor(xs.filter((x): x is number => typeof x === 'number'), xRange)
  const yDomain = domainFor(ys.filter((y): y is number => typeof y === 'number'), yRange)
  const bin = (values: (number | string)[]) => new Map(values.map((value, index) => [value, (index + .5) * 2 / values.length - 1]))
  const ordered = (samples: (number | string)[]) => {
    const values = [...new Set(samples)]
    return values.every(value => typeof value === 'number') ? values.sort((a, b) => a - b) : values
  }
  const binsX = mark === 'heatmap' ? bin(ordered(xs)) : undefined
  const binsY = mark === 'heatmap' ? bin(ordered(ys)) : undefined
  const points = data.map(point => ({
    x: binsX?.get(point.x) ?? 1.8 * fraction(Number(point.x), xDomain) - .9,
    y: binsY?.get(point.y) ?? 1.8 * fraction(Number(point.y), yDomain) - .9,
  }))
  return { points, cellWidth: 2 / Math.max(1, binsX?.size ?? 1), cellHeight: 2 / Math.max(1, binsY?.size ?? 1) }
}

function drawGeometry(
  data: readonly WebGLDatum[], mark: Exclude<WebGLMark, 'stream'>,
  { points, cellWidth, cellHeight }: WebGLProjection,
  { colors: ramp, colorDomain, opacity, pointSize, cellGap }: WebGLDrawOptions,
) {
  const geometry = new BufferGeometry()
  if (mark !== 'heatmap') {
    geometry.setAttribute('position', new Float32BufferAttribute(points.flatMap(({ x, y }) => [x, y, 0]), 3))
    const tint = new Color(ramp.at(-1))
    const object = new Points(geometry, new ShaderMaterial({
      uniforms: { tint: { value: tint }, opacity: { value: opacity }, diameter: { value: pointSize } },
      vertexShader: `
        uniform float diameter;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = diameter;
        }`,
      fragmentShader: `
        uniform vec3 tint;
        uniform float opacity;
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          float coverage = 1.0 - smoothstep(0.44, 0.5, distance);
          if (coverage <= 0.0) discard;
          gl_FragColor = vec4(tint, opacity * coverage);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }))
    return { object, paint: (colors: readonly string[]) => { tint.set(colors.at(-1) ?? '#425849') } }
  }

  const slots: number[] = []
  const domain = domainFor(data.map(point => point.value ?? 0), colorDomain)
  const samples = points.map((_, index) => clamp(fraction(data[index].value ?? 0, domain), 0, 1))
  points.forEach(({ x, y, width, height }) => {
    const w = (width ?? cellWidth) * (1 - cellGap) / 2
    const h = (height ?? cellHeight) * (1 - cellGap) / 2
    slots.push(x - w, y - h, 0, x + w, y - h, 0, x - w, y + h, 0, x + w, y - h, 0, x + w, y + h, 0, x - w, y + h, 0)
  })
  const colors = new BufferAttribute(new Float32Array(points.length * 18), 3).setUsage(DynamicDrawUsage)
  const tint = new Color()
  function paint(ramp: readonly string[]) {
    const stops = ramp.map(value => new Color(value))
    samples.forEach((sample, index) => {
      const scale = sample * (stops.length - 1)
      const at = Math.floor(scale)
      tint.copy(stops[at]).lerp(stops[Math.min(at + 1, stops.length - 1)], scale - at)
      for (let vertex = 0; vertex < 6; vertex++) colors.setXYZ(index * 6 + vertex, tint.r, tint.g, tint.b)
    })
    colors.needsUpdate = true
  }
  paint(ramp)
  geometry.setAttribute('position', new Float32BufferAttribute(slots, 3))
  geometry.setAttribute('color', colors)
  return { object: new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide, vertexColors: true, opacity, transparent: opacity < 1 })), paint }
}

function createPointPicking(renderer: WebGLRenderer, camera: OrthographicCamera) {
  const target = new WebGLRenderTarget(1, 1, { depthBuffer: false })
  const material = new ShaderMaterial({
    uniforms: { diameter: { value: 20 } },
    vertexShader: `
      attribute vec3 feature;
      varying vec3 encoded;
      uniform float diameter;
      void main() {
        encoded = feature;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = diameter;
      }`,
    fragmentShader: `
      varying vec3 encoded;
      void main() {
        if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
        gl_FragColor = vec4(encoded, 1.0);
      }`,
    blending: NoBlending,
    depthWrite: false,
    depthTest: false,
  })
  const scene = new Scene()
  const pixels = new Uint8Array(4)
  const size = new Vector2()
  const geometry = new BufferGeometry()
  const points = new Points(geometry, material)
  points.frustumCulled = false
  scene.add(points)
  let dirty = true
  let count = 0

  return {
    update(positions: WebGLProjection['points'], diameter: number) {
      count = Math.min(positions.length, 0xFFFFFF)
      geometry.dispose()
      geometry.setAttribute('position', new Float32BufferAttribute(positions.slice(0, count).flatMap(({ x, y }) => [x, y, 0]), 3))
      const encoded = new Uint8Array(count * 3)
      for (let index = 0; index < count; index++) {
        const code = index + 1
        const offset = index * 3
        encoded[offset] = code & 255
        encoded[offset + 1] = (code >>> 8) & 255
        encoded[offset + 2] = code >>> 16
      }
      geometry.setAttribute('feature', new Uint8BufferAttribute(encoded, 3, true))
      material.uniforms.diameter.value = diameter
      dirty = true
    },
    invalidate() { dirty = true },
    pick({ x, y, width, height }: ChartHit) {
      if (!count || x < 0 || x >= width || y < 0 || y >= height) return
      renderer.getDrawingBufferSize(size)
      if (size.x <= 0 || size.y <= 0) return
      if (dirty || target.width !== size.x || target.height !== size.y) {
        target.setSize(size.x, size.y)
        const diameter = material.uniforms.diameter.value
        material.uniforms.diameter.value = diameter * renderer.getPixelRatio()
        const previous = renderer.getRenderTarget()
        renderer.setRenderTarget(target)
        renderer.render(scene, camera)
        renderer.setRenderTarget(previous)
        material.uniforms.diameter.value = diameter
        dirty = false
      }
      renderer.readRenderTargetPixels(target, Math.floor(x * size.x / width), size.y - 1 - Math.floor(y * size.y / height), 1, 1, pixels)
      const code = pixels[0] | pixels[1] << 8 | pixels[2] << 16
      return code > 0 && code <= count ? code - 1 : undefined
    },
    dispose() { geometry.dispose(); material.dispose(); target.dispose() },
  }
}

export function mountWebGLPlot(canvas: HTMLCanvasElement, available: (available: boolean) => void) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, canvas })
  const camera = new OrthographicCamera(-1, 1, 1, -1, .01, 5)
  camera.position.z = 1
  const scene = new Scene()
  let mark: ReturnType<typeof drawGeometry>['object'] | Line<BufferGeometry, LineBasicMaterial> | LineSegments2 | undefined
  let paintMark: ReturnType<typeof drawGeometry>['paint'] | undefined
  let streamPosition: BufferAttribute | undefined
  let segmentBuffer: InstancedInterleavedBuffer | undefined
  let picking: ReturnType<typeof createPointPicking> | undefined
  let pointSize = 0
  let frame = 0
  let lost = false
  let painted = false
  let colorContext: CanvasRenderingContext2D | null | undefined
  const win = canvas.ownerDocument.defaultView!

  function webGLColors(colors: readonly string[]) {
    return colors.map(color => {
      if (!/^(?:color|lab|lch|oklab|oklch)\(/.test(color)) return color
      // Computed CSS transitions can serialize in a modern color space. Three expects legacy sRGB colors.
      if (colorContext === undefined) {
        const sample = canvas.ownerDocument.createElement('canvas')
        sample.width = sample.height = 1
        colorContext = sample.getContext('2d', { willReadFrequently: true })
      }
      if (!colorContext) return color
      colorContext.clearRect(0, 0, 1, 1)
      colorContext.fillStyle = color
      colorContext.fillRect(0, 0, 1, 1)
      const [red, green, blue] = colorContext.getImageData(0, 0, 1, 1).data
      return `rgb(${red}, ${green}, ${blue})`
    })
  }

  function schedule() {
    if (frame || lost) return
    frame = win.requestAnimationFrame(() => {
      frame = 0
      if (lost) return
      renderer.render(scene, camera)
      if (mark && !painted) {
        painted = true
        available(true)
      }
    })
  }
  function size() {
    renderer.setPixelRatio(Math.min(win.devicePixelRatio, 2))
    renderer.setSize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), false)
    if (mark instanceof Points) mark.material.uniforms.diameter.value = pointSize * renderer.getPixelRatio()
    picking?.invalidate()
    schedule()
  }
  function remove() {
    if (!mark) return
    scene.remove(mark)
    mark.geometry.dispose()
    mark.material.dispose()
    mark = undefined
    paintMark = undefined
    streamPosition = undefined
    segmentBuffer = undefined
  }
  function onLost(event: Event) {
    event.preventDefault()
    lost = true
    painted = false
    if (frame) win.cancelAnimationFrame(frame)
    frame = 0
    available(false)
  }
  function onRestored() { lost = false; size() }

  function updateStream(points: WebGLProjection['points'], options: WebGLDrawOptions) {
    if (!(mark instanceof Line)) {
      remove()
      mark = new Line(new BufferGeometry(), new LineBasicMaterial())
      mark.frustumCulled = false
      scene.add(mark)
    }
    let attribute = streamPosition
    if (!attribute || attribute.count < points.length) {
      if (attribute) {
        mark.geometry.dispose()
        mark.geometry = new BufferGeometry()
      }
      const capacity = 2 ** Math.ceil(Math.log2(Math.max(32, points.length)))
      attribute = streamPosition = new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage)
      mark.geometry.setAttribute('position', attribute)
    }
    points.forEach(({ x, y }, index) => attribute.setXYZ(index, x, y, 0))
    attribute.clearUpdateRanges()
    attribute.addUpdateRange(0, points.length * 3)
    attribute.needsUpdate = true
    mark.geometry.setDrawRange(0, points.length)
    mark.material.color.set(options.colors.at(-1) ?? '#425849')
    if (mark.material.transparent !== (options.opacity < 1)) {
      mark.material.transparent = options.opacity < 1
      mark.material.needsUpdate = true
    }
    mark.material.opacity = options.opacity
  }

  function updateWideStream(points: WebGLProjection['points'], options: WebGLDrawOptions) {
    if (!(mark instanceof LineSegments2)) {
      remove()
      mark = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({ depthTest: false, depthWrite: false }))
      mark.frustumCulled = false
      scene.add(mark)
    }
    const segments = Math.max(0, points.length - 1)
    let buffer = segmentBuffer
    if (!buffer || buffer.count < segments) {
      if (buffer) {
        mark.geometry.dispose()
        mark.geometry = new LineSegmentsGeometry()
      }
      const capacity = 2 ** Math.ceil(Math.log2(Math.max(32, segments)))
      mark.geometry.setPositions(new Float32Array(capacity * 6))
      const start = mark.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute
      buffer = segmentBuffer = (start.data as InstancedInterleavedBuffer).setUsage(DynamicDrawUsage) as InstancedInterleavedBuffer
    }
    const coordinates = buffer.array
    for (let index = 0; index < segments; index++) {
      const at = index * 6
      coordinates[at] = points[index].x
      coordinates[at + 1] = points[index].y
      coordinates[at + 3] = points[index + 1].x
      coordinates[at + 4] = points[index + 1].y
    }
    mark.geometry.instanceCount = segments
    buffer.clearUpdateRanges()
    buffer.addUpdateRange(0, segments * 6)
    buffer.needsUpdate = true
    mark.material.color.set(options.colors.at(-1) ?? '#425849')
    mark.material.opacity = options.opacity
    mark.material.linewidth = options.lineWidth ?? 1
    if (mark.material.transparent !== (options.opacity < 1)) {
      mark.material.transparent = options.opacity < 1
      mark.material.needsUpdate = true
    }
  }

  const resize = new win.ResizeObserver(size)
  resize.observe(canvas)
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  size()

  return {
    update(data: readonly WebGLDatum[], kind: WebGLMark, positions: WebGLProjection, options: WebGLDrawOptions) {
      options = { ...options, colors: webGLColors(options.colors) }
      if (kind === 'dot-interactive') {
        picking ??= createPointPicking(renderer, camera)
        picking.update(positions.points, Math.max(20, options.pointSize))
      } else if (picking) {
        picking.dispose()
        picking = undefined
      }
      if (kind === 'stream') {
        if ((options.lineWidth ?? 1) > 1) updateWideStream(positions.points, options)
        else updateStream(positions.points, options)
      }
      else {
        remove()
        const geometry = drawGeometry(data, kind, positions, options)
        mark = geometry.object
        paintMark = geometry.paint
        if (mark instanceof Points) {
          pointSize = options.pointSize
          mark.material.uniforms.diameter.value = pointSize * renderer.getPixelRatio()
        }
        scene.add(mark)
      }
      schedule()
    },
    setColors(colors: readonly string[]) {
      if (!mark || !colors.length) return
      const ramp = webGLColors(colors)
      if (mark instanceof Line || mark instanceof LineSegments2) mark.material.color.set(ramp.at(-1) ?? '#425849')
      else paintMark?.(ramp)
      schedule()
    },
    pick(event: ChartHit) { if (!lost) return picking?.pick(event) },
    dispose() {
      if (frame) win.cancelAnimationFrame(frame)
      resize.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      remove()
      picking?.dispose()
      renderer.dispose()
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss()
    },
  }
}
