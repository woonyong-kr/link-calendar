import { describe, expect, it } from "vitest";

import { firstDayOfWeek, formatMessage, resolvedLocale } from "../src/i18n";
import { type CalendarEvent, createProfile } from "../src/model";
import {
  canMoveEvent,
  canCreateWithProfile,
  embedSource,
  eventFrontmatter,
  filterCalendarEvents,
  frontmatterMatchesChanges,
  frontmatterMatchesEventDates,
  gridMovement,
  matchesEventQuery,
  planMoveFrontmatter,
  resolveEventPath,
  validateProfile,
  writableProfiles,
} from "../src/policy";

function event(): CalendarEvent {
  return {
    allDay: false,
    category: "Learning",
    editable: true,
    endDate: "2026-08-18",
    endTime: "",
    filePath: "Calendar/Event.md",
    id: "calendar:Calendar/Event.md",
    kind: "event",
    origin: "profile",
    profileId: "calendar",
    sources: [{ excerpt: "Frontmatter", filePath: "Calendar/Event.md", line: 0 }],
    startDate: "2026-08-18",
    startTime: "",
    title: "Program orientation",
  };
}

describe("mutation policy", () => {
  it("requires an enabled writable folder and a non-empty start property", () => {
    const profile = createProfile("Calendar");
    profile.id = "calendar";
    expect(profile.editable).toBe(false);
    profile.editable = true;
    expect(validateProfile(profile)).toBeNull();
    expect(writableProfiles([profile])).toEqual([profile]);
    profile.enabled = false;
    expect(writableProfiles([profile])).toEqual([]);
    profile.enabled = true;
    profile.properties.start = "";
    expect(validateProfile(profile)).toBe("missing-start");
    expect(writableProfiles([profile])).toEqual([]);
  });

  it("does not treat a tag as a Vault-wide source boundary", () => {
    const profile = createProfile();
    profile.tag = "calendar";
    expect(validateProfile(profile)).toBe("missing-source");
    expect(writableProfiles([profile])).toEqual([]);
  });

  it("rejects reserved, controlled, and oversized frontmatter property names", () => {
    const profile = createProfile("Calendar");
    profile.properties.title = "__proto__";
    expect(validateProfile(profile)).toBe("invalid-property");
    profile.properties.title = `title${String.fromCharCode(10)}unsafe`;
    expect(validateProfile(profile)).toBe("invalid-property");
    profile.properties.title = "x".repeat(129);
    expect(validateProfile(profile)).toBe("invalid-property");
  });

  it("rechecks current source capability before moving", () => {
    const profile = createProfile("Calendar");
    profile.id = "calendar";
    profile.editable = true;
    expect(canMoveEvent(event(), profile, true)).toBe(true);
    profile.editable = false;
    expect(canMoveEvent(event(), profile, true)).toBe(false);
    profile.editable = true;
    expect(canMoveEvent(event(), profile, false)).toBe(false);
  });

  it("preserves an explicit zero-day end while moving", () => {
    const profile = createProfile("Calendar");
    profile.id = "calendar";
    profile.editable = true;
    expect(planMoveFrontmatter(
      event(),
      profile,
      profile,
      { date: "2026-08-18", end: "2026-08-18" },
      "2026-08-20",
    )).toEqual({ date: "2026-08-20", end: "2026-08-20" });
    expect(planMoveFrontmatter(
      { ...event(), endDate: "2026-08-20" },
      profile,
      profile,
      { date: "2026-08-18", end: "2026-08-20" },
      "2026-08-25",
    )).toEqual({ date: "2026-08-25", end: "2026-08-27" });
  });

  it("does not add an end field that was not present", () => {
    const profile = createProfile("Calendar");
    profile.id = "calendar";
    profile.editable = true;
    expect(planMoveFrontmatter(
      event(),
      profile,
      profile,
      { date: "2026-08-18" },
      "2026-08-20",
    )).toEqual({ date: "2026-08-20" });
  });

  it("fails closed when current ownership or dates no longer match", () => {
    const profile = createProfile("Calendar");
    profile.id = "calendar";
    profile.editable = true;
    const readOnly = createProfile("Calendar");
    readOnly.id = "generated";
    readOnly.editable = false;
    expect(planMoveFrontmatter(
      event(),
      profile,
      readOnly,
      { date: "2026-08-18", end: "2026-08-18" },
      "2026-08-20",
    )).toBeNull();
    expect(planMoveFrontmatter(
      event(),
      profile,
      profile,
      { date: "2026-08-18", end: "not-a-date" },
      "2026-08-20",
    )).toBeNull();
  });

  it("rejects a stale calendar snapshot before changing the current note", () => {
    const profile = createProfile("Calendar");
    profile.id = "calendar";
    profile.editable = true;
    expect(frontmatterMatchesEventDates(event(), profile, { date: "2026-08-18" })).toBe(true);
    expect(frontmatterMatchesEventDates(event(), profile, { date: "2026-08-19" })).toBe(false);
    expect(planMoveFrontmatter(
      event(),
      profile,
      profile,
      { date: "2026-08-19" },
      "2026-08-20",
    )).toBeNull();
  });

  it("requires exact post-move values before undo can restore them", () => {
    expect(frontmatterMatchesChanges(
      { Date: "2026-08-20", End: "2026-08-21" },
      { date: "2026-08-20", end: "2026-08-21" },
    )).toBe(true);
    expect(frontmatterMatchesChanges(
      { date: "2026-08-22" },
      { date: "2026-08-20" },
    )).toBe(false);
  });

  it("allows creation only when the effective source remains writable", () => {
    const writable = createProfile("Calendar");
    writable.id = "writable";
    writable.editable = true;
    const readOnly = createProfile("Calendar");
    readOnly.id = "read-only";
    readOnly.editable = false;
    expect(canCreateWithProfile(writable, writable)).toBe(true);
    expect(canCreateWithProfile(writable, readOnly)).toBe(false);
  });

  it("writes the configured date, title, category, and required tag once", () => {
    const profile = createProfile("Calendar");
    profile.tag = "calendar";
    expect(eventFrontmatter(profile, {
      category: "Learning",
      date: "2026-08-18",
      title: "Program orientation",
    })).toEqual({
      category: "Learning",
      date: "2026-08-18",
      tags: ["calendar"],
      title: "Program orientation",
    });
  });
});

describe("view policy", () => {
  it("keeps grid movement separate from card keys", () => {
    expect(gridMovement("ArrowLeft", 2)).toBe(-1);
    expect(gridMovement("Home", 2)).toBe(-2);
    expect(gridMovement("Enter", 2)).toBeNull();
  });

  it("searches calendar titles, categories, and paths without a relationship index", () => {
    expect(matchesEventQuery(event(), "orientation")).toBe(true);
    expect(matchesEventQuery(event(), "learning")).toBe(true);
    expect(matchesEventQuery(event(), "calendar/event")).toBe(true);
    expect(matchesEventQuery(event(), "jane")).toBe(false);
    expect(matchesEventQuery(event(), "unrelated")).toBe(false);
  });

  it("combines source and search filters without changing notes", () => {
    const candidate = event();
    expect(filterCalendarEvents([candidate], {
      profileId: "calendar",
      query: "orientation",
    })).toEqual([candidate]);
    expect(filterCalendarEvents([candidate], {
      profileId: "other",
      query: "",
    })).toEqual([]);
    expect(filterCalendarEvents([candidate], {
      profileId: "",
      query: "learning",
    })).toEqual([candidate]);
    expect(filterCalendarEvents([candidate], {
      profileId: "",
      query: "decision",
    })).toEqual([]);
  });

  it("resolves an active note to its indexed calendar event", () => {
    expect(resolveEventPath([event()], "Calendar/Event.md")?.id).toBe("calendar:Calendar/Event.md");
    expect(resolveEventPath([event()], "Calendar/Missing.md")).toBeUndefined();
  });

  it("fails closed for invalid embed sources", () => {
    expect(embedSource(undefined)).toEqual({ invalid: false, source: "" });
    expect(embedSource("Calendar/Events")).toEqual({ invalid: false, source: "Calendar/Events" });
    expect(embedSource("../Private")).toEqual({ invalid: true, source: "" });
    expect(embedSource(42)).toEqual({ invalid: true, source: "" });
  });
});

describe("locale policy", () => {
  it("uses the system region for automatic English week start", () => {
    expect(resolvedLocale("auto", "en-US")).toBe("en");
    expect(firstDayOfWeek("auto", "auto", "en-US")).toBe(0);
    expect(firstDayOfWeek("auto", "auto", "en-GB")).toBe(1);
    expect(firstDayOfWeek("auto", "auto", "ko-KR")).toBe(0);
  });

  it("formats localized count messages", () => {
    expect(formatMessage("en", "moreEvents", { count: "3" })).toBe("+3 more");
    expect(formatMessage("ko", "moreEvents", { count: "3" })).toBe("+3개 더 보기");
  });
});
