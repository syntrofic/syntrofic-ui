import { getSyntroficIcon, syntroficIcons, syntroficIconViewBox } from '../src/icons/artwork.ts'

export { syntroficIcons }

export function icon(name) {
  const definition = getSyntroficIcon(name)
  if (!definition) throw new Error('Unknown site icon ' + name)
  return `<svg viewBox="${syntroficIconViewBox}" fill="currentColor" aria-hidden="true" focusable="false"><path d="${definition.path}"/></svg>`
}

export const iconDownloads = Object.entries(syntroficIcons).map(([name, { path }]) => [
  `/icons/svg/${name}.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${syntroficIconViewBox}" fill="currentColor"><path d="${path}"/></svg>\n`,
])
