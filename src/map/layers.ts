import type { GeoJSONSourceSpecification, LayerSpecification, MapGeoJSONFeature, SourceSpecification, StyleSpecification } from 'maplibre-gl'

export type MapLocation = [longitude: number, latitude: number]

export interface MapViewport {
  center: MapLocation
  zoom: number
  bearing: number
  pitch: number
}

export type MapStyle = string | StyleSpecification

export interface MapMarkerSpec {
  id: string
  location: MapLocation
  label: string
  tooltip?: string
  detail?: string
  color?: string
  ringColor?: string
  draggable?: boolean
  labelPosition?: 'top' | 'bottom'
}

export interface MapPopupSpec {
  location: MapLocation
  title?: string
  detail?: string
}

export interface MapRouteSpec {
  id: string
  coordinates: readonly MapLocation[]
  color?: string
  width?: number
  opacity?: number
  dashArray?: readonly [number, number]
}

export interface MapArcSpec extends Omit<MapRouteSpec, 'coordinates'> {
  from: MapLocation
  to: MapLocation
}

export interface MapClusterSpec {
  id: string
  data: GeoJSONSourceSpecification['data']
  radius?: number
  maxZoom?: number
  color?: string
  unclusteredColor?: string
}

export interface MapLayerSet {
  sourceId: string
  source: SourceSpecification
  layers: readonly LayerSpecification[]
  before?: string
}

export type MapFeature = MapGeoJSONFeature

export const validLocation = ([lng, lat]: MapLocation) => Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) <= 90

export function arcCoordinates(from: MapLocation, to: MapLocation): MapLocation[] {
  const radians = Math.PI / 180
  const point = ([lng, lat]: MapLocation) => [
    Math.cos(lat * radians) * Math.cos(lng * radians),
    Math.cos(lat * radians) * Math.sin(lng * radians),
    Math.sin(lat * radians),
  ]
  const a = point(from)
  const b = point(to)
  const projection = a.reduce((total, value, index) => total + value * b[index], 0)
  const angle = Math.acos(Math.max(-1, Math.min(1, projection)))
  if (angle < 1e-8) return [from, to]
  let tangent = b.map((value, index) => value - projection * a[index])
  let magnitude = Math.hypot(...tangent)
  if (magnitude < 1e-8) {
    tangent = Math.abs(a[2]) < .8 ? [-a[1], a[0], 0] : [0, -a[2], a[1]]
    magnitude = Math.hypot(...tangent)
  }
  const coordinates = [from]
  const steps = Math.max(8, Math.ceil(angle / radians / 2))
  for (let at = 1; at < steps; at++) {
    const part = angle * at / steps
    const [x, y, z] = a.map((value, index) => value * Math.cos(part) + tangent[index] / magnitude * Math.sin(part))
    coordinates.push([Math.atan2(y, x) / radians, Math.atan2(z, Math.hypot(x, y)) / radians])
  }
  coordinates.push(to)
  return coordinates
}

function splitDateLine(coordinates: readonly MapLocation[]) {
  const segments: MapLocation[][] = []
  let segment: MapLocation[] = []
  for (const location of coordinates) {
    const next: MapLocation = [((location[0] + 180) % 360 + 360) % 360 - 180, location[1]]
    const previous = segment.at(-1)
    if (previous && Math.abs(next[0] - previous[0]) > 180) {
      const edge = previous[0] > 0 ? 180 : -180
      const unwrapped = next[0] + (edge > 0 ? 360 : -360)
      const fraction = unwrapped === previous[0] ? 0 : (edge - previous[0]) / (unwrapped - previous[0])
      const lat = previous[1] + (next[1] - previous[1]) * fraction
      segment.push([edge, lat])
      segments.push(segment)
      segment = [[-edge, lat]]
    }
    segment.push(next)
  }
  if (segment.length > 1) segments.push(segment)
  return segments
}

export function routeLayer(prefix: string, route: MapRouteSpec, tone: string): MapLayerSet | undefined {
  const coordinates = splitDateLine(route.coordinates.filter(validLocation))
  if (!coordinates.length) return
  const sourceId = `${prefix}-${route.id}`
  return {
    sourceId,
    source: {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates } },
    },
    layers: [{
      id: sourceId, source: sourceId, type: 'line',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': route.color ?? tone, 'line-opacity': route.opacity ?? .92, 'line-width': route.width ?? 3,
        ...(route.dashArray ? { 'line-dasharray': [...route.dashArray] } : {}),
      },
    }],
  }
}

export function clusterLayer(prefix: string, cluster: MapClusterSpec, tone: string): MapLayerSet {
  const sourceId = `${prefix}-cluster-${cluster.id}`
  return {
    sourceId,
    source: { type: 'geojson', data: cluster.data, cluster: true, clusterRadius: cluster.radius, clusterMaxZoom: cluster.maxZoom },
    layers: [
      {
        id: `${sourceId}-group`, type: 'circle', source: sourceId, filter: ['has', 'point_count'],
        paint: {
          'circle-color': cluster.color ?? tone, 'circle-radius': ['step', ['get', 'point_count'], 15, 30, 19, 100, 23],
        },
      },
      {
        id: `${sourceId}-point`, type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': cluster.unclusteredColor ?? cluster.color ?? tone, 'circle-radius': 5, 'circle-opacity': .8 },
      },
    ],
  }
}
