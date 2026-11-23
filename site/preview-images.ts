import { decodeLoadedImage } from '../src/internal/image-decoding'

export function installPreviewImages(root: ParentNode) {
  for (const preview of root.querySelectorAll<HTMLElement>('[data-site-preview]')) {
    const image = preview.querySelector<HTMLImageElement>('img')
    if (!image) continue
    const reveal = () => {
      void decodeLoadedImage(image).then(success => {
        preview.dataset.previewState = success ? 'ready' : 'failed'
      })
    }
    // An already displayed image can be decoded without covering it again.
    if (image.complete) { reveal(); continue }
    preview.dataset.previewState = 'loading'
    image.addEventListener('error', () => { preview.dataset.previewState = 'failed' }, { once: true })
    image.addEventListener('load', reveal, { once: true })
  }
}
