## Canvas and color

- Use pure white `#ffffff` for the page canvas in light appearance. Apply `--sy-canvas` to the page and `--sy-surface` to ordinary surfaces. The website follows the system by default. Its appearance menu also offers fixed light and dark modes.
- Use `--sy-text` for body text and `--sy-text-muted` for secondary text. Use muted green `--sy-accent` for primary actions and `--sy-accent-soft` for selection. Pair each status color with readable text or a distinguishable icon.
- Place page content, workspaces, and templates directly on the canvas. Use spacing to separate content, navigation, and tools. Apply `--sy-surface-subtle` (light default `#f8f8f8`) only to independent functional sections and `--sy-control` to fields. Keep the page, preview, and template wrappers free of decorative backgrounds, borders, and shadows.
- Distinguish ordinary sections through spacing and subtle contrast. Give individual component examples their own light gray surfaces. Use a high-contrast inset indicator for keyboard focus. A composite input shows one focus outline inside the group and hides its hover outline while focused. Dropdowns use a slightly darker translucent surface with light blur. Use a solid surface when reduced transparency is requested.
- Documentation tables use 1 px light gray borders around the table and between rows and columns. Let cell content wrap on narrow screens.
- For landing pages and documentation indexes, establish hierarchy through shared column edges, consistent column proportions, and spacing. Stack sections in reading order on narrow screens. Use subtle gray fills to distinguish independent sections and examples. One layer is sufficient for most sections.
- The white page is the canvas. Nest at most two layers of layout fills in any one area. Use a slight change in tone for a child area that needs its own identity, such as the preview area within an example card. Count adjacent sections separately. Button and input fills belong to their control states.
- In dark appearance, dim content photos and template thumbnails by about 28%. Brand marks and vector icons use their own theme colors.

## Radius and density

| Element | Web default | Use |
| --- | --- | --- |
| Action button | Fully rounded | Use `SButton` and the optional `--sy-button-radius` override |
| Text, number, date, and select fields | 9 px | Use the field components and the optional `--sy-radius-field` override |
| Code block and its copy button | 14 px and 12 px | Use `SCodeBlock` and the optional `--sy-radius-code` override |
| Standard dialog | 12 px small, 14 px medium, 20 px large | Use `SDialog` with 16 px default padding at the top and bottom |
| Local functional surface | Component default | Keep theme inheritance and leave the page canvas unframed |

Use `--sy-inset` (8 px) for compact Web sections, `--sy-space-1` (4 px) for small gaps, and `--sy-space-3` (12 px) between form fields. Lead with headings, content, and actions. Keep labels, validation feedback, and results that help users act. Use native components and the `SNativeProvider` geometry and color tokens for Native.

## First paint and interaction

- Render the first screen, page body, template shell, large preview, and shared navigation immediately in their final positions. Keep their first render, hydration, route changes, and history navigation free of entrance fades, slides, scale, clipping, and expansion. Use a skeleton to show the wait and reserve predictable dimensions. Replace it in normal flow when the content is ready.
- Keep headers, sidebars, toolbars, and scrollbar space stable across routes. The active navigation marker can move on its own. Keep headings, filters, tabs, and triggers fixed during in-page updates. Use equal sidebar insets and scrollbar gutters, with a subtle thin thumb and transparent track.
- Animate local changes triggered by the user with `--sy-motion-replace` and `--sy-ease-settle` (`cubic-bezier(.23, .72, .24, 1)`). For example, reveal the bulk action row after a table selection by easing its height and moving the table with it. Limit motion to the affected content and dimensions.
- Use library menus, dialogs, focus handling, and the shared document scroll lock. Resume interrupted interactions from the current state. Restore focus to the trigger when closing an overlay. Respect system and theme reduced motion and commit the final layout immediately.

## Build with these rules

1. Import `@syntrofic/ui/style.css` and use the default theme and semantic tokens. Check `syntrofic component <name> --props` for an existing component and `syntrofic template list` for a starting layout.
2. Use semantic layout or `SLayout` around the page. Use existing controls for actions, inputs, code, and dialogs. Reserve subtle surfaces for genuinely independent content.
3. Verify the white canvas, role-specific radius, static first paint, content swaps, keyboard focus, and reduced motion. Check desktop and mobile sizing, including traditional scrollbars. The website runs `pnpm check:site-stability`.

Read this guide with `pnpm exec syntrofic docs design-rules/en`. Run `pnpm exec syntrofic init --features agents` to add the entry point and core rules to the project's agent instructions. [Raw Markdown](/en/design-rules.md) · [Standard design and examples](/docs/standard-design/)
