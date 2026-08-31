# Link Calendar Navigator

**Find every dated note without moving it into another calendar.**

Link Calendar Navigator reads the date properties already in your Markdown and turns them into a month view. Pick a day, review its notes, and open the original file in one click.

**Month → date → original Markdown.**

![Link Calendar Navigator walkthrough from a populated month to a selected day and its original Markdown links](docs/media/link-calendar-demo.gif)

## Is this for you?

Use Link Calendar Navigator when:

- your project notes, meetings, learning logs, or journals already contain date properties;
- you want a compact month overview without creating a second calendar database;
- selecting an event should open the real Markdown note, not a copied detail card;
- different folders use different property names or write permissions.

It is intentionally a Markdown navigator. It is not a shared calendar, meeting scheduler, reminder service, or replacement for an external calendar.

## The three-step workflow

1. **Scan a month.** Quiet dots show which dates have notes.
2. **Choose a day.** A compact agenda lists only the notes on that date.
3. **Open the source.** The visible title link opens the original Markdown immediately.

Nothing is imported into a plugin-owned database. Removing the plugin leaves every note and date property intact.

## What it looks like

![Link Calendar Navigator month view](docs/media/link-calendar-overview.png)

![Link Calendar Navigator daily agenda](docs/media/link-calendar-agenda.png)

## Why use it instead of a general calendar?

General calendar plugins are designed to manage schedules. Link Calendar Navigator is designed to find existing Markdown by time.

- Existing Markdown stays canonical.
- Configured folders provide explicit privacy and performance boundaries.
- A month grid uses quiet dots to show dated notes at a glance.
- The selected date shows only direct note links, not a duplicated metadata inspector.
- Search and source filters narrow the current month without modifying notes.
- Optional creation and drag-to-move update the canonical note only for sources explicitly marked writable.

Link Calendar Navigator does not store relationships, copy note bodies, render backlinks, or maintain a second layout. The month and agenda are derived from the current Vault and can always be rebuilt.

It is intentionally for Markdown-first users who already record dates in notes and want a calendar as a navigation surface. It is not intended to replace a shared calendar, meeting scheduler, or notification service.

## Setup

1. Install and enable **Link Calendar Navigator** from Community plugins.
2. Run **Open Link Calendar Navigator** or select the calendar ribbon icon.
3. Choose a folder containing Markdown notes with a date property.

Only a date is required:

```yaml
---
date: 2026-08-29
startTime: 2026-08-29T16:00:00+09:00
endTime: 2026-08-29T17:30:00+09:00
allDay: false
title: AICE Associate exam
category: Learning
---
```

The default mappings are `date`, `end`, `startTime`, `endTime`, `allDay`, `title`, and `category`. Each source can use different property names. An optional tag can narrow a configured folder but never expands the indexed scope.

## Navigation

- Select a day or event dot to open the daily agenda.
- Select an underlined agenda title to open the canonical Markdown note directly.
- Press `Cmd/Ctrl + Enter` on an event dot to open its note directly.
- Run **Reveal active note in calendar** to locate the current dated note.
- Use arrow keys on the month grid to move the selected day; `Enter` or `Space` opens its agenda.
- Press `Escape` to close the agenda and return focus to the selected event dot or day.

## Writable sources

Sources are read-only by default when configured that way. For a source explicitly marked writable, Link Calendar Navigator can:

- create a Markdown event note through Obsidian's `Vault` API;
- move an event by updating its mapped start and end properties.

It does not edit Apple Calendar, contact an external service, or write outside the Vault.

## Embedded month

Embed the read-only view with the `link-calendar` code block. Legacy `context-calendar` blocks must be migrated before enabling this release.

~~~markdown
```link-calendar
source: Learning
month: 2026-08
title: Learning calendar
```
~~~

## Development

```bash
npm ci
npm run verify
```

The verification gate runs TypeScript, Obsidian lint, unused-code checks, unit and DOM tests, visual-fixture checks, a production build, and release validation.

The checked light/dark surfaces and removed UI are recorded in [design QA](docs/design-qa.md).

## 한국어 요약

Link Calendar Navigator는 Markdown의 날짜 속성을 월간 보기로 모으고, 선택한 날짜에서 정본 문서 링크만 보여주는 Obsidian 플러그인입니다. 별도 일정 데이터베이스나 관계 구조를 만들지 않으며, 모든 일정 정보와 수정 결과는 원본 Markdown에만 남습니다.
