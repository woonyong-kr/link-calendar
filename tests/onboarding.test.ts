import { describe, expect, it } from "vitest";

import { createPresetProfile, detectedStartProperty } from "../src/onboarding";

describe("source onboarding presets", () => {
  it("matches detected property spelling without scanning outside the chosen folder", () => {
    expect(detectedStartProperty("project-deadline", ["Date", "Deadline"])).toBe("Deadline");
    expect(detectedStartProperty("meeting", ["Meeting Date", "Modified"])).toBe("Meeting Date");
  });

  it("falls back to the strongest detected date instead of inventing a missing field", () => {
    expect(detectedStartProperty("learning-log", ["Studied", "Modified"])).toBe("Studied");
  });

  it("creates read-only profiles with preset mappings and a detected start date", () => {
    const learning = createPresetProfile("Demo/Learning", "learning-log", ["Date"]);
    expect(learning).toMatchObject({ editable: false, folder: "Demo/Learning" });
    expect(learning.properties).toMatchObject({ start: "Date", title: "topic", category: "course" });

    const deadline = createPresetProfile("Demo/Projects", "project-deadline", ["due"]);
    expect(deadline.properties).toMatchObject({ start: "due", title: "title", category: "project" });
  });
});
