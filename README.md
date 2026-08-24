# Context Calendar

Context Calendar turns dated Markdown notes into a month you can navigate by source and context. Events remain ordinary files, while links, backlinks, people, projects, and related notes stay beside the date instead of disappearing into a separate calendar database.

**Month → note → context.** See when something happened, open the source note, then follow the people, project, and related work around it.

## Why Context Calendar

- **Month first:** the full month remains the primary screen, with no time grid.
- **Markdown first:** every event is a real note that can be searched, linked, and versioned.
- **Context beside time:** select an event to see its links, backlinks, people, projects, and related notes.
- **Context Lens:** narrow the month by a person, project, or category without changing note data.
- **Multiple sources:** switch between source folders from the same calendar while each folder keeps its own property mapping and write capability.
- **Reveal the note:** run **Reveal active note in calendar** to jump from the current Markdown file back to its month and event card.
- **Source capabilities:** personal folders can be writable while generated or imported folders remain read-only.
- **Local by design:** no account, credential, analytics, network request, or external database.
- **Theme and device aware:** light/dark themes, keyboard navigation, pop-out windows, and narrow layouts.

## Adaptive design

Context Calendar follows Obsidian's active theme instead of shipping a competing visual skin. Its typography, semantic colors, control radii, motion, and shadows resolve from Obsidian theme variables; category tones are derived from the active theme palette. Cupertino therefore feels native without a Cupertino-specific selector, while other themes keep their own identity.

The source design contract lives in [`docs/design-system.md`](docs/design-system.md). Component CSS cannot contain literal colors, light/dark selectors, theme names, or `!important`; the production build rejects those regressions before generating `styles.css`.

## Quick start

1. Use the ribbon calendar icon or run **Open Context Calendar**.
2. Select a source folder. Context Calendar previews the Markdown count and detects valid date properties inside that folder only.
3. Confirm the date property, then open the month. Nothing is copied or uploaded.

Add more sources or adjust property mappings later in **Settings → Context Calendar**. An optional tag can narrow a configured folder, but never expands indexing to the whole Vault.

A minimal event note is:

```markdown
---
date: 2026-08-18
category: Learning
people:
  - "[[Jane Doe]]"
project:
  - "[[Compiler study]]"
related:
  - "[[Admission checklist]]"
---

# Program orientation
```

Property names are configurable per source. Dates accept `YYYY-MM-DD` and ISO datetime strings; the calendar preserves the local date portion instead of converting it through a timezone. An optional end property creates a multi-day event. Invalid ranges and spans longer than 370 days are shown in Diagnostics instead of being partially rendered.

Each source folder is a privacy and performance boundary. Context Calendar indexes Markdown files only inside enabled source folders; an optional tag filters files within that boundary and never expands access to the whole Vault. Legacy tag-only sources from older builds are preserved but disabled until a folder is chosen.

## Reading and editing

- Single-click an event to open Agenda and Context.
- Double-click, use the context menu, or press **Open note** to open the Markdown file.
- Drag an event to another day only when its source is writable.
- Use **New event note** to create a Markdown file in a writable folder.
- Read-only sources never expose create or move operations and are checked again before any file mutation.
- A writable tag constraint must be present in current frontmatter; inline-only tag matches remain read-only.
- Use the source bar when more than one source is enabled.
- In Context, use the filter control beside a person or project to turn it into a month-wide Context Lens. Clear the lens from the scope bar.
- From an indexed Markdown note, run **Reveal active note in calendar** to locate the matching card.

Category colors are generated from the category value rather than a fixed list, so any workflow works without code changes.

## Optional Markdown embed

````markdown
```context-calendar
source: Calendar/Events
title: Team calendar
```
````

The embed shows upcoming notes and opens the dedicated month view. The source must be a safe Vault-relative path.

## Privacy and security

Context Calendar reads configured source folders through Obsidian's `Vault` API and uses the existing `MetadataCache` link graph for backlinks. It writes only through `Vault` and `FileManager.processFrontMatter()`. It does not:

- send network requests;
- ask for or store credentials;
- execute note content as HTML;
- read files outside the Vault;
- edit a source marked read-only.

The plugin requires Obsidian 1.13.0 or later so its settings are searchable through Obsidian's declarative settings interface.

## Development

```bash
npm ci
npm run verify
```

`npm run verify` runs TypeScript, the official Obsidian ESLint rules, unit tests, coverage, the production bundle, and release-contract validation. Release assets are `main.js`, `manifest.json`, and `styles.css`.

`styles.css` is a generated Community Plugin artifact. Edit the component sources under `src/styles/`: `tokens.css` is the only design-token source, while shell, month grid, event detail, and supporting surfaces remain independent components.

## 한국어 안내

Context Calendar는 날짜가 있는 Markdown 문서를 월간 달력으로 모아 보고, 일정과 연결된 인물·프로젝트·관련 문서·backlink를 같은 화면에서 다시 찾는 Obsidian 플러그인입니다. 핵심 흐름은 **월 → 문서 → 맥락**이며, 외부 계정이나 서버 없이 Vault 안에서만 동작합니다.

처음 달력을 열어 폴더를 고르면 해당 폴더 안에서 날짜 속성과 문서 수를 미리 확인한 뒤 바로 소스로 추가할 수 있습니다. 여러 폴더를 연결했다면 소스별로 월간 보기를 좁힐 수 있고, 맥락 패널의 인물·프로젝트·분류를 필터로 적용하면 그 대상과 연결된 일정만 남습니다. 현재 Markdown 문서가 달력에서 어디에 있는지는 **현재 문서를 캘린더에서 찾기** 명령으로 바로 확인합니다.

Tag는 반드시 지정 폴더 안에서만 추가 필터로 작동하며 Vault 전체 검색으로 범위를 넓히지 않습니다. 카드는 한 번 누르면 맥락을 보여 주고, 두 번 누르면 원문을 엽니다. 긴 제목은 두 줄로 정리되며 전체 제목은 기본 tooltip과 접근성 이름으로 확인할 수 있습니다.

## License

[MIT](LICENSE)
