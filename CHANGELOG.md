# Changelog

## 3.4.0

- Add a zero-setup, read-only timeline index for meaningful frontmatter and Markdown body dates across active Vault notes.
- Recognize deterministic events, periods, history, deadlines, and an opt-in document-date layer without interpreting dates in code, quotes, URLs, comments, hidden folders, or archive/reference paths.
- Merge repeated timeline mentions by canonical target, start date, end date, and temporal kind, then expose the canonical note and unique mentioning notes in the agenda.
- Keep the selected date and agenda synchronized when navigating months.
- Batch body indexing and cover a 5,000-note Vault fixture, incremental updates, deduplication, provenance, filters, and accessibility behavior.

## 3.3.1

- Move the three setup and creation modals out of the plugin lifecycle module, leaving the runtime entrypoint focused on indexing, navigation, and guarded Vault mutations.
- Rebuild the Community overview around source setup, navigation, read-only defaults, conflict-aware writes, privacy, and troubleshooting.
- Correct the embedded-agenda example to document only the supported `source` and `title` fields.
- Replace the public walkthrough with a private-data-free month → agenda → original Markdown sequence captured in Obsidian 1.13.7.

## 3.3.0

- Add learning log, project deadline, meeting, and daily-note source presets while keeping every new source read-only.
- Detect candidate date properties inside the chosen folder and preview the exact number of notes the selected property will recognize before setup.
- Add an explicit **Show today** command and focus the current date after using the visible **Today** action.
- Publish a private-data-free demo Vault, copyable frontmatter, issue templates, Roadmap, and Discussions path for a five-minute first success.

## 3.2.0

- Make every newly configured source read-only until write access is explicitly enabled.
- Reject stale drag updates and provide a one-time, conflict-checked Undo for successful date moves.
- Reject reserved, controlled, or oversized frontmatter property names before any mutation.
- Show valid, missing, invalid, and total date counts for each configured source.
- Pin GitHub Actions, add least-privilege dependency review, and enable Dependabot for npm and workflow updates.

## 3.1.7

- Reframe the public page around finding existing dated Markdown without creating a second calendar database.
- Replace PKM-specific terminology with a three-step month-to-original-note explanation.
- Recut the public walkthrough to move from the full month to the selected date and finally the original note links.

## 3.1.6

- Add a public-safe animated walkthrough from month overview to the canonical-note agenda.
- Verify every README visual by format, dimensions, version, and SHA-256 before release.
- Replace mislabeled JPEG captures with actual PNG files.

## 3.1.5

- Make the folder-picker callback explicitly return `void` for Community Directory source checks.
- Preserve the familiar link affordance with a compatible bottom border instead of partially supported text-decoration properties.

## 3.1.4

- Use the unique public name Link Calendar Navigator for the new `link-calendar` Community Directory entry while preserving the plugin ID and behavior.

## 3.1.3

- Replace the agenda's ambiguous arrow action with a familiar underlined title link that opens the canonical Markdown note directly.

## 3.1.2

- Replace the agenda's repeated `Open note` text with one Lucide `file-up-right` action, tooltip, and accessible name.

## 3.1.1

- Preserve the wall-clock time written in Markdown across operating-system time zones.

## 3.1.0

- Replace month event cards with compact dots and a counted overflow indicator.
- Replace the selected-event panel with a time-ordered agenda of canonical Markdown links.
- Use 24-hour time ranges and hairline separators across wide and narrow layouts.
- Refresh dark and light public-safe visual evidence and the Obsidian runtime design QA.

## 3.0.1

- Refined month-card and agenda hierarchy with quieter category accents and left-aligned canonical-note links.
- Improved selected-event contrast without introducing a second detail or knowledge surface.
- Replaced compressed release screenshots with populated public-safe 1920×1080 evidence.

## 3.0.0

- Rename the product and plugin ID to Link Calendar.
- Replace the event preview, metadata property sheet, backlinks, people, projects, and related-note browser with a compact selected-date agenda of canonical Markdown links.
- Use only the `link-calendar` code block so the new plugin can be verified beside the legacy plugin before retirement.
- Add an explicit design contract and release checks for the canonical-note-only boundary.

## 2.1.3

- Replace the agenda-style detail view with an explicit Markdown page peek that loads an excerpt only after the user selects an event.
- Add measured responsive event density plus distinct loading, empty, filtered-empty, and invalid-note states.
- Rebase Calendar-scoped design aliases on public Obsidian theme variables, including high-contrast and forced-colors behavior, without owning a global palette.
- Add month-grid ARIA semantics, keyboard navigation, focus restoration, DOM interaction tests, dead-code checks, and a reproducible visual fixture.
- Refresh the README screenshots from the current generated CSS and remove stale interaction guidance.

## 2.1.2

- Render related notes, wikilinks, and backlinks as direct Markdown page relations instead of ambiguous filter chips.
- Keep category, people, and project values as direct month filters while moving relation filtering to the context menu.
- Flatten event metadata into one property sheet and widen the detail panel for clearer page titles.

## 2.1.1

- Make each category and context chip the filter control instead of repeating a separate filter icon.
- Replace the event-detail text action with a compact, accessible file icon action.
- Keep two-line event titles inside their day cells while preserving the full title in a tooltip.
- Increase dark-mode category distinction with centrally managed Apple semantic color tokens.

## 2.1.0

- Make ordinary wikilinks and backlinks first-class Context Lens filters, so a date property is the only required schema.
- Show a deduplicated connected-note count on event cards and in event details.
- Keep event details closed until the user explicitly selects a date, event, or active note.
- Rework the calendar into a denser full-surface month with compact cards, clearer hierarchy, and a document-focused context panel.
- Sharpen onboarding and public documentation around meetings, learning logs, project journals, research, and content planning.

## 2.0.7

- Embed the Calendar-scoped Cupertino design primitives so the plugin keeps its visual identity without requiring a particular Obsidian theme.
- Restrict component CSS to local `--cc-*` tokens and reject theme dependencies, global roots, and unbalanced source files during the build.
- Preserve Cupertino's MIT attribution while excluding its global workspace, editor, navigation, and mobile-shell selectors.
- Repair the split stylesheet boundary so every source file is independently balanced.

## 2.0.6

- Inherit Cupertino and other active themes through native Obsidian control classes and semantic UI tokens.
- Remove plugin-owned typography, radius, shadow, motion, and appearance fallbacks from calendar components.
- Refine full-screen spacing, event-card tones, and the event property panel for a consistent native layout.

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
