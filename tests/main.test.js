const Module = require("node:module");
const test = require("node:test");
const assert = require("node:assert/strict");

const originalLoad = Module._load;
Module._load = function loadObsidian(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      Notice: class Notice {},
      Plugin: class Plugin {},
      normalizePath: (value) => value.replace(/\/{2,}/g, "/").replace(/^\.\//, ""),
      parseYaml: (value) => Object.fromEntries(
        value.split("\n").map((line) => line.match(/^([^:]+):\s*(.*)$/)).filter(Boolean).map((match) => [
          match[1].trim(),
          match[2].trim().replace(/^"|"$/g, ""),
        ]),
      ),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { _internals } = require("../main.js");
Module._load = originalLoad;

test("parses the Markdown calendar block without treating comments as settings", () => {
  assert.deepEqual(
    _internals.parseConfig("source: inbox/calendar/events\n# comment\ndate_field: Date\n"),
    { source: "inbox/calendar/events", date_field: "Date" },
  );
});

test("uses only the number of calendar weeks that the selected month needs", () => {
  assert.equal(_internals.weekCount(new Date(2026, 1, 1)), 4);
  assert.equal(_internals.weekCount(new Date(2026, 7, 1)), 6);
});

test("keeps the event title intact except for a repeated category suffix", () => {
  assert.equal(
    _internals.calendarCardTitle("개발 교육 입소식 · 학습", "학습"),
    "개발 교육 입소식",
  );
  assert.equal(_internals.calendarCardTitle("동료 면접 동행", "관계"), "동료 면접 동행");
});

test("groups same-day events without duplicating an event", () => {
  const groups = _internals.groupEventsByDate([
    { date: "2026-08-18", title: "A" },
    { date: "2026-08-18", title: "B" },
    { date: "2026-08-19", title: "C" },
  ]);

  assert.deepEqual(groups.get("2026-08-18").map((event) => event.title), ["A", "B"]);
  assert.deepEqual(groups.get("2026-08-19").map((event) => event.title), ["C"]);
});

test("accepts any safe Vault source instead of a Woon-specific path", () => {
  assert.equal(_internals.isSafeVaultPath("calendar/events"), true);
  assert.equal(_internals.isSafeVaultPath("../private/events"), false);
  assert.equal(_internals.isSafeVaultPath("/absolute/events"), false);
});

test("uses the canonical category ID without translating its display title", () => {
  assert.equal(_internals.categoryClassName("learning"), "learning");
  assert.equal(_internals.categoryClassName("future-category"), "future-category");
  assert.equal(_internals.categoryClassName("잘못된 분류"), "other");
});

test("reads generated frontmatter before Obsidian metadata cache catches up", () => {
  assert.deepEqual(
    _internals.frontmatterFromMarkdown(
      '---\nDate: "2026-08-18"\nCategory ID: "learning"\n---\n\n# Event\n',
    ),
    { Date: "2026-08-18", "Category ID": "learning" },
  );
  assert.deepEqual(_internals.frontmatterFromMarkdown("# No frontmatter\n"), {});
});
