# Link Calendar Navigator design contract

## Product boundary

Link Calendar Navigator is a derived navigation surface over canonical Markdown.

- It reads date, title, category, and source properties from configured folders.
- It does not copy note bodies or create relationship, layout, or event databases.
- Every agenda result exposes a direct action to the canonical note.
- Link Calendar Navigator owns presentation state only: visible month, selected date, search query, source filter, and open/closed agenda.

## Information hierarchy

1. Month and navigation controls.
2. Seven-column month grid.
3. Selected-date agenda.
4. Direct canonical note links.
5. Collapsed diagnostics only when invalid source notes exist.

The agenda must not become a note preview, property inspector, backlink browser, people directory, project browser, or second knowledge graph.

## Visual rules

- Use Obsidian semantic variables for canvas, panel, text, borders, accent, focus, type, radius, motion, and contrast.
- Use one host accent for event dots; category never changes the month hierarchy.
- Keep month cells free of event cards; reveal up to three event dots and a counted overflow control.
- Present the agenda as a typographic timeline: time, title, then a direct canonical link.
- Use icons for icon-only actions, with accessible names and tooltips.
- Keep touch/click targets at the shared control height.
- On narrower containers, float the agenda as a bounded drawer; on mobile widths, anchor it to the bottom.
- Respect reduced motion and forced colors.

## Interaction rules

- Selecting a day opens its agenda even when it is empty.
- Selecting an event dot opens the agenda for that date.
- Selecting the direct note link opens the Markdown note.
- `Cmd/Ctrl + Enter` opens a focused event dot's note directly.
- Arrow keys move the selected day. `Enter` and `Space` open its agenda.
- `Escape` closes the agenda and restores focus.

## Release gates

- TypeScript, lint, unused-code, unit, DOM, visual-fixture, production-build, and release checks pass.
- The generated CSS contains no removed preview, property-sheet, or relation UI.
- Dark and light Obsidian runtime checks confirm hierarchy, contrast, focus, resizing, and direct note navigation.
- The installed bundle hash and enabled plugin state match the release assets.
