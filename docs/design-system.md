# Context Calendar design system

## Product principles

Context Calendar ships its own Calendar-scoped visual system, adapted from
[Cupertino](https://github.com/aaaaalexis/obsidian-cupertino):

1. **Fresh. Familiar. Focused.** The month is immediately recognizable, while
   controls and metadata recede until they are useful.
2. **Native-feeling, not theme-dependent.** Calendar typography, semantic color,
   radius, motion, shadow, and control geometry live in this repository and do
   not change when the active Obsidian community theme changes.
3. **Less is more.** The month and event title lead. Borders, diagnostics, and
   filters remain quiet.
4. **Local and composable.** The plugin owns only elements beneath its own
   selectors. It never restyles Obsidian's workspace, editor, navigation, or
   another plugin.

Cupertino 3.2.12 at upstream commit
080cea8d2c680c66e26b61b58970e56fd6f30ae4 is the reference. The adapted
primitives and MIT notice are retained in
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Source architecture

| Source | Ownership |
| --- | --- |
| src/styles/tokens.css | Calendar-scoped light/dark palette, typography, spacing, radius, motion, shadow, and controls |
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
- Literal palette values and light/dark selectors exist only in
  src/styles/tokens.css.
- Every token selector is scoped to Context Calendar view, settings card, or
  embed. body, html, and :root selectors are forbidden.
- The plugin follows Obsidian's light/dark state, but it does not consume a
  community theme's colors, fonts, radii, motion, or shadows.
- Category values never become CSS class names. The model assigns stable
  anonymous tone-* slots that resolve through the embedded palette.
- Geometry and content behavior remain plugin-owned; design primitives remain
  centralized rather than repeated in components.

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

A single event is never repeated as an agenda card. The agenda switcher appears
only when a selected date has multiple events. Read-only status is capability
information, not a warning banner.

## Review gate

Every visual change must pass npm run verify.

The verifier proves source isolation and release integrity. A release candidate
must then be installed through the Woon receipt adapter, Obsidian reloaded, and
the month, event card, context links, and read-only boundary checked at runtime.
Independence is verified by rendering the same build with Cupertino disabled
and then restoring the user's original theme.
