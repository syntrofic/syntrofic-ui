import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = fileURLToPath(new URL('../apps/native-demo/', import.meta.url))
const work = await mkdtemp(join(tmpdir(), 'syntrofic-native-consumer-'))
const consumer = join(work, 'consumer')

function pnpm(args, cwd) {
  const result = spawnSync('pnpm', args, { cwd, stdio: 'inherit' })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `pnpm ${args.join(' ')} failed`)
}

async function nativeStateURL(file, dependencies = {}) {
  let source = await readFile(join(root, 'packages/native/src', file), 'utf8')
  for (const [specifier, url] of Object.entries(dependencies)) source = source.replace(`'${specifier}'`, `'${url}'`)
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
}

async function nativeStateModule(file, dependencies) {
  return import(await nativeStateURL(file, dependencies))
}

async function checkFormState() {
  const { normalizeOTP, nextChoiceState, otpSize } = await nativeStateModule('control-state.ts')
  assert.equal(normalizeOTP(' ０١-२ ٣٤５-99', 'numeric', 6), '012345')
  assert.equal(normalizeOTP('Ａ٠-٢Z', 'alphanumeric', 4), 'A02Z')
  assert.equal(normalizeOTP('A01', 'numeric', 2), '01')
  assert.equal(otpSize(Number.NaN), 6)
  assert.equal(nextChoiceState('mixed', 'checkbox'), true)
  assert.equal(nextChoiceState(true, 'switch'), false)
  assert.equal(nextChoiceState(true, 'radio'), true)
}

async function checkInputProState() {
  const { matchesNativeOption, nextNativeOptionIndex } = await nativeStateModule('option-field.ts')
  assert.ok(matchesNativeOption({ id: 'file', label: 'Café', keywords: ['archive'] }, 'cafe'))
  assert.ok(matchesNativeOption({ id: 'file', label: '交付清单', keywords: ['archive'] }, 'ARCH'))
  assert.equal(nextNativeOptionIndex(2, 3, 'next'), 0)
  assert.equal(nextNativeOptionIndex(-1, 3, 'previous'), 2)
  const { applyNativePadKey, commitNativeNumber, stepNativeNumber, nativeNumberAdapter, readFormattedNativeNumber } = await nativeStateModule('number-state.ts', {
    './control-state': await nativeStateURL('control-state.ts'),
  })
  assert.equal(commitNativeNumber(27, { max: 20, step: .25 }), 20)
  assert.equal(stepNativeNumber(.2, 1, { step: .1 }), .3)
  assert.equal(readFormattedNativeNumber('؜-١٢٫٥٪؜', nativeNumberAdapter('ar-EG', { style: 'percent' }), true), -.125)
  assert.equal(readFormattedNativeNumber('−', nativeNumberAdapter('en')), undefined)
  assert.equal(applyNativePadKey('1,23', '4', { decimal: ',', maxDigits: 3 }), '1,23')
  assert.equal(applyNativePadKey('1,23', 'delete', { decimal: ',', maxDigits: 3 }), '1,2')
  assert.equal(applyNativePadKey('', 'decimal', { decimal: ',' }), '0,')
}

async function checkWheelState() {
  const { nativeWheelMetrics, nativeWheelSettlement, nativeWheelWeight, nearestNativeWheelItem, stepNativeWheelItem } = await nativeStateModule('wheel-state.ts')
  const items = ['09:00', '10:00', '11:00', '12:00'].map((value, index) => ({ value, label: value, disabled: index === 1 }))
  assert.deepEqual(nativeWheelMetrics(44, 4), { row: 44, count: 5, viewport: 220, padding: 88 })
  assert.equal(nearestNativeWheelItem(items, 1, -1), 0)
  assert.equal(nearestNativeWheelItem(items, 1, 1), 2)
  assert.equal(nearestNativeWheelItem([{ label: 'Closed', value: 1, disabled: true }], 0), -1)
  assert.equal(stepNativeWheelItem(items, 0, 1), 2)
  assert.equal(stepNativeWheelItem(items, 3, 1), 3)
  assert.equal(nativeWheelWeight(2, 2, 5), 1)
  assert.equal(nativeWheelWeight(0, 2, 5), 0)
  const settlement = nativeWheelSettlement()
  const first = Symbol('first')
  const second = Symbol('second')
  settlement.activity(first, true)
  settlement.activity(second, true)
  settlement.mark()
  settlement.activity(first, false)
  assert.equal(settlement.take(), false)
  settlement.activity(second, false)
  assert.equal(settlement.take(), true)
  assert.equal(settlement.take(), false)
  settlement.mark()
  settlement.discard()
  assert.equal(settlement.take(), false)
}

async function checkDateProState() {
  const dateLibrary = import.meta.resolve('@internationalized/date')
  const { CalendarDate, parseDateTime } = await import(dateLibrary)
  const calendarState = await nativeStateURL('calendar-state.ts', { '@internationalized/date': dateLibrary })
  const { nativeCalendarRows, nativeCalendarWeekday, nativeCalendarCanPage, readNativeDateDraft } = await import(calendarState)
  const leap = new CalendarDate(2024, 2, 29)
  const weeks = nativeCalendarRows(leap, 1)
  assert.equal(weeks.length, 6)
  assert.equal(weeks[0][0].toString(), '2024-01-29')
  assert.equal(nativeCalendarWeekday(leap), 4)
  assert.equal(nativeCalendarCanPage(leap, 1, { maxDate: leap }), false)
  assert.equal(readNativeDateDraft({ year: '2024', month: '02', day: '30' }, leap.calendar, leap.era), undefined)
  assert.equal(readNativeDateDraft({ year: '2024', month: '02', day: '29' }, leap.calendar, leap.era).toString(), '2024-02-29')
  const { nativeAgendaEventsForDay, nativeAgendaLanes, editNativeAgendaEvent } = await nativeStateModule('agenda-state.ts', { './calendar-state': calendarState })
  const events = [
    { id: 'overnight', title: 'Overnight', start: parseDateTime('2024-02-28T22:00'), end: parseDateTime('2024-02-29T09:15') },
    { id: 'review', title: 'Review', start: parseDateTime('2024-02-29T09:00'), end: parseDateTime('2024-02-29T10:00') },
    { id: 'delivery', title: 'Delivery', start: parseDateTime('2024-02-29T10:00'), end: parseDateTime('2024-02-29T11:00') },
  ]
  const items = nativeAgendaEventsForDay(events, leap)
  assert.deepEqual(items.map(item => [item.event.id, item.minute, item.duration]), [['overnight', 0, 555], ['review', 540, 60], ['delivery', 600, 60]])
  assert.deepEqual(nativeAgendaLanes(items).map(item => [item.lane, item.lanes]), [[0, 2], [1, 2], [0, 1]])
  assert.equal(editNativeAgendaEvent(events[1], { kind: 'move', minutes: 22, days: 1 }).start.toString(), '2024-03-01T09:15:00')
  assert.equal(editNativeAgendaEvent(events[1], { kind: 'end', minutes: -60 }), undefined)
}

async function checkTemporalState() {
  const dateLibrary = import.meta.resolve('@internationalized/date')
  const { CalendarDate, Time, parseDateTime } = await import(dateLibrary)
  const rangeModule = await nativeStateModule('range-state.ts')
  const range = rangeModule.nativeOrderedDates(new CalendarDate(2024, 3, 2), new CalendarDate(2024, 2, 28))
  assert.equal(rangeModule.nativeRangeLength(range), 4)
  assert.equal(rangeModule.nativeRangePosition(new CalendarDate(2024, 2, 29), range), 'inside')
  assert.equal(rangeModule.nativeRangeIssue(range, { maximumDays: 3 }), 'length')
  assert.equal(rangeModule.nativeRangeIssue(range, { isDateUnavailable: day => day.day === 29 }), 'unavailable')
  assert.equal(rangeModule.nativeRangeIssue(range, { isDateUnavailable: day => day.day === 29, allowNonContiguousRanges: true }), undefined)
  const timeModule = await nativeStateURL('time-state.ts', { '@internationalized/date': dateLibrary })
  const { nativeExactTime, nativeTimeOptions, nativeWallHour } = await import(timeModule)
  assert.equal(nativeWallHour(12, 12, 'am'), 0)
  assert.equal(nativeWallHour(12, 12, 'pm'), 12)
  const rules = { minTime: new Time(10, 14), maxTime: new Time(10, 57), minuteInterval: 15 }
  assert.deepEqual(nativeTimeOptions(10, rules).map(time => time.minute), [15, 30, 45])
  assert.equal(nativeExactTime(new Time(10, 17), rules), false)
  const { nativeAvailableDateTime, nativeDayHasSlots } = await nativeStateModule('datetime-state.ts', {
    '@internationalized/date': dateLibrary, './time-state': timeModule,
  })
  const day = new CalendarDate(2026, 11, 21)
  const options = { minDateTime: parseDateTime('2026-11-21T09:16'), maxDateTime: parseDateTime('2026-11-21T10:10'), minuteInterval: 15 }
  assert.equal(nativeDayHasSlots(day.subtract({ days: 1 }), options), false)
  assert.equal(nativeAvailableDateTime(day, new Time(9, 18), options).toString(), '2026-11-21T09:30:00')
  const { nativeWheelWindow } = await nativeStateModule('wheel-state.ts')
  assert.deepEqual(nativeWheelWindow(365, 180, 5), { first: 170, end: 195 })
  assert.deepEqual(nativeWheelWindow(365, 364, 5), { first: 350, end: 365 })
}

async function checkNavigationState() {
  const { nativePagerPosition, nativePagerOffset, nativePagerIndicator, nativeSplitBounds, nativeSplitPoints,
    nearestNativeSplitPoint, nativeMorphWidths, nearestNativePage } = await nativeStateModule('navigation-state.ts')
  assert.equal(nativePagerPosition(180, 360, 3), .5)
  assert.equal(nativePagerPosition(180, 360, 3, true), 1.5)
  assert.equal(nativePagerOffset(0, 360, 3, true), 720)
  assert.equal(nativePagerPosition(1200, 360, 3), 2)
  assert.deepEqual(nativePagerIndicator([{ x: 10, width: 88 }, { x: 104, width: 100 }], .25), { x: 33.5, width: 91 })
  assert.deepEqual(nativeMorphWidths(3, 340, 50, .25), [192.5, 97.5, 50])
  assert.equal(nearestNativePage([{}, { disabled: true }, {}], 1, 1), 2)
  assert.equal(nearestNativePage([{}, { disabled: true }, {}], 1, -1), 0)
  assert.deepEqual(nativeSplitBounds(210, 10, 160, 160), { space: 200, min: 100, max: 100 })
  assert.deepEqual(nativeSplitPoints([.33, 150, .75], 410, 10, 130, 150), [132, 150, 250])
  assert.equal(nearestNativeSplitPoint([100, 200, 300], 140, .5), 1)
}

async function checkFeedbackState() {
  const { nativeProgressRange, nativeProgressArc, nativeRatingValue, nativeRatingFill,
    nativeRatingTouch, nativeTrend, nativeCompactValue, nativeScientificValue } = await nativeStateModule('feedback-state.ts')
  assert.deepEqual(nativeProgressRange(15, 10, 30), { min: 10, max: 30, value: 15, ratio: .25 })
  assert.equal(nativeProgressRange(40, 10, 30).ratio, 1)
  assert.equal(nativeProgressRange(NaN, 10, 5).ratio, 0)
  assert.deepEqual(nativeProgressArc(58, 6, .25), { diameter: 58, line: 6, radius: 26, center: 29, start: -90, sweep: 90 })
  assert.equal(nativeProgressArc(40, 100, 2, 45).line, 20)
  assert.equal(nativeRatingValue(4.73, 5, .5), 4.5)
  assert.equal(nativeRatingValue(5, 5, .7), 5)
  assert.equal(nativeRatingFill(3.5, 3), .5)
  assert.equal(nativeRatingTouch(3, .2, 5, .5), 3.5)
  assert.equal(nativeRatingTouch(3, .8, 5, .5), 4)
  assert.equal(nativeTrend(.008, .01), 'flat')
  assert.equal(nativeTrend(-.04), 'down')
  assert.equal(nativeTrend(.04), 'up')
  assert.deepEqual(nativeScientificValue(.0000125, true), { value: 12.5, exponent: -6 })
  assert.deepEqual(nativeScientificValue(-125000, false), { value: -1.25, exponent: 5 })
  assert.deepEqual(nativeCompactValue(-12300, 'zh-CN'), { value: -1.23, suffix: '万' })
  assert.deepEqual(nativeCompactValue(1250000, 'en-US', true), { value: 1.25, suffix: ' million' })
}

async function checkDisplayState() {
  const { nativeBadgePosition, nativeBadgeText, nativeFlipFrame, nativeFlipSwipe } = await nativeStateModule('display-state.ts')
  assert.deepEqual(nativeBadgePosition('bottom-end', true, 3), { horizontal: 'left', vertical: 'bottom', x: -3, y: 3 })
  assert.equal(nativeBadgeText(127, 99, false, String), '99+')
  assert.equal(nativeBadgeText(0, 99, false, String), '')
  assert.equal(nativeBadgeText(0, 99, true, String), '0')
  assert.deepEqual(nativeFlipFrame(.25), { back: false, angle: 45 })
  assert.deepEqual(nativeFlipFrame(.75, true), { back: true, angle: 45 })
  assert.equal(nativeFlipSwipe(80, 20, true, false), false)
  assert.equal(nativeFlipSwipe(80, 20, true, true), true)
  assert.equal(nativeFlipSwipe(25, 75, true, false), undefined)
  const { nativeCarouselLayout, nativeCarouselOffset, nativeCarouselProgress,
    nativeCarouselVisible, nearestNativeCarouselSnap } = await nativeStateModule('carousel-state.ts')
  assert.deepEqual(nativeCarouselLayout(360, 3, { gap: 12 }).snap, [0, 372, 744])
  const layout = nativeCarouselLayout(360, 4, { padding: 16, perView: 2, align: 'center' })
  assert.deepEqual(layout.snap, [0, 86, 258, 344])
  assert.equal(nearestNativeCarouselSnap(layout.snap, 250, 1), 2)
  assert.equal(nativeCarouselProgress(layout.snap, 172, 1), 1.5)
  assert.equal(nativeCarouselProgress([0, 90, 90], 90, 2), 2)
  assert.equal(nativeCarouselOffset(90, layout.max, true), 254)
  assert.equal(nativeCarouselVisible(10, 100, 60, 360), .5)
}

async function checkActionState() {
  const { holdRatio, slideRatio, slideCompleted, morphOrigin, placeMorph, socialProviders } = await nativeStateModule('action-state.ts')
  assert.equal(holdRatio(100, 650, 1100), .5)
  assert.equal(holdRatio(800, 790, 1000), 0)
  assert.equal(holdRatio(100, 2500, 1000), 1)
  assert.equal(slideRatio(350, 180, 200, true), .85)
  assert.equal(slideRatio(0, 4, 0), 0)
  assert.equal(slideCompleted(.849, .85), false)
  assert.equal(slideCompleted(.85, .85), true)
  assert.deepEqual(morphOrigin('top-start'), { x: 1, y: 1 })
  assert.deepEqual(morphOrigin('top-start', true), { x: 0, y: 1 })
  assert.deepEqual(morphOrigin('end'), { x: 0, y: .5 })
  assert.deepEqual(placeMorph({ width: 390, height: 820 }, { x: 117, y: 100, width: 48, height: 48 },
    { width: 155, height: 130 }, morphOrigin('top-start'), 12), { x: 12, y: 18, width: 155, height: 130 })
  assert.deepEqual(placeMorph({ width: 320, height: 450 }, { x: 285, y: 407, width: 40, height: 40 },
    { width: 510, height: 560 }, morphOrigin('bottom-end'), 10), { x: 10, y: 10, width: 300, height: 430 })
  assert.equal(Object.keys(socialProviders).length, 11)
}

async function checkCollectionState() {
  const { activeCollectionItem, scrollEdges, tagRemovalTarget, toggleCollectionSelection } = await nativeStateModule('collection-state.ts')
  const items = [
    { id: 0, label: 'Summary' },
    { id: 1, label: 'Archive', disabled: true },
    { id: 2, label: 'Project' },
  ]
  assert.equal(activeCollectionItem(items, 1), items[0])
  assert.equal(activeCollectionItem(items, 2), items[2])
  assert.equal(activeCollectionItem([items[1]], undefined), undefined)
  assert.deepEqual(toggleCollectionSelection([0], 0, 'single', false), [0])
  assert.deepEqual(toggleCollectionSelection([0], '0', 'single', false), ['0'])
  assert.deepEqual(toggleCollectionSelection([0, 2], 0, 'multiple', false), [2])
  assert.deepEqual(toggleCollectionSelection([0], 2, 'none'), [0])
  assert.equal(tagRemovalTarget(items, 1, new Set()), items[2])
  assert.equal(tagRemovalTarget(items, 1, new Set([2])), items[0])
  assert.deepEqual(scrollEdges(0, 0, 20), { leading: 0, trailing: 0 })
  assert.deepEqual(scrollEdges(-10, 40, 20), { leading: 0, trailing: 1 })
  assert.deepEqual(scrollEdges(30, 40, 20), { leading: 1, trailing: 0.5 })
  assert.deepEqual(scrollEdges(50, 40, 20), { leading: 1, trailing: 0 })
}

async function checkSliderState() {
  const {
    sliderDomain, sliderGap, sliderIndexAt, sliderPositions, sliderRatios, sliderThumbAt, sliderThumbBounds, sliderValueAt,
  } = await nativeStateModule('slider-state.ts')
  const decimals = sliderDomain(-0.1, 1, 0.3)
  assert.equal(decimals.last, 4)
  assert.deepEqual([0, 1, 2, 3, 4].map(index => sliderValueAt(decimals, index)), [-0.1, 0.2, 0.5, 0.8, 1])
  assert.equal(sliderIndexAt(decimals, 0.89), 3)
  assert.equal(sliderIndexAt(decimals, 0.91), 4)
  assert.equal(sliderIndexAt(decimals, 2), 4)
  assert.equal(sliderDomain(0, 0.3, 0.1).last, 3)
  const largeOffset = sliderDomain(1e13, 1e13 + 1, 0.01)
  assert.equal(sliderValueAt(largeOffset, 1), 1e13 + 0.01)
  assert.deepEqual(sliderRatios(sliderDomain(1, 1, 0), [0]), [0])
  const range = sliderDomain(0, 100, 10)
  assert.deepEqual(sliderPositions(range, [89, 88], 3), [7, 10])
  assert.deepEqual(sliderPositions(range, [], 0), [0])
  assert.equal(sliderGap(range, 4, 10), 3)
  assert.deepEqual(sliderThumbBounds([2, 5, 9], 1, range.last, 2), { min: 4, max: 7 })
  assert.equal(sliderThumbAt([0.2, 0.5, 0.5, 0.8], 0.5, -1), 1)
  assert.equal(sliderThumbAt([0.2, 0.5, 0.5, 0.8], 0.5, 1), 2)
  assert.equal(sliderThumbAt([0.25, 0.75], 0.5, -1), 0)
  assert.equal(sliderThumbAt([0.25, 0.75], 0.5, 1), 1)
}

async function checkToastQueue() {
  const { createNativeToastQueue } = await nativeStateModule('toast-queue.ts')
  const visible = []
  const timers = new Map()
  let time = 0
  let timer = 0
  const queue = createNativeToastQueue(items => visible.splice(0, visible.length, ...items), () => ({
    duration: 50, maxVisible: 2,
  }), {
    now: () => time,
    set(callback, delay) {
      timers.set(++timer, { callback, due: time + delay })
      return timer
    },
    clear: id => timers.delete(id),
  })
  const advance = delta => {
    const until = time + delta
    for (;;) {
      const next = [...timers].filter(([, task]) => task.due <= until).sort((a, b) => a[1].due - b[1].due)[0]
      if (!next) break
      const [id, { callback, due }] = next
      time = due
      timers.delete(id)
      callback()
    }
    time = until
  }
  let shown = 0
  let hidden = 0
  const first = queue.show({ id: 'first', label: 'First', onShow: () => shown++, onHide: () => hidden++ })
  assert.equal(queue.show({ id: first, label: 'Duplicate' }), first)
  const second = queue.show({ label: 'Second', duration: 'persistent' })
  const third = queue.show('Third')
  const fourth = queue.show('Fourth')
  assert.deepEqual(visible.map(item => item.id), [first, second])
  advance(100)
  assert.equal(timers.size, 0)
  queue.entered(first)
  queue.entered(first)
  queue.entered(second)
  advance(20)
  queue.pause(first, 'touch', true)
  queue.pauseAll('application', true)
  queue.pause(first, 'touch', false)
  advance(100)
  assert.equal(visible[0].phase, 'visible')
  queue.pauseAll('application', false)
  advance(29)
  assert.equal(visible[0].phase, 'visible')
  advance(1)
  assert.equal(visible[0].phase, 'leaving')
  assert.equal(visible.length, 2)
  queue.exited(first)
  assert.deepEqual(visible.map(item => item.id), [second, third])
  assert.equal(shown, 1)
  assert.equal(hidden, 1)
  queue.hide([third, fourth])
  queue.exited(third)
  assert.deepEqual(visible.map(item => item.id), [second])
  queue.hide('all')
  queue.exited(second)
  assert.equal(visible.length, 0)
  queue.dispose()
  assert.equal(timers.size, 0)
}

async function checkSheetState() {
  const { sheetDetents, sheetIndex, sheetHeights } = await nativeStateModule('sheet-state.ts')
  assert.deepEqual(sheetDetents(), ['auto'])
  assert.deepEqual(sheetDetents([0, -0.5, 'peek', 0.48, 0.86, 1]), ['peek', 0.48, 0.86])
  assert.equal(sheetIndex(5, 3), 2)
  assert.equal(sheetIndex(-1, 3), 0)
  assert.deepEqual(sheetHeights(['peek', 0.5, 0.86], 600, 105, 500), [105, 300, 516])
  assert.deepEqual(sheetHeights(['auto'], 600, 105, 200), [305])
  assert.deepEqual(sheetHeights(['auto'], 235, 155, 300), [235])
  assert.deepEqual(sheetHeights(['peek', 0.5, 0.86], 220, 220, 500), [218, 219, 220])
}

async function checkAnchoredOverlays() {
  const { popoverWidth, placePopover } = await nativeStateModule('popover-state.ts')
  const { adjacentMenuItem } = await nativeStateModule('menu-state.ts')
  const viewport = { x: 0, y: 0, width: 360, height: 640 }
  const defaults = { side: 'right', align: 'start', offset: 8, alignOffset: 0, inset: 12, rtl: false, avoidCollisions: true }
  assert.equal(popoverWidth('trigger', 44, 100, 360), 44)
  assert.equal(popoverWidth('full', 200, 100, 336), 336)
  assert.deepEqual(placePopover(viewport, { x: 280, y: 100, width: 60, height: 44 }, { width: 220, height: 100 }, defaults),
    { x: 52, y: 100, width: 220, height: 100, side: 'left' })
  assert.deepEqual(placePopover(viewport, { x: 90, y: 100, width: 80, height: 44 }, { width: 120, height: 100 }, {
    ...defaults, side: 'bottom', rtl: true,
  }), { x: 50, y: 152, width: 120, height: 100, side: 'bottom' })
  assert.equal(placePopover(viewport, { x: 100, y: 560, width: 100, height: 40 }, { width: 200, height: 600 },
    { ...defaults, side: 'bottom' }).height, 540)
  const items = [{ id: 0 }, { id: 'disabled', disabled: true }, { id: 2 }]
  assert.equal(adjacentMenuItem(items, 0, 'next').id, 2)
  assert.equal(adjacentMenuItem(items, 2, 'next').id, 0)
  assert.equal(adjacentMenuItem(items, 0, 'previous').id, 2)
  assert.equal(adjacentMenuItem(items, undefined, 'last').id, 2)
  assert.equal(adjacentMenuItem([items[1]], undefined, 'first'), undefined)
}

async function checkMaterials() {
  const { glassEffect, surfaceColor } = await nativeStateModule('material-state.ts')
  const modern = { liquid: true, blur: true, opaque: false }
  const older = { liquid: false, blur: true, opaque: false }
  const solid = { liquid: false, blur: false, opaque: false }
  assert.equal(glassEffect('clear', true, false, modern), 'clear')
  assert.equal(glassEffect('regular', true, false, older), 'solid')
  assert.equal(glassEffect('blur', true, false, older), 'blur')
  assert.equal(glassEffect('blur', true, false, solid), 'solid')
  assert.equal(glassEffect('regular', true, false, { ...modern, opaque: true }), 'solid')
  assert.equal(glassEffect('regular', false, false, modern), 'solid')
  assert.equal(glassEffect('regular', true, true, modern), 'solid')
  assert.equal(surfaceColor({ surface: '#eee', surfaceSage: '#ada', canvas: '#121' }, 'sage'), '#ada')
  assert.equal(surfaceColor({ canvas: '#121' }, 'canvas'), '#121')
  assert.equal(surfaceColor({}, 'plain'), 'transparent')
}

try {
  await checkFormState()
  await checkInputProState()
  await checkWheelState()
  await checkDateProState()
  await checkTemporalState()
  await checkNavigationState()
  await checkFeedbackState()
  await checkDisplayState()
  await checkActionState()
  await checkCollectionState()
  await checkSliderState()
  await checkToastQueue()
  await checkSheetState()
  await checkAnchoredOverlays()
  await checkMaterials()
  await cp(source, consumer, {
    recursive: true,
    filter: path => !['dist', 'hooks', 'node_modules', 'platforms'].includes(basename(path)),
  })
  pnpm(['--filter', '@syntrofic/ui-native', 'pack', '--pack-destination', work], root)
  const archive = (await readdir(work)).find(file => file.endsWith('.tgz'))
  assert(archive, 'Native package tarball was not produced')
  const manifestPath = join(consumer, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.dependencies['@syntrofic/ui-native'] = `file:../${archive}`
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  pnpm(['install', '--ignore-scripts', '--prefer-offline'], consumer)
  pnpm(['typecheck'], consumer)

  const modules = join(consumer, 'node_modules/@syntrofic/ui-native')
  const packedManifest = JSON.parse(await readFile(join(modules, 'package.json'), 'utf8'))
  const dist = join(modules, 'dist')
  const files = (await readdir(dist)).filter(file => file.endsWith('.js'))
  const javascript = (await Promise.all(files.map(file => readFile(join(dist, file), 'utf8')))).join('\n')
  assert.match(javascript, /from "nativescript-vue"/)
  assert.match(javascript, /from "@nativescript\/core"/)
  assert.doesNotMatch(javascript, /from "(?:vue|@vue\/runtime-dom)"/)
  assert.match(javascript, /from "@nativescript-community\/ui-bottomsheet"/)
  const nativeSheet = join(dirname(dirname(await realpath(modules))), '@nativescript-community/ui-bottomsheet')
  assert.match(await readFile(join(nativeSheet, 'platforms/android/include.gradle'), 'utf8'), /com.google.android.material:material/)
  assert.match(await readFile(join(nativeSheet, 'index.ios.js'), 'utf8'), /UISheetPresentationControllerDetent/)
  assert.match(await readFile(join(modules, packedManifest.exports['./radio'].import), 'utf8'), / as default/)
  assert.match(await readFile(join(modules, packedManifest.exports['./radio'].types), 'utf8'), /SNativeRadio\.vue/)
  assert.match(await readFile(join(modules, packedManifest.exports['./sub-menu'].import), 'utf8'), / as default/)
  assert.match(await readFile(join(modules, packedManifest.exports['./sub-menu'].types), 'utf8'), /SNativeSubMenu\.vue/)
  for (const [subpath, component] of [['./glass-view', 'SNativeGlassView'], ['./theme-background', 'SNativeThemeBackground']]) {
    assert.match(await readFile(join(modules, packedManifest.exports[subpath].import), 'utf8'), / as default/)
    assert.match(await readFile(join(modules, packedManifest.exports[subpath].types), 'utf8'), new RegExp(component + '\\.vue'))
  }
  const themeModule = pathToFileURL(join(modules, packedManifest.exports['./theme'].import))
  const { createNativeTheme } = await import(themeModule)
  const light = createNativeTheme()
  const branded = createNativeTheme('dark', { accent: '#59907d' })
  assert.equal(light.colors.accent, '#425849')
  assert.equal(branded.colors.accent, '#59907d')
  assert.equal(branded.appearance, 'dark')
  assert.notEqual(light.colors.canvas, branded.colors.canvas)
  assert.equal(createNativeTheme('dark').colors.accent, '#a8bda9')
  assert.equal(light.motion.settle.length, 4)

  const entries = JSON.parse(await readFile(join(root, 'catalog/implementation.json'), 'utf8'))
  const reviewed = Object.entries(entries).filter(([id]) => /^NP?\./.test(id))
  assert(reviewed.length > 0, 'No Native review entries are recorded')
  const vendor = []
  for (const platform of ['ios', 'android']) {
    pnpm([`bundle:${platform}`], consumer)
    const output = join(consumer, 'dist', platform)
    for (const font of ['Arimo.ttf', 'NotoSansSC.ttf', 'SyntroficIcons.ttf']) {
      const bundled = await readFile(join(output, 'fonts', font))
      assert(bundled.subarray(0, 4).equals(Buffer.from([0, 1, 0, 0])), `Invalid ${font} in ${platform} demo`)
    }
    const bundle = await readFile(join(output, 'bundle.js'), 'utf8')
    for (const [id] of reviewed) assert(bundle.includes(id), `Missing ${id} in ${platform} demo`)
    const platformCode = await readFile(join(output, 'vendor.js'))
    assert.match(platformCode.toString('utf8'), platform === 'ios' ? /customDetentWithIdentifierResolver/ : /BottomSheetDialogFragment/)
    assert.match(bundle + platformCode.toString('utf8'), /UIAccessibilityReduceTransparencyStatusDidChangeNotification/)
    vendor.push(platformCode)
  }
  assert.notDeepEqual(vendor[0], vendor[1], 'NativeScript emitted identical platform bundles')
  console.log(`Packed Native components and bundled ${reviewed.length} scenes for iOS and Android.`)
} finally {
  await rm(work, { recursive: true, force: true })
}
