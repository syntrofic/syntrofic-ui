import type { CSSOptions } from 'vite'

type PostcssOptions = Exclude<NonNullable<CSSOptions['postcss']>, string>

export function reducedMotionCss(): NonNullable<PostcssOptions['plugins']>[number]
