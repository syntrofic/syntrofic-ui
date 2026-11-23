import { defineComponent, h, type PropType } from 'nativescript-vue'
import { useNativeUI } from './context'

export type NativeStackAlignment = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
export type NativeStackDistribution = 'start' | 'center' | 'end' | 'between' | 'around'
const alignment = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' }
const distribution = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' }

function stack(name: string, axis: 'row' | 'column') {
  return defineComponent({
    name,
    props: {
      gap: Number,
      align: { type: String as PropType<NativeStackAlignment>, default: 'start' },
      justify: { type: String as PropType<NativeStackDistribution>, default: 'start' },
      wrap: Boolean,
      reversed: Boolean,
    },
    setup(props, { slots }) {
      const { theme, direction } = useNativeUI()
      return () => {
        const reverse = props.reversed !== (axis === 'row' && direction.value === 'rtl')
        const gap = typeof props.gap === 'number' && Number.isFinite(props.gap) ? Math.max(0, props.gap) : theme.value.geometry.space2
        return h('FlexboxLayout', {
          direction: 'ltr', flexDirection: reverse ? axis + '-reverse' : axis, flexWrap: props.wrap ? 'wrap' : 'nowrap',
          alignItems: alignment[props.align], justifyContent: distribution[props.justify], columnGap: gap, rowGap: gap,
        }, slots.default?.())
      }
    },
  })
}

export const SNativeHStack = stack('SNativeHStack', 'row')
export const SNativeVStack = stack('SNativeVStack', 'column')
