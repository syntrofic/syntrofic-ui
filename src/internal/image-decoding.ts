export function decodeLoadedImage(image: HTMLImageElement): Promise<boolean> {
  if (!image.naturalWidth) return Promise.resolve(false)
  return typeof image.decode === 'function' ? image.decode().then(() => true, () => false) : Promise.resolve(true)
}
