import { describe, expect, it } from "vitest";

import {
  calendarSurfaceState,
  responsiveEventLimit,
} from "../src/presentation";

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

describe("responsive event density", () => {
  it("uses measured cell geometry and reserves the overflow row only when needed", () => {
    expect(responsiveEventLimit({
      availableHeight: 112,
      cardHeight: 32,
      eventCount: 3,
      gap: 4,
      overflowHeight: 24,
    })).toBe(3);
    expect(responsiveEventLimit({
      availableHeight: 112,
      cardHeight: 32,
      eventCount: 8,
      gap: 4,
      overflowHeight: 24,
    })).toBe(2);
    expect(responsiveEventLimit({
      availableHeight: 220,
      cardHeight: 32,
      eventCount: 8,
      gap: 4,
      overflowHeight: 24,
    })).toBe(5);
  });

  it("keeps one event reachable before layout measurement", () => {
    expect(responsiveEventLimit({
      availableHeight: 0,
      cardHeight: 0,
      eventCount: 4,
      gap: 0,
      overflowHeight: 0,
    })).toBe(1);
  });
});
