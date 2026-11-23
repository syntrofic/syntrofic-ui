type Point = { x: number; y: number }

type PreviewGroup = {
  current?: symbol
  close?: () => void
  last: number
}
const groups = new WeakMap<Document, PreviewGroup>()
const warmWindow = 360

export function previewGroup(owner: Document) {
  let group = groups.get(owner)
  if (!group) {
    group = { last: -Infinity }
    groups.set(owner, group)
  }
  return group
}

export function isPreviewWarm(owner: Document, id: symbol) {
  const group = groups.get(owner)
  return Boolean(group && (group.current !== undefined && group.current !== id || Date.now() - group.last < warmWindow))
}

export function activatePreview(owner: Document, id: symbol, close: () => void) {
  const group = previewGroup(owner)
  if (group.current !== id) group.close?.()
  group.current = id
  group.close = close
}

export function releasePreview(owner: Document, id: symbol) {
  const group = groups.get(owner)
  if (group?.current !== id) return
  group.current = undefined
  group.close = undefined
  group.last = Date.now()
}

function cross(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

export function previewCorridor(from: DOMRect, to: DOMRect, start: Point) {
  const padding = 11
  let first: Point
  let last: Point
  if (to.right <= from.left + 2 || to.left >= from.right - 2) {
    const x = to.right <= from.left + 2 ? to.right + 1 : to.left - 1
    first = { x, y: to.top - padding }
    last = { x, y: to.bottom + padding }
  } else {
    const y = to.bottom <= from.top + 2 ? to.bottom + 1 : to.top - 1
    first = { x: to.left - padding, y }
    last = { x: to.right + padding, y }
  }
  return (point: Point) => {
    const signs = [cross(start, first, point), cross(first, last, point), cross(last, start, point)]
    return signs.every(value => value >= -1) || signs.every(value => value <= 1)
  }
}
