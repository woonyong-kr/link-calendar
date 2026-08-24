# Context Calendar design system

## Product principles

Context Calendar ships a Calendar-scoped visual system on top of Obsidian's
public semantic CSS variables:

1. **Fresh. Familiar. Focused.** The month is immediately recognizable, while
   controls and metadata recede until they are useful.
2. **Native-feeling and theme-compatible.** Surface, text, separator, accent,
   focus, spacing, radius, shadow, and motion values alias the active host
   theme instead of copying or overriding it.
3. **Less is more.** The month and event title lead. Borders, diagnostics, and
   filters remain quiet.
4. **Local and composable.** The plugin owns only elements beneath its own
   selectors. It never restyles Obsidian's workspace, editor, navigation, or
   another plugin.

## Source architecture

| Source | Ownership |
| --- | --- |
| src/styles/tokens.css | Calendar-scoped aliases to Obsidian's public semantic tokens plus calendar-only geometry |
| src/styles/shell.css | Toolbar, navigation, source lens, and main layout |
| src/styles/month-grid.css | Week headings, days, event cards, and deterministic category tones |
| src/styles/event-detail.css | Date header, event identity, read-only state, and property rows |
| src/styles/supporting.css | Diagnostics, onboarding, settings, embeds, and responsive boundaries |
| styles.css | Generated release artifact; never edited manually |

scripts/build-styles.mjs concatenates the sources in that order. Component files
are rejected when they contain literal colors, active-theme variables,
appearance selectors, theme names, important overrides, or unbalanced braces.

## Token contract

- Components consume only --cc-* design tokens.
- Shared aliases point to Obsidian public CSS variables. The plugin owns no
  literal light/dark palette.
- Every token selector is scoped to Context Calendar view, settings card, or
  embed. body, html, and :root selectors are forbidden.
- The plugin follows Obsidian and community themes through public semantic
  variables without depending on a theme name or private selector.
- Category values never become CSS class names. The model assigns stable
  anonymous tone-* slots that resolve through the embedded palette.
- Calendar density, day-grid geometry, category assignment, and page-peek
  layout remain plugin-owned and are never exported as shared design tokens.
- High contrast and forced-colors modes preserve text and focus semantics;
  category is also present in accessible names and never conveyed by color alone.

## Component hierarchy

The month view keeps this order:

1. navigation and month title;
2. search and optional source/context lens;
3. full month grid with measured responsive event density;
4. selected Markdown page peek.

The page peek keeps this order:

1. localized date and close action;
2. source, event title, capability state, and an explicit accessible **Open note** action;
3. a text-only excerpt loaded only after explicit selection;
4. one flat property sheet for date, category, people, project, related notes, links, and backlinks;
5. diagnostics only when invalid source data exists.

Category, people, and project values are filter facets. Related notes, wikilinks,
and backlinks are page relations: their primary click opens the Markdown file,
while filtering remains a secondary context-menu action. Page relations carry a
file icon and never reuse category-tone styling.

A single event is never repeated as an agenda card. The agenda switcher appears
only when a selected date has multiple events. Read-only status is capability
information, not a warning banner.

## Review gate

Every visual change must pass `npm run verify` and keep
`tests/fixtures/context-calendar-dark.html` representative of the product
hierarchy.

The verifier proves source isolation, host-token usage, responsive-density
policy, DOM behavior, visual-fixture completeness, dead-code checks, and release
integrity. Install the exact candidate assets in an isolated test Vault, reload
Obsidian, and check the month, event card, page peek, context links, empty/error
states, and read-only boundary before publishing.
