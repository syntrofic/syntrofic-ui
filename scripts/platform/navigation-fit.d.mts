export interface NavigationFitIssue {
  part: 'top-nav' | 'top-nav-heading' | 'top-nav-item' | 'top-nav-toggle'
  height: number
  available: number
  label?: string
  clipped?: boolean
  cssHeight?: number
  boxHeight?: number
  padding?: [number, number]
}

export interface NavigationFitSample {
  bar: 'app-shell-header' | 'layout-header' | 'top-nav'
  placement?: string
  density?: string
  state?: string
  viewport?: string
  available: number
  hostHeight: number
  rowHeight: number
  rowCssHeight: number
  rowInset: number
  controls: { part: NavigationFitIssue['part']; height: number }[]
  issues: NavigationFitIssue[]
}

export function measureNavigationFit(root?: ParentNode): NavigationFitSample[]
