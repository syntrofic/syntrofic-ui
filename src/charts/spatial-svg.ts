import { PerspectiveCamera, Vector3 } from 'three'
import { placeSpatialCamera, spatialBarWidth, spatialData, spatialTriangles, type SpatialMark, type SpatialPoint, type SpatialStyle, type SpatialView } from './spatial'
import { clamp, numberAt } from './values'

type Projected = { x: number; y: number; depth: number }
type Shape = { key: string; depth: number; color: string } & ({ x: number; y: number; radius: number } | { path: string })
const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]

function spatialProjection(view: SpatialView, width: number, height: number) {
  const camera = new PerspectiveCamera(36, width / height, .05, 100)
  placeSpatialCamera(camera, view)
  return (position: Vector3): Projected => {
    const point = position.clone().project(camera)
    return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2, depth: point.z }
  }
}

export function projectSpatialAxes(view: SpatialView, width: number, height: number) {
  const project = spatialProjection(view, width, height)
  return { x: project(new Vector3(1.1, 0, -1)), y: project(new Vector3(-1, 1.64, -1)), z: project(new Vector3(-1, 0, 1.14)) }
}

export function drawSpatialSvg(source: readonly SpatialPoint[], mark: SpatialMark, colors: readonly string[],
  style: SpatialStyle, view: SpatialView, width: number, height: number) {
  const project = spatialProjection(view, width, height)
  const { data, positions, colors: palette, baseline } = spatialData(source, mark, colors[0], colors[1], style.domains)
  const shapes: Shape[] = []
  const projected = positions.map(project)
  const xy = ({ x, y }: Projected) => `${x.toFixed(2)} ${y.toFixed(2)}`
  const path = (points: readonly Projected[]) => 'M' + points.map(xy).join('L')
  function polygon(key: string, points: Projected[], color: string) {
    shapes.push({ key, path: path(points) + 'Z', color, depth: points.reduce((sum, point) => sum + point.depth, 0) / points.length })
  }
  const triangles = mark === 'surface' ? spatialTriangles(data) : []
  if (triangles.length) {
    for (let at = 0; at < triangles.length; at += 3) {
      const a = triangles[at]
      const b = triangles[at + 1]
      const c = triangles[at + 2]
      const paint = palette[a].clone().lerp(palette[b], .5).lerp(palette[c], 1 / 3).getStyle()
      polygon(String(at), [projected[a], projected[b], projected[c]], paint)
    }
  } else if (mark === 'bars') {
    const radius = spatialBarWidth(positions.length, style.barWidth) / 2
    for (const [index, { x, y, z }] of positions.entries()) {
      const x0 = x - radius, x1 = x + radius, z0 = z - radius, z1 = z + radius
      const corners = [baseline, y].flatMap(top => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => project(new Vector3(x, top, z))))
      faces.forEach((face, part) => polygon(data[index].id + ':' + part, face.map(at => corners[at]), palette[index].clone().multiplyScalar(.8 + part * .035).getStyle()))
    }
  } else {
    for (const [index, point] of projected.entries()) {
      const scale = clamp(numberAt(style.pointSize, .12), .01, 1) / 2
      const radius = project(positions[index].clone().add(new Vector3(scale, 0, 0)))
      shapes.push({ key: data[index].id, ...point, color: palette[index].getStyle(), radius: Math.max(1, Math.hypot(point.x - radius.x, point.y - radius.y)) })
    }
  }
  const grid = Array.from({ length: 9 }, (_, index) => index / 4 - 1).flatMap(value => [
    path([project(new Vector3(-1, 0, value)), project(new Vector3(1, 0, value))]),
    path([project(new Vector3(value, 0, -1)), project(new Vector3(value, 0, 1))]),
  ]).join(' ')
  return { grid, shapes: shapes.sort((a, b) => b.depth - a.depth) }
}
