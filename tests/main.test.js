const Module = require("node:module");
const test = require("node:test");
const assert = require("node:assert/strict");

const originalLoad = Module._load;
Module._load = function loadObsidian(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      Notice: class Notice {},
      Plugin: class Plugin {},
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
    _internals.calendarCardTitle("크래프톤 정글 12기 · 학습", "학습"),
    "크래프톤 정글 12기",
  );
  assert.equal(_internals.calendarCardTitle("민정이 면접 데려다주기", "관계"), "민정이 면접 데려다주기");
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
