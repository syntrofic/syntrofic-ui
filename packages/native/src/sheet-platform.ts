import { Color, Screen, Utils, isAndroid, isIOS, type View } from '@nativescript/core'
import type { BottomSheetDetent, BottomSheetOptions } from '@nativescript-community/ui-bottomsheet'
import { sheetHeights, type NativeSheetDetent } from './sheet-state'

export interface SheetSize {
  chrome: number
  body: number
}

interface SheetSettings {
  detents: readonly NativeSheetDetent[]
  index: number
  background: string
  draggable: boolean
  dismissible: boolean
  dismissOnOutside: boolean
  grabber: boolean
  dimOpacity: number
  reducedMotion: boolean
}

interface CocoaDetent {
  identifier: string
}

const platform = globalThis as typeof globalThis & {
  NSArray?: { arrayWithArray: (views: CocoaDetent[]) => unknown }
  UISheetPresentationControllerDetent?: {
    mediumDetent: () => CocoaDetent
    largeDetent: () => CocoaDetent
    customDetentWithIdentifierResolver?: (id: string, size: (context: { maximumDetentValue: number }) => number) => CocoaDetent
  }
}

type SheetView = View & {
  bottomSheetController?: {
    view: { backgroundColor: unknown }
    modalInPresentation?: boolean
    sheetPresentationController?: {
      detents: unknown
      selectedDetentIdentifier: string
      prefersGrabberVisible: boolean
      invalidateDetents?: () => void
      animateChanges: (change: () => void) => void
    }
  }
  _detentIds?: string[]
  _bottomSheetBehavior?: {
    setDraggable: (draggable: boolean) => void
    setHideable: (hideable: boolean) => void
  }
  _bottomSheetWindow?: { setDimAmount: (amount: number) => void }
  applyDetents?: (frame: unknown, behavior: unknown, options: Partial<BottomSheetOptions>) => void
}

export function initialNativeDetents(detents: readonly NativeSheetDetent[]): BottomSheetDetent[] {
  const estimate = sheetHeights(detents, Screen.mainScreen.heightDIPs, 96, 128)
  return detents.map((detent, index) => detent === 'auto' ? 'content' : detent === 'peek' ? estimate[index] : { fraction: detent })
}

export function createSheetPlatform(view: SheetView, size: () => SheetSize, getSettings: () => SheetSettings) {
  let geometry = ''
  let measuredStops = ''
  let selected = -1
  let currentLegacyIndices: number[] | undefined
  const heights = (height: number, detents = getSettings().detents) => sheetHeights(detents, height, size().chrome, size().body)
  const margin = () => Math.max(0, view.android?.getLayoutParams()?.topMargin ?? 0)

  function updateAndroid() {
    const settings = getSettings()
    const frame = view.android?.getParent()
    const outerHeight = frame?.getParent()?.getHeight()
    const behavior = view._bottomSheetBehavior
    if (!behavior || !outerHeight || !view.applyDetents) return
    const marginDips = Utils.layout.toDeviceIndependentPixels(margin())
    const { chrome, body } = size()
    const resolved = sheetHeights(settings.detents, Utils.layout.toDeviceIndependentPixels(outerHeight), chrome + marginDips, body)
    const key = resolved.join('/')
    if (key !== geometry) {
      geometry = key
      selected = settings.index
      // Material keeps the largest stop laid out. The Vue content uses only the visible part.
      const params = frame.getLayoutParams()
      if (params) {
        params.height = Math.round(Utils.layout.toDevicePixels(resolved.at(-1)!))
        frame.setLayoutParams(params)
      }
      view.applyDetents(frame, behavior, { detents: resolved, initialDetentIndex: settings.index })
    } else if (selected !== settings.index) {
      selected = settings.index
      view.setBottomSheetDetentIndex(selected, !settings.reducedMotion)
    }
    frame.getBackground()?.mutate()?.setTint(new Color(settings.background).android)
    frame.setElevation(0)
    behavior.setDraggable(settings.draggable)
    behavior.setHideable(settings.dismissible && settings.draggable)
    view._bottomSheetWindow?.setDimAmount(settings.dimOpacity)
  }

  function updateIOS() {
    const settings = getSettings()
    const controller = view.bottomSheetController
    if (!controller) return
    controller.view.backgroundColor = new Color(settings.background).ios
    const surface = controller.sheetPresentationController
    const factory = platform.UISheetPresentationControllerDetent
    const array = platform.NSArray
    if (!surface || !factory || !array) return
    controller.modalInPresentation = !settings.dismissible || !settings.dismissOnOutside || !settings.draggable
    surface.prefersGrabberVisible = settings.grabber && settings.draggable
    const { chrome, body } = size()
    const detents = settings.detents
    const indices = settings.draggable ? detents.map((_, index) => index) : [settings.index]
    const custom = factory.customDetentWithIdentifierResolver
    const key = [detents.join('/'), indices.join('/')].join(':')
    const measureKey = `${chrome}/${body}`
    const rebuild = geometry !== key
    const resize = measuredStops !== measureKey
    if (!rebuild && !resize && selected === settings.index) return
    const previous = selected
    selected = settings.index
    geometry = key
    measuredStops = measureKey

    function update() {
      if (!surface || !factory || !array) return
      if (rebuild) {
        let native: CocoaDetent[]
        if (custom) {
          currentLegacyIndices = undefined
          native = indices.map(index => factory.customDetentWithIdentifierResolver!(
            `detent-${index}`, context => heights(context.maximumDetentValue)[index],
          ))
          view._detentIds = detents.map((_, index) => `detent-${index}`)
        } else {
          const estimate = heights(Screen.mainScreen.heightDIPs)
          const indexSet = indices.length > 2 ? [indices[0], indices.at(-1)!] : indices
          currentLegacyIndices = indexSet
          native = indexSet.map((index, slot) => (indexSet.length === 2 ? slot === 0 : estimate[index] < Screen.mainScreen.heightDIPs * 0.63)
            ? factory.mediumDetent() : factory.largeDetent())
          view._detentIds = native.map(item => item.identifier)
        }
        surface.detents = array.arrayWithArray(native)
      }
      if (resize) surface.invalidateDetents?.()
      const index = currentLegacyIndices ? currentLegacyIndices.indexOf(settings.index) : settings.index
      const id = view._detentIds?.[index < 0 ? (view._detentIds.length - 1) : index]
      if (id) surface.selectedDetentIdentifier = id
    }
    if (previous >= 0 && !settings.reducedMotion) surface.animateChanges(update)
    else update()
  }

  function sync() {
    if (isAndroid) updateAndroid()
    if (isIOS) updateIOS()
  }

  function visibleHeight() {
    if (!isAndroid) return undefined
    const frame = view.android?.getParent()
    const outer = frame?.getParent()?.getHeight()
    if (!outer) return undefined
    return Utils.layout.toDeviceIndependentPixels(Math.max(0, outer - frame.getTop() - margin()))
  }

  function detentFromNative(index: number) {
    return currentLegacyIndices?.[index] ?? index
  }

  return { sync, visibleHeight, detentFromNative }
}
