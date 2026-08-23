# Changelog

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
