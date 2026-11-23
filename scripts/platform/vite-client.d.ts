declare module 'virtual:syntrofic-theme' {
  import type { BrandTheme } from '@syntrofic/ui'
  export const themes: Readonly<Partial<Record<string, BrandTheme>>>
  export const activeTheme: string | null
  export const defaultTheme: BrandTheme | undefined
  export default defaultTheme
}

declare module 'virtual:syntrofic-theme.css' {}

declare module 'virtual:syntrofic-icons' {
  import type { IconSet } from '@syntrofic/ui'
  const icons: IconSet
  export default icons
}
