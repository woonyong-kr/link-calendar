import { describe, expect, it } from "vitest";

import {
  addDays,
  MAX_EVENT_SPAN_DAYS,
  categoryToken,
  dateKey,
  eachDate,
  isSafeVaultPath,
  monthGrid,
  normalizeSettings,
  serializeSettings,
  values,
} from "../src/model";

describe("calendar dates", () => {
  it("validates real calendar dates without timezone conversion", () => {
    expect(dateKey("2028-02-29")).toBe("2028-02-29");
    expect(dateKey("2027-02-29")).toBeNull();
    expect(dateKey("2026-13-01")).toBeNull();
    expect(dateKey("2026-08-18T13:00:00+09:00")).toBe("2026-08-18");
  });

  it("expands bounded multi-day events", () => {
    expect(eachDate("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(eachDate("2026-01-01", addDays("2026-01-01", MAX_EVENT_SPAN_DAYS))).toEqual([]);
  });

  it("builds five or six complete weeks for either week start", () => {
    expect(monthGrid(new Date(2026, 1, 1), 0)).toHaveLength(35);
    expect(monthGrid(new Date(2026, 7, 1), 0)).toHaveLength(42);
    expect(monthGrid(new Date(2026, 7, 1), 1)[0]).toBe("2026-07-27");
  });
});

describe("settings boundary", () => {
  it("rejects path traversal and absolute source paths", () => {
    expect(isSafeVaultPath("calendar/events")).toBe(true);
    expect(isSafeVaultPath("../events")).toBe(false);
    expect(isSafeVaultPath("/events")).toBe(false);
  });

  it("normalizes profiles and drops unusable profiles", () => {
    const settings = normalizeSettings({
      locale: "ko",
      profiles: [
        { id: "valid", name: "Events", folder: "Calendar/", editable: false, properties: {} },
        { id: "invalid", folder: "", tag: "" },
      ],
    });
    expect(settings.profiles).toHaveLength(1);
    expect(settings.profiles[0]?.folder).toBe("Calendar");
    expect(settings.profiles[0]?.editable).toBe(false);
  });

  it("preserves but disables legacy tag-only sources until a folder is chosen", () => {
    const settings = normalizeSettings({
      sourceProfiles: [{
        enabled: true,
        id: "legacy-tag",
        name: "Legacy tag",
        source: { path: "", tag: "calendar", type: "folder" },
      }],
    });
    expect(settings.profiles).toMatchObject([{
      enabled: false,
      folder: "",
      id: "legacy-tag",
      tag: "calendar",
    }]);
  });

  it("round-trips the public sourceProfiles schema", () => {
    const profile = normalizeSettings({
        sourceProfiles: [{
          editable: false,
          enabled: true,
          id: "generated",
          name: "Generated",
          properties: { start: "Date", projects: "projects" },
          source: { path: "Generated/Events", recursive: false, tag: "event", type: "folder" },
        }],
      }).profiles[0];
    expect(profile).toBeDefined();
    if (!profile) throw new Error("profile fixture was not normalized");
    expect(profile).toMatchObject({
      editable: false,
      enabled: true,
      folder: "Generated/Events",
      recursive: false,
      tag: "event",
      properties: { start: "Date", project: "projects" },
    });
    const serialized = serializeSettings({
      ...normalizeSettings({}),
      profiles: [profile],
    });
    expect(serialized).toMatchObject({
      schemaVersion: 1,
      sourceProfiles: [{
        id: "generated",
        source: { path: "Generated/Events", recursive: false, type: "folder" },
      }],
    });
  });

  it("uses stable generated tones without exposing category names as CSS classes", () => {
    expect(categoryToken("Private category")).toMatch(/^tone-[0-7]$/);
    expect(categoryToken("Private category")).toBe(categoryToken("Private category"));
  });

  it("normalizes scalar and list properties", () => {
    expect(values(["[[Doe, Jane]]", "Project A, Project B"])).toEqual([
      "[[Doe, Jane]]",
      "Project A",
      "Project B",
    ]);
  });
});
