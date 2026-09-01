# Link Calendar Navigator

**Find every dated note without moving it into another calendar.**

[![Obsidian Community Plugin](https://img.shields.io/badge/Obsidian-Community_plugin-7C3AED?logo=obsidian)](obsidian://show-plugin?id=link-calendar)
[![CI](https://github.com/woonyong-kr/link-calendar/actions/workflows/ci.yml/badge.svg)](https://github.com/woonyong-kr/link-calendar/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/woonyong-kr/link-calendar?sort=semver)](https://github.com/woonyong-kr/link-calendar/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Link Calendar Navigator reads date properties already stored in your Markdown and turns them into a month view. Pick a day, review its notes, and open the original file in one click.

**Month → date → original Markdown.**

![Link Calendar Navigator walkthrough from a populated month to a selected day and its original Markdown links](docs/media/link-calendar-demo.gif)

<p align="center">
  <a href="obsidian://show-plugin?id=link-calendar">Add to Obsidian</a>
  ·
  <a href="https://github.com/woonyong-kr/obsidian-navigator-demo-vault/releases/latest">Try the public demo Vault</a>
  ·
  <a href="https://community.obsidian.md/plugins/link-calendar">Community page</a>
</p>

## At a glance

- **Markdown stays canonical:** the month is derived from frontmatter in your existing notes.
- **Explicit sources:** choose the exact folders and property mappings to index.
- **Compact navigation:** quiet date markers open a focused daily agenda.
- **Multiple note systems:** each source can use different property names and an optional tag.
- **Read-only by default:** creation and drag-to-move are opt-in per source.
- **Conflict-aware writes:** a changed source note stops a move instead of being silently overwritten.
- **Local-only:** no account, external calendar, network request, telemetry, or plugin-owned database.

## Is this for you?

Use Link Calendar Navigator when your project notes, meetings, learning logs, journals, or daily notes already contain dates and you want time-based navigation without copying them into another data model.

It is intentionally not a shared calendar, meeting scheduler, reminder service, task engine, or replacement for Apple Calendar, Google Calendar, or Outlook.

## Quick start

1. Install **Link Calendar Navigator** from **Settings → Community plugins**.
2. Run **Open Link Calendar Navigator** or select the calendar ribbon icon.
3. Choose a folder containing Markdown notes with a date property.
4. Pick the closest preset: **Learning log**, **Project deadlines**, **Meetings**, or **Daily notes**.
5. Confirm the detected property and the exact dated-note count, then add the source.
6. Select a date marker and click an underlined agenda title to open the original Markdown.

New sources remain read-only until you explicitly enable writes. To explore first, download the [public demo Vault](https://github.com/woonyong-kr/obsidian-navigator-demo-vault/releases/latest); it includes copyable examples for all four presets.

## The three-step workflow

1. **Scan a month.** Quiet dots show which dates contain matching notes.
2. **Choose a day.** A compact agenda lists only notes that overlap that date.
3. **Open the source.** The agenda title opens the canonical Markdown immediately.

![Link Calendar Navigator month view](docs/media/link-calendar-overview.png)

![Link Calendar Navigator daily agenda](docs/media/link-calendar-agenda.png)

## Configure a source

Only a date is required. The default mapping also understands optional times, end dates, all-day state, title, and category:

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

The default property names are `date`, `end`, `startTime`, `endTime`, `allDay`, `title`, and `category`. Each source profile can map different names. An optional tag narrows a configured folder but never expands the indexed scope.

The guided source preview reports:

- the folder that will be indexed;
- the total Markdown note count;
- detected date properties and their match counts;
- the property selected by the chosen preset.

Invalid, missing, reversed, or excessively long date ranges appear as diagnostics with links to the source notes.

## Navigation and accessibility

- Select a day or event marker to open the agenda.
- Select an underlined agenda title to open the canonical note.
- Press `Cmd/Ctrl + Enter` on an event marker to open its note directly.
- Run **Reveal active note in calendar** to locate the current dated note.
- Use arrow keys on the month grid to move the selected day; `Enter` or `Space` opens its agenda.
- Press `Escape` to close the agenda and restore focus to the selected marker or day.
- Select **Today** or run **Show today in Link Calendar Navigator** to return to the current date.
- Use search and source filters to narrow the current month without editing notes.
- Use focus mode when the month needs the full Obsidian window.

## Read-only and writable sources

Every source begins read-only. A read-only source can be indexed, filtered, embedded, and opened, but never changed by the plugin.

For a source explicitly marked writable, Link Calendar Navigator can:

- create a Markdown event note through Obsidian's public `Vault` API;
- move an event by updating only its mapped start and end properties;
- offer one conflict-checked Undo after a successful move.

Before moving a date, the plugin confirms that the file still belongs to the same writable source and that the relevant frontmatter still matches the indexed event. If the note changed in the meantime, the move stops and reports a conflict.

## Embedded agenda

Embed a compact, read-only upcoming list with a `link-calendar` code block:

~~~markdown
```link-calendar
source: Learning
title: Learning calendar
```
~~~

`source` is an optional Vault folder prefix and `title` is optional display text. Legacy `context-calendar` blocks must be renamed before this release can render them.

## Why not a general calendar?

General calendar plugins manage schedules. Link Calendar Navigator is designed to find existing Markdown by time.

| | Link Calendar Navigator | General calendar |
| --- | --- | --- |
| Source of truth | Existing Markdown frontmatter | Calendar-owned events or tasks |
| Scope | Explicit Vault folders | Calendar collections |
| Primary action | Open the canonical note | Manage a schedule |
| Writes | Off by default, per source | Usually central to the workflow |
| External account | None | Sometimes required |
| Network access | None | Provider-dependent |

## Privacy, performance, and limits

- Only configured folders are indexed; the plugin does not send data outside Obsidian.
- There is no telemetry, external account, or plugin-owned calendar database.
- The index stores derived in-memory event metadata and rebuilds from the Vault.
- Event ranges longer than 370 days are rejected as diagnostics.
- Multi-day events are expanded only within the reviewed date span.
- Search is debounced and the month surface renders at most three markers per date before showing a count.

Removing the plugin leaves every Markdown note and property intact.

## Troubleshooting

- **The calendar asks for a source:** choose a Vault folder and confirm a detected date property.
- **A note is missing:** verify that it is inside the configured folder, matches the optional tag, and contains a valid mapped start date.
- **A date shows a warning:** open Diagnostics to inspect missing, invalid, reversed, or oversized ranges.
- **Create or drag is unavailable:** the source is read-only or its folder/property mapping is invalid.
- **A move was rejected:** the note changed since it was indexed, no longer matches the source, or contains a conflicting date value.
- **Search shows no results:** clear the query and source chips to restore the full month.

## Installation and compatibility

Install from **Settings → Community plugins → Browse → Link Calendar Navigator**. The plugin supports Obsidian 1.13.0 or later on desktop and mobile.

For a manual release install, download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/woonyong-kr/link-calendar/releases/latest) into `.obsidian/plugins/link-calendar/`, then reload Obsidian.

## Support and development

- Read the [changelog](CHANGELOG.md), [roadmap](ROADMAP.md), and [design QA](docs/design-qa.md).
- Report a [bug or use case](https://github.com/woonyong-kr/link-calendar/issues/new/choose).
- Review the [contributing guide](CONTRIBUTING.md) and [security policy](SECURITY.md).

```bash
npm ci
npm run verify
```

`npm run verify` runs TypeScript, Obsidian lint, unused-code analysis, 56 unit and DOM tests with coverage, visual-fixture checks, a production build, and release-policy validation.

## 한국어 요약

Link Calendar Navigator는 Markdown의 날짜 속성을 월간 보기로 모으고, 선택한 날짜에서 정본 문서 링크만 보여주는 Obsidian 플러그인입니다. 새 source는 읽기 전용이며, 사용자가 명시적으로 허용한 source만 원본 Markdown의 날짜를 수정할 수 있습니다. 별도 일정 데이터베이스나 외부 통신은 없습니다.

## License

[MIT](LICENSE)
