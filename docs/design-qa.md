# Link Calendar design QA

## Checked surfaces

- Light theme: `docs/media/link-calendar-overview.png`
- Dark theme: `docs/media/link-calendar-agenda.png`
- Large month grid with a persistent selected-date agenda
- Long event title wrapping
- Time range plus category hierarchy
- Selected day, selected event, and direct-note action
- Keyboard focus, `Escape` restoration, and month-grid ARIA semantics through DOM tests
- Narrow-container drawer, reduced-motion, high-contrast, and forced-colors CSS rules

## Removed UI

- Note body preview
- Metadata property sheet
- Backlinks and linked-note browser
- People, project, and related-note facets
- Connected-note badges
- Duplicated event detail card

## Result

Passed. The visible hierarchy is month → selected date → time and canonical note link. No parallel knowledge or layout surface remains.
