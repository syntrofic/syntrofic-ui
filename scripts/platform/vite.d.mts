export function syntroficThemePlugin(options?: { manifests?: readonly string[]; registry?: string | false }): {
  name: string
  configResolved(config: { root: string }): void
  resolveId(id: string): string | undefined
  load(this: { addWatchFile(path: string): void }, id: string): Promise<string | undefined>
}
