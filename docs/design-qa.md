# Link Calendar design QA

## Checked surfaces

- Light theme at 1920×1080: `docs/media/link-calendar-overview.png`
- Dark theme agenda context: `docs/media/link-calendar-agenda.png`
- Obsidian 1.13.7 dark runtime at 1920×1200 with 2026-08-29 selected
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

The earlier compressed captures were rejected: their small viewport and JPEG enlargement made labels unreadable and did not prove the selected-date hierarchy. The replacement release images use a public-safe populated fixture at native desktop resolution. The private-vault runtime was checked separately and is not published in this repository.

Passed. The visible hierarchy is month → selected date → time and canonical note link. Event rows stay left-aligned, selected state uses a restrained category accent, and no parallel knowledge or layout surface remains.
