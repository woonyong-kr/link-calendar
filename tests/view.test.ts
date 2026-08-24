import { describe, expect, it, vi } from "vitest";

import type { CalendarEvent, CalendarSettings, CalendarSnapshot } from "../src/model";
import { ContextCalendarView, type CalendarActions } from "../src/view";

function settings(): CalendarSettings {
  return {
    locale: "en",
    profiles: [{
      editable: false,
      enabled: true,
      folder: "Calendar",
      id: "calendar",
      name: "Calendar notes",
      properties: {
        category: "category",
        end: "end",
        people: "people",
        project: "project",
        related: "related",
        start: "date",
        title: "title",
      },
      recursive: true,
      tag: "",
    }],
    showContext: true,
    weekStart: "sunday",
  };
}

function calendarEvent(): CalendarEvent {
  return {
    category: "Learning",
    context: {
      backlinks: [],
      links: [],
      people: [{ label: "Jane Doe", path: "People/Jane.md" }],
      project: [],
      related: [{ label: "Study plan", path: "Notes/Study plan.md" }],
    },
    editable: false,
    endDate: "2026-08-25",
    filePath: "Calendar/Exam.md",
    id: "calendar:Calendar/Exam.md",
    profileId: "calendar",
    startDate: "2026-08-25",
    title: "Practical certification exam with a long title",
  };
}

function snapshot(overrides: Partial<CalendarSnapshot> = {}): CalendarSnapshot {
  return {
    diagnostics: [],
    events: [calendarEvent()],
    revision: 1,
    ...overrides,
  };
}

function actions(preview = "Practice the complete notebook flow before the exam."): CalendarActions {
  return {
    create: vi.fn(async () => undefined),
    move: vi.fn(async () => undefined),
    open: vi.fn(async () => undefined),
    openSettings: vi.fn(),
    preview: vi.fn(async () => preview),
    setup: vi.fn(),
  };
}

async function openView(
  currentSnapshot: CalendarSnapshot,
  currentActions = actions(),
): Promise<{ actions: CalendarActions; view: ContextCalendarView }> {
  const view = new ContextCalendarView(
    {} as never,
    settings,
    () => currentSnapshot,
    currentActions,
  );
  document.body.append(view.contentEl);
  await view.onOpen();
  return { actions: currentActions, view };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve));
}

describe("Context Calendar view", () => {
  it("renders loading, empty, and diagnostic error states", async () => {
    const loading = await openView(snapshot({ events: [], revision: 0 }));
    expect(loading.view.contentEl.querySelector(".is-loading")?.textContent).toContain(
      "Building your calendar",
    );

    const empty = await openView(snapshot({ events: [] }));
    expect(empty.view.contentEl.querySelector(".is-empty")?.textContent).toContain(
      "No dated notes this month",
    );

    const error = await openView(snapshot({
      diagnostics: [{ code: "invalid-date", filePath: "Calendar/Broken.md", profileId: "calendar" }],
      events: [],
    }));
    expect(error.view.contentEl.querySelector('[role="alert"]')?.textContent).toContain(
      "Some dated notes need review",
    );
  });

  it("keeps page content private until an event is explicitly selected", async () => {
    const currentActions = actions();
    const { view } = await openView(snapshot(), currentActions);
    expect(vi.mocked(currentActions.preview)).not.toHaveBeenCalled();
    expect(view.contentEl.querySelector(".context-calendar__side")).toBeNull();

    view.contentEl.querySelector<HTMLButtonElement>("[data-event-id]")?.click();
    await settle();

    expect(vi.mocked(currentActions.preview)).toHaveBeenCalledWith("Calendar/Exam.md");
    expect(view.contentEl.querySelector(".context-calendar__preview")?.textContent).toContain(
      "Practice the complete notebook flow",
    );
    expect(view.contentEl.querySelector(".context-calendar__side")).not.toBeNull();
  });

  it("exposes month-grid selection semantics without a duplicate date button", async () => {
    const { view } = await openView(snapshot());
    const grid = view.contentEl.querySelector('[role="grid"]');
    const selected = view.contentEl.querySelector('[role="gridcell"][aria-selected="true"]');
    const today = view.contentEl.querySelector('[role="gridcell"][aria-current="date"]');

    expect(grid?.getAttribute("aria-label")).toBe("August 2026");
    expect(selected?.getAttribute("tabindex")).toBe("0");
    expect(selected?.querySelector("button.context-calendar__day-number")).toBeNull();
    expect(today).not.toBeNull();

    selected?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    await settle();
    const next = view.contentEl.querySelector('[role="gridcell"][aria-selected="true"]');
    expect(next?.getAttribute("aria-label")).toBe("2026-08-26");
    expect(document.activeElement).toBe(next);
  });

  it("distinguishes a filtered-empty month and restores it without changing notes", async () => {
    const { view } = await openView(snapshot());
    const search = view.contentEl.querySelector<HTMLInputElement>(".context-calendar__search input");
    if (!search) throw new Error("Search input did not render");
    search.value = "no matching note";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 100));

    expect(view.contentEl.querySelector(".is-filtered-empty")?.textContent).toContain(
      "No notes match these filters",
    );
    view.contentEl.querySelector<HTMLButtonElement>(".is-filtered-empty button")?.click();
    expect(view.contentEl.querySelectorAll("[data-event-id]")).toHaveLength(1);
  });

  it("opens the Markdown page with the keyboard and restores card focus after Escape", async () => {
    const currentActions = actions();
    const { view } = await openView(snapshot(), currentActions);
    const card = view.contentEl.querySelector<HTMLButtonElement>("[data-event-id]");
    card?.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
      metaKey: true,
    }));
    expect(vi.mocked(currentActions.open)).toHaveBeenCalledWith("Calendar/Exam.md");

    card?.click();
    await settle();
    view.contentEl.querySelector<HTMLElement>(".context-calendar__side")?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );
    await settle();

    expect(view.contentEl.querySelector(".context-calendar__side")).toBeNull();
    expect(document.activeElement?.getAttribute("data-event-id")).toBe(calendarEvent().id);
  });

  it("renders relations as page actions and facets as pressed filters", async () => {
    const { view } = await openView(snapshot());
    view.contentEl.querySelector<HTMLButtonElement>("[data-event-id]")?.click();
    await settle();

    expect(view.contentEl.querySelector(".context-calendar__relation-link")?.textContent).toContain(
      "Study plan",
    );
    const person = view.contentEl
      .findAll(".context-calendar__property-link")
      .find((button) => button.textContent === "Jane Doe") as HTMLButtonElement | undefined;
    person?.click();
    expect(view.contentEl.textContent).toContain("Jane Doe ×");
  });
});
