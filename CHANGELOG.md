# Changelog

## 2.0.5

- Inherit Obsidian theme color, motion, radius, typography, and tactile-shadow tokens so Context Calendar feels native in Cupertino and remains compatible with other themes.
- Render category properties with the same deterministic tone as their month cards without exposing category names as CSS classes.

## 2.0.4

- Present the selected event as a compact property sheet with date, category, people, projects, and related notes instead of a repeated agenda card.
- Show a subtle read-only status, keep event switching only for dates with multiple events, and reduce the selected-day treatment.
- Clamp long month and agenda titles to two lines while preserving the full title in a tooltip and accessible label.
- Keep visible categories on distinct deterministic tones and refine the month grid into a quieter, denser calendar surface.

## 2.0.3

- Add source-folder selection with scoped date-property detection before a calendar source is added.
- Add source and context lenses, active-note reveal, and a focused month view without changing Markdown source data.
- Refine the Korean and English interface, compact event cards, and context controls.

## 2.0.2

- Remove an unnecessary `InputEvent` assertion reported by automated review.
- Guard the release verifier against reintroducing the cross-window assertion pattern.

## 2.0.1

- Adopt Obsidian 1.13 declarative settings so every option appears in settings search.
- Restrict indexing to explicitly configured source folders; tags now narrow a folder instead of scanning the whole Vault.
- Preserve legacy tag-only sources as disabled entries until the user chooses a folder.
- Remove cross-window event checks and all `!important` declarations reported by automated review.

## 2.0.0

- Keep the month at full width and present event context in a compact overlay drawer.
- Isolate calendar typography from Vault-wide font scaling and refine day, card, hover, and category hierarchy.
- Render category tones and month row counts with scoped CSS classes only, without inline styles.

- Renamed the plugin to Context Calendar with the public ID `context-calendar`.
- Replaced the dashboard-only renderer with a dedicated month view.
- Added source profiles with configurable property mappings and read-only capabilities.
- Added incremental metadata indexing, search, Agenda, Context, backlinks, and diagnostics.
- Added event-note creation, multi-day events, and guarded date moves for writable sources.
- Added English and Korean interfaces, configurable week start, responsive layouts, and keyboard semantics.
- Removed Woon-specific paths, categories, dashboard CSS, and external-service assumptions.
