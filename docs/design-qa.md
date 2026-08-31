# Link Calendar Navigator design QA

## Evidence

- Dark public-safe fixture at 1240×620: `docs/media/link-calendar-overview.png`
- Light public-safe fixture at 1240×620: `docs/media/link-calendar-agenda.png`
- Obsidian 1.13.7 dark runtime at 1115×768 with 2026-08-29 selected
- Obsidian 1.13.7 public demo onboarding: selecting `Calendar` found 7 Markdown documents, detected `date`, and previewed the exact 5 documents that would appear before saving the read-only source
- Local-only 2480×565 side-by-side comparison with the supplied 1487×1059 product reference
- Keyboard focus, `Escape` restoration, month-grid ARIA semantics, narrow drawer, reduced motion, high contrast, and forced colours through DOM and CSS tests

## Fidelity review

| Surface | Result | Evidence |
|---|---|---|
| Information hierarchy | passed | Month grid stays dominant; the selected date opens one adjacent time-ordered agenda. |
| Typography and density | passed | Dates, times, titles, and direct note links are the only event text. |
| Shape and separation | passed | Calendar weeks and agenda entries use hairlines; event cards, chips, badges, shadows, and selected-event panels are absent. |
| Colour and state | passed | One host accent identifies event dots, today, and the selected column; category colours do not compete with navigation. |
| Canonical navigation | passed | Each agenda title is the familiar underlined internal link itself; activation opens the original Markdown note without a separate icon action. |
| Guided source setup | passed | Folder selection opens a preview before any source is saved, offers four document presets, detects date-property candidates with counts, and defaults every new source to read-only. |
| Return to today | passed | A visible `Today` action and the command-palette action both return to the current month and focus the current date. |
| Responsive layout | passed | The agenda remains adjacent at wide widths and becomes a bounded overlay only when the host pane cannot preserve both surfaces. |
| Light and dark themes | passed | Both captures retain divider visibility, readable muted text, and the same hierarchy without plugin-owned card colours. |

## Removed UI

- Note body preview
- Metadata property sheet
- Backlinks and linked-note browser
- People, project, and related-note facets
- Connected-note badges
- Duplicated event detail card

## Iterations

1. Rejected coloured month cards and the duplicated selected-event detail panel.
2. Replaced event titles in cells with up to three dots and an overflow count.
3. Replaced agenda cards with `time → canonical note link` rows and moved all times to compact 24-hour ranges.
4. Removed the ambiguous arrow icon and made the visible agenda title the direct internal link.

final result: passed
