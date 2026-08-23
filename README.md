# Context Calendar

Context Calendar is a month-first Obsidian calendar for dated Markdown notes. Events remain ordinary files, while links, backlinks, people, projects, and related notes stay available beside the month.

## Why Context Calendar

- **Month first:** the full month remains the primary screen, with no time grid.
- **Markdown first:** every event is a real note that can be searched, linked, and versioned.
- **Context beside time:** select an event to see its links, backlinks, people, projects, and related notes.
- **Source capabilities:** personal folders can be writable while generated or imported folders remain read-only.
- **Local by design:** no account, credential, analytics, network request, or external database.
- **Theme and device aware:** light/dark themes, keyboard navigation, pop-out windows, and narrow layouts.

## Quick start

1. Open **Settings → Context Calendar**.
2. Add a source folder. Optionally add a tag to narrow that folder.
3. Map the date property. The default is `date`.
4. Use the ribbon calendar icon or **Open month calendar** command.

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

## 한국어 안내

Context Calendar는 날짜가 있는 Markdown 문서를 월간 달력으로 모아 보고, 일정과 연결된 인물·프로젝트·관련 문서·backlink를 같은 화면에서 다시 찾는 Obsidian 플러그인입니다. 외부 계정이나 서버 없이 Vault 안에서만 동작하며, 직접 작성하는 폴더는 수정 가능하게 두고 자동 생성 자료는 읽기 전용으로 분리할 수 있습니다.

설정에서 일정 폴더와 날짜 속성을 지정한 뒤 왼쪽 달력 아이콘을 누르면 됩니다. Tag는 반드시 지정 폴더 안에서만 추가 필터로 작동하며 Vault 전체 검색으로 범위를 넓히지 않습니다. 카드는 한 번 누르면 맥락을 보여 주고, 두 번 누르면 원문을 엽니다. 긴 제목은 두 줄로 정리되며 전체 제목은 기본 tooltip과 접근성 이름으로 확인할 수 있습니다.

## License

[MIT](LICENSE)
