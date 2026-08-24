# Context Calendar design system

## Product principles

Context Calendar adopts four ideas from the [Cupertino theme](https://github.com/aaaaalexis/obsidian-cupertino) without copying or depending on its implementation.

1. **Native everywhere.** The active Obsidian theme owns typography, semantic color, radius, motion, and shadow.
2. **Less visual noise.** The month and event title lead; borders, controls, diagnostics, and filters recede until they are useful.
3. **Familiar interaction.** A month behaves like a calendar, and the selected event behaves like a property sheet rather than a second dashboard.
4. **Minimal configuration.** Users configure data sources and meaning, not a second theme inside the plugin.

Cupertino is MIT-licensed and is credited as design inspiration. Context Calendar does not import its CSS, inspect its theme class, or require it at runtime.

## Source architecture

| Source | Ownership |
| --- | --- |
| `src/styles/tokens.css` | The only local design-token definitions and Obsidian token fallbacks |
| `src/styles/shell.css` | Toolbar, navigation, source lens, and main layout |
| `src/styles/month-grid.css` | Week headings, days, event cards, and deterministic category tones |
| `src/styles/event-detail.css` | Date header, event identity, read-only state, and property rows |
| `src/styles/supporting.css` | Diagnostics, onboarding, settings, embeds, and responsive boundaries |
| `styles.css` | Generated release artifact; never the source for manual edits |

`scripts/build-styles.mjs` concatenates the sources in that order. It rejects component-level literal colors, appearance selectors, theme names, and `!important` before writing the release artifact.

## Token contract

- Components consume Obsidian semantic variables such as `--background-primary`, `--text-normal`, `--color-blue`, and `--interactive-accent`.
- `--cc-*` tokens may alias an Obsidian variable and provide a conservative fallback in `tokens.css` only.
- Category values never become CSS class names. The model assigns stable anonymous `tone-*` slots, and those slots resolve through the active theme palette.
- Light and dark behavior comes from the active theme variables. Component files must not contain `.theme-light`, `.theme-dark`, or a named-theme selector.
- Base token values and unavoidable responsive boundaries are the only literal dimensions. Component spacing and visual values should be promoted to a semantic token when reused or changed as part of the product language.

## Component hierarchy

The month view keeps this order:

1. navigation and month title;
2. search and optional source/context lens;
3. full month grid;
4. selected-event property panel.

The property panel keeps this order:

1. localized date and close action;
2. event title, subtle capability state, and explicit **Open note** action;
3. date, category, people, project, related notes, links, and backlinks;
4. diagnostics only when invalid source data exists.

A single event is never repeated as an agenda card. The agenda switcher appears only when the selected date has multiple events. Read-only status is capability information, not a warning banner.

## Review gate

Every visual change must pass:

```bash
npm run verify
```

Then install through the Woon receipt adapter, reload Obsidian, and visually attest the ribbon, month view, event card, context links, and read-only boundary. A generated hash or static screenshot alone does not prove the running plugin loaded the change.
