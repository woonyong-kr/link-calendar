import { describe, expect, it } from "vitest";

import { calendarSurfaceState } from "../src/presentation";

describe("calendar surface state", () => {
  it("distinguishes loading, empty, filtered, invalid, and ready months", () => {
    expect(calendarSurfaceState({
      diagnosticCount: 0,
      eventCount: 0,
      filtered: false,
      revision: 0,
    })).toBe("loading");
    expect(calendarSurfaceState({
      diagnosticCount: 0,
      eventCount: 0,
      filtered: false,
      revision: 1,
    })).toBe("empty");
    expect(calendarSurfaceState({
      diagnosticCount: 2,
      eventCount: 0,
      filtered: false,
      revision: 1,
    })).toBe("error");
    expect(calendarSurfaceState({
      diagnosticCount: 2,
      eventCount: 0,
      filtered: true,
      revision: 1,
    })).toBe("filtered-empty");
    expect(calendarSurfaceState({
      diagnosticCount: 2,
      eventCount: 1,
      filtered: false,
      revision: 1,
    })).toBe("ready");
  });
});
