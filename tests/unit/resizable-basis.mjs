import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRenderer, nextTick, shallowRef } from 'vue'
import { percent, pixel, useResizable } from '../../dist/index.js'

function surface({ width = 480, visible = true, saved } = {}) {
  const writes = []
  const targets = new Map()
  const frames = new Map()
  const listeners = new Set()
  let sequence = 0
  let measurements = 0
  let observations = 0
  const view = {
    localStorage: {
      getItem: key => saved?.[key] && JSON.stringify(saved[key]),
      setItem: (key, value) => writes.push([key, JSON.parse(value)]),
    },
    getComputedStyle() { measurements++; return { fontSize: '16px', paddingLeft: '0px', paddingRight: '0px', writingMode: 'horizontal-tb' } },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback }
      observe(node) { observations++; targets.set(node, this.callback) }
      unobserve(node) { targets.delete(node) }
    },
    requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence },
    cancelAnimationFrame(id) { frames.delete(id) },
    addEventListener(_, callback) { listeners.add(callback) },
    removeEventListener(_, callback) { listeners.delete(callback) },
  }
  const document = { defaultView: view, documentElement: {} }
  const element = { ownerDocument: document, clientWidth: width, isConnected: true, getClientRects: () => element.visible ? [{}] : [], visible }
  const containerRef = shallowRef(element)
  const renderer = createRenderer({
    createComment: () => ({ ownerDocument: document }),
    insert(node, parent) { node.parent = parent },
    parentNode: node => node.parent,
    remove() {},
  })
  let app
  return {
    element, containerRef, writes, targets, listeners,
    get observations() { return observations },
    get measurements() { return measurements },
    mount(create) {
      let controls
      app = renderer.createApp({ setup() { controls = create(); return () => null } })
      app.mount({})
      return controls
    },
    async resize(next) {
      element.clientWidth = next
      targets.get(element)?.([{ target: element }])
      for (const [id, frame] of frames) { frames.delete(id); frame() }
      await nextTick()
    },
    unmount() { app?.unmount() },
  }
}

test('fixed pixels and restored percentage defaults never observe or read their container', async () => {
  const fixture = surface({ visible: false, saved: { 'syntrofic:resizable:saved:files': { pixels: 180, collapsed: true } } })
  try {
    const { files, details } = fixture.mount(() => useResizable({
      containerRef: fixture.containerRef, autoSaveId: 'saved',
      regions: {
        files: { defaultSize: percent(60, { min: pixel(150) }), collapsible: true },
        details: { defaultSize: pixel(160), maxSize: '270px' },
      },
    }))
    await nextTick()
    assert.equal(files.isCollapsed.value, true)
    assert.equal(details.size.value, 160)
    assert.equal(fixture.measurements, 0)
    assert.equal(fixture.observations, 0)
    assert.equal(fixture.listeners.size, 0)
    assert.deepEqual(fixture.writes, [])
    files.expand()
    await nextTick()
    assert.equal(files.size.value, 180)
    assert.deepEqual(fixture.writes, [['syntrofic:resizable:saved:files', { pixels: 180, collapsed: false }]])
  } finally { fixture.unmount() }
})

test('several percentage defaults share a measurement and release it after choosing pixels', async () => {
  const fixture = surface()
  try {
    const { files, details, invalid } = fixture.mount(() => useResizable({
      containerRef: fixture.containerRef,
      regions: {
        files: { defaultSize: percent(80, { max: pixel(300) }) },
        details: { defaultSize: '25%' },
        invalid: { defaultSize: percent(105, { max: pixel(300) }) },
      },
    }))
    await nextTick()
    assert.equal(files.size.value, 300)
    assert.equal(details.size.value, 120)
    assert.equal(invalid.size.value, 250)
    assert.equal(fixture.observations, 1)
    assert.equal(fixture.measurements, 2)
    assert.equal(fixture.targets.size, 0)
    assert.equal(fixture.listeners.size, 0)
    await fixture.resize(720)
    assert.equal(details.size.value, 120)
  } finally { fixture.unmount() }
})

test('a hidden live bound defers normalization and storage until its content box can be measured', async () => {
  const fixture = surface({ visible: false, saved: { 'syntrofic:resizable:saved': { pixels: 220, collapsed: false } } })
  try {
    const files = fixture.mount(() => useResizable({
      containerRef: fixture.containerRef, autoSaveId: 'saved', minSize: 180, maxSize: '50%',
    }))
    await nextTick()
    assert.equal(fixture.observations, 1)
    assert.equal(fixture.measurements, 0)
    assert.deepEqual(fixture.writes, [])
    fixture.element.visible = true
    await fixture.resize(320)
    assert.equal(files.size.value, 160)
    assert.deepEqual(fixture.writes, [['syntrofic:resizable:saved', { pixels: 160, collapsed: false }]])
    await fixture.resize(280)
    assert.equal(files.size.value, 140)
    assert.equal(fixture.observations, 1)
  } finally { fixture.unmount() }
  assert.equal(fixture.targets.size, 0)
  assert.equal(fixture.listeners.size, 0)
})
