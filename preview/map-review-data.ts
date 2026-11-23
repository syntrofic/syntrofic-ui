import type { MapArcSpec, MapClusterSpec, MapLayerSet, MapLocation, MapMarkerSpec, MapRouteSpec, MapStyle } from '../src/map'

type PlanPoint = [east: number, north: number]
export const point = (east: number, north: number): MapLocation => [121.488 + east * .00032, 31.233 + north * .00028]
export const center = point(0, 0)
const polygon = (points: PlanPoint[]) => ({ type: 'Polygon' as const, coordinates: [[...points, points[0]].map(tuple => point(...tuple))] })
const line = (points: PlanPoint[]) => ({ type: 'LineString' as const, coordinates: points.map(tuple => point(...tuple)) })
const feature = <Geometry>(kind: string, geometry: Geometry) => ({ type: 'Feature' as const, properties: { kind }, geometry })

const blocks = []
for (let y = -62; y <= 65; y += 9) {
  for (let x = -76; x <= 80; x += 8) {
    if (x < -22 || x > 22) blocks.push(feature('blocks', polygon([[x + 1, y + 1], [x + 6, y + 1], [x + 6, y + 7], [x + 1, y + 7]])))
  }
}

const landscape = [
  ...blocks,
  feature('park', polygon([[-50, 34], [-29, 35], [-24, 15], [-47, 13], [-54, 24]])),
  feature('park', polygon([[28, 6], [52, 9], [56, -14], [30, -10]])),
  feature('water', polygon([[-29, 77], [-7, 76], [-8, 50], [4, 30], [12, 17], [10, -6], [2, -27], [9, -49], [29, -78], [6, -77], [-12, -52], [-20, -24], [-10, 6], [-10, 19], [-21, 40], [-29, 51]])),
  feature('avenue', line([[-83, -19], [-44, -16], [-23, -16], [26, -17], [68, -14], [91, -13]])),
  feature('avenue', line([[-89, 22], [-48, 24], [-21, 22], [31, 18], [86, 20]])),
  feature('avenue', line([[-51, -74], [-49, -49], [-48, -15], [-52, 24], [-53, 73]])),
  feature('avenue', line([[42, -69], [45, -31], [47, -7], [51, 19], [60, 45], [67, 72]])),
]

function style(dark: boolean): Exclude<MapStyle, string> {
  return {
    version: 8,
    sources: { district: { type: 'geojson', data: { type: 'FeatureCollection', features: landscape } } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': dark ? '#343b33' : '#e7e8db' } },
      { id: 'buildings', type: 'fill', source: 'district', filter: ['==', ['get', 'kind'], 'blocks'], paint: { 'fill-color': dark ? '#454a41' : '#d9dcd0' } },
      { id: 'park', type: 'fill', source: 'district', filter: ['==', ['get', 'kind'], 'park'], paint: { 'fill-color': dark ? '#4a5c49' : '#c4d0bc' } },
      { id: 'river', type: 'fill', source: 'district', filter: ['==', ['get', 'kind'], 'water'], paint: { 'fill-color': dark ? '#40535b' : '#bbcbd0' } },
      { id: 'avenue', type: 'line', source: 'district', filter: ['==', ['get', 'kind'], 'avenue'], paint: { 'line-color': dark ? '#6e7062' : '#f5f0e3', 'line-width': 3 } },
    ],
  }
}
export const styles = { light: style(false), dark: style(true) }
export const markers: MapMarkerSpec[] = [
  { id: 'studio', location: point(-24, 8), label: '制作间', detail: '样品记录和交付检查。', tooltip: '打开制作间详情', color: '#526859' },
  { id: 'archive', location: point(24, -15), label: '收件台', detail: '接收文件与外送包裹。', labelPosition: 'top', color: '#746555', draggable: true },
]
export const routes: MapRouteSpec[] = [
  { id: 'route', coordinates: [point(-24, 8), point(-26, -14), point(-22, -16), point(20, -17), point(24, -15)] },
]
export const arcs: MapArcSpec[] = [
  { id: 'short-link', from: point(-48, 27), to: point(22, 25), width: 1.2, dashArray: [2, 3], color: '#806c82' },
]
export const clusters: MapClusterSpec[] = [
  {
    id: 'checkpoints', radius: 32, color: '#5f6273', unclusteredColor: '#5f6273',
    data: { type: 'FeatureCollection', features: [[24, 19], [26, 22], [28, 25], [31, 22], [32, 26], [-26, -29], [-30, -26]].map(([east, north]) => ({
      type: 'Feature', properties: { kind: 'checkpoint' }, geometry: { type: 'Point', coordinates: point(east, north) },
    })) },
  },
]
export const layers: MapLayerSet[] = [{
  sourceId: 'review-service-zone',
  source: {
    type: 'geojson',
    data: { type: 'Feature', properties: { name: '复核范围' }, geometry: polygon([[22, -12], [33, -9], [33, 3], [22, 4]]) },
  },
  layers: [{ id: 'review-zone', type: 'fill', source: 'review-service-zone', paint: { 'fill-color': '#8a726e', 'fill-opacity': .32 } }],
}]
