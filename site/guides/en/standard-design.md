## Colors and surfaces

The light theme uses a white page canvas. Neutral surfaces and spacing distinguish functional groups, with borders reserved for controls that need a clear boundary or state cue. Muted green identifies primary actions and selected options. Use text or icons with semantic colors so status is legible without relying on hue. [Design rules](/docs/design-rules/)

Buttons use fully rounded corners. Text, number, date, and select fields default to 9 px. Code blocks use 14 px, with 12 px on their copy buttons. Standard dialogs use smaller corners and extra vertical padding. Dropdowns use a slightly darker translucent surface and blur where supported.

## Content and density

Lead with the content and available actions. Keep explanations that help users complete a task. Web cards, panels, layouts, and overlays use an 8 px default inset. Card regions are 4 px apart, panel content is 8 px apart, and form fields are 12 px apart. Native surfaces use `theme.geometry.space2`.

## Interaction and motion

Shared header, toolbar, and sidebar geometry stays fixed throughout navigation. Component navigation preserves the independent sidebar scroll position. In-page switches keep headings, tabs, filters, and triggers anchored. As results or panels change height, animate only their affected regions using the theme's nonlinear easing. Preserve focus and resume interrupted transitions from their current state.

Reserve space for traditional scrollbars. Modal overlays share the document scroll lock. When reduced motion is enabled, commit the final layout immediately. Render the route, template shell, and large previews directly in their final positions. Lazy demos replace placeholders in normal flow once ready.

Use `createAnimator`, `useAnimatedLayout`, and `useEntryAnimation` for local interactions aligned with the motion tokens.

## Astryx comparison

The table below compares a fixed Astryx source revision with corresponding Syntrofic components, functions, motion, themes, and templates. Results identify a working counterpart, partial coverage, or a gap. [Comparison of standalone examples](/docs/standard-design/examples/)
