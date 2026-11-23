import { Color, ImageSource, Utils, isAndroid, isIOS } from '@nativescript/core'
import type { nativeProgressArc } from './feedback-state'

type Arc = ReturnType<typeof nativeProgressArc>
type Paint = {
  setStyle(style: unknown): void
  setStrokeWidth(width: number): void
  setStrokeCap(cap: unknown): void
  setColor(color: number): void
}

type Graphics = typeof globalThis & {
  android?: { graphics: {
    Bitmap: { createBitmap(width: number, height: number, config: unknown): unknown; Config: { ARGB_8888: unknown } }
    Canvas: new (bitmap: unknown) => {
      drawCircle(x: number, y: number, radius: number, paint: Paint): void
      drawArc(rect: unknown, start: number, sweep: number, useCenter: boolean, paint: Paint): void
    }
    Paint: { new (flags: number): Paint; ANTI_ALIAS_FLAG: number; Style: { STROKE: unknown }; Cap: { ROUND: unknown } }
    RectF: new (left: number, top: number, right: number, bottom: number) => unknown
  } }
  UIGraphicsBeginImageContextWithOptions?: (size: { width: number; height: number }, opaque: boolean, scale: number) => void
  UIGraphicsGetCurrentContext?: () => unknown
  UIGraphicsGetImageFromCurrentImageContext?: () => unknown
  UIGraphicsEndImageContext?: () => void
  CGContextSetLineWidth?: (context: unknown, width: number) => void
  CGContextSetLineCap?: (context: unknown, cap: number) => void
  CGContextSetStrokeColorWithColor?: (context: unknown, color: unknown) => void
  CGContextAddArc?: (context: unknown, x: number, y: number, radius: number, start: number, end: number, clockwise: boolean) => void
  CGContextStrokePath?: (context: unknown) => void
}

const platform = globalThis as Graphics

function androidRing(arc: Arc, track: Color, fill: Color) {
  const edge = Math.ceil(Utils.layout.toDevicePixels(arc.diameter))
  const center = edge / 2
  const width = Utils.layout.toDevicePixels(arc.line)
  const radius = (edge - width) / 2
  if (!platform.android) return
  const { Bitmap, Canvas, Paint, RectF } = platform.android.graphics
  const bitmap = Bitmap.createBitmap(edge, edge, Bitmap.Config.ARGB_8888)
  const canvas = new Canvas(bitmap)
  const paint = new Paint(Paint.ANTI_ALIAS_FLAG)
  paint.setStyle(Paint.Style.STROKE)
  paint.setStrokeWidth(width)
  paint.setStrokeCap(Paint.Cap.ROUND)
  paint.setColor(track.android)
  canvas.drawCircle(center, center, radius, paint)
  if (arc.sweep > 0) {
    paint.setColor(fill.android)
    if (arc.sweep >= 360) canvas.drawCircle(center, center, radius, paint)
    else canvas.drawArc(new RectF(center - radius, center - radius, center + radius, center + radius), arc.start, arc.sweep, false, paint)
  }
  return bitmap
}

function iosRing(arc: Arc, track: Color, fill: Color) {
  const graphics = platform
  const { diameter, line, center, radius, start, sweep } = arc
  const radians = Math.PI / 180
  graphics.UIGraphicsBeginImageContextWithOptions?.({ width: diameter, height: diameter }, false, 0)
  try {
    const context = graphics.UIGraphicsGetCurrentContext?.()
    if (!context) return
    graphics.CGContextSetLineWidth?.(context, line)
    graphics.CGContextSetLineCap?.(context, 1)
    function stroke(color: Color, degrees: number) {
      graphics.CGContextSetStrokeColorWithColor?.(context, color.ios.CGColor)
      graphics.CGContextAddArc?.(context, center, center, radius, start * radians, (start + degrees) * radians, false)
      graphics.CGContextStrokePath?.(context)
    }
    stroke(track, 360)
    if (sweep > 0) stroke(fill, sweep)
    return graphics.UIGraphicsGetImageFromCurrentImageContext?.()
  } finally {
    graphics.UIGraphicsEndImageContext?.()
  }
}

export function nativeRingImage(arc: Arc, trackColor: string, fillColor: string) {
  const track = new Color(trackColor)
  const fill = new Color(fillColor)
  const bitmap = isAndroid ? androidRing(arc, track, fill) : isIOS ? iosRing(arc, track, fill) : undefined
  if (!bitmap) return
  const source = new ImageSource()
  source.setNativeSource(bitmap)
  return source
}
