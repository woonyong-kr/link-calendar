import { ItemView, Menu, type WorkspaceLeaf, setIcon } from "obsidian";

import { firstDayOfWeek, formatMessage, monthTitle, translate, weekdayNames } from "./i18n";
import {
  type CalendarEvent,
  type CalendarSettings,
  type CalendarSnapshot,
  addMonths,
  categoryToken,
  eachDate,
  fileTitle,
  localDateKey,
  monthGrid,
  parseDateKey,
} from "./model";
import { gridMovement, matchesEventQuery } from "./policy";

export const VIEW_TYPE = "context-calendar-view";

export interface CalendarActions {
  create(date: string): Promise<void>;
  move(event: CalendarEvent, date: string): Promise<void>;
  open(path: string): Promise<void>;
  openSettings(): void;
}

export class ContextCalendarView extends ItemView {
  private month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  private query = "";
  private selectedDate = localDateKey(new Date());
  private selectedEventId = "";
  private sideClosed = false;
  private snapshot: CalendarSnapshot = { diagnostics: [], events: [], revision: 0 };

  constructor(
    leaf: WorkspaceLeaf,
    private readonly getSettings: () => CalendarSettings,
    private readonly actions: CalendarActions,
  ) {
    super(leaf);
  }

  override getViewType(): string {
    return VIEW_TYPE;
  }

  override getDisplayText(): string {
    return "Context Calendar";
  }

  override getIcon(): string {
    return "calendar-days";
  }

  setSnapshot(snapshot: CalendarSnapshot): void {
    this.snapshot = snapshot;
    if (this.selectedEventId && !snapshot.events.some((event) => event.id === this.selectedEventId)) {
      this.selectedEventId = "";
    }
    if (!this.selectedEventId && snapshot.events.length) {
      this.selectedEventId = snapshot.events.find((event) => event.startDate === this.selectedDate)?.id ?? "";
    }
    this.render();
  }

  override async onOpen(): Promise<void> {
    this.contentEl.addClass("context-calendar-view");
    this.render();
  }

  private render(): void {
    const settings = this.getSettings();
    const locale = settings.locale;
    const root = this.contentEl;
    root.empty();
    const shell = root.createDiv({ cls: "context-calendar" });
    const header = shell.createEl("header", { cls: "context-calendar__header" });
    const navigation = header.createDiv({ cls: "context-calendar__navigation" });
    navigation.append(
      iconButton("chevron-left", translate(locale, "previous"), () => {
        this.month = addMonths(this.month, -1);
        this.render();
      }),
      iconButton("chevron-right", translate(locale, "next"), () => {
        this.month = addMonths(this.month, 1);
        this.render();
      }),
    );
    header.createEl("h1", {
      cls: "context-calendar__title",
      text: monthTitle(locale, this.month),
      attr: { "aria-live": "polite" },
    });
    const tools = header.createDiv({ cls: "context-calendar__tools" });
    const search = tools.createEl("input", {
      cls: "context-calendar__search",
      attr: { "aria-label": translate(locale, "search"), type: "search" },
      placeholder: translate(locale, "search"),
      value: this.query,
    });
    search.addEventListener("input", (event) => {
      this.query = search.value;
      if (event instanceof InputEvent && event.isComposing) return;
      this.render();
      const nextSearch = this.contentEl.querySelector<HTMLInputElement>(".context-calendar__search");
      nextSearch?.focus();
      nextSearch?.setSelectionRange(this.query.length, this.query.length);
    });
    tools.createEl("button", {
      cls: "context-calendar__today",
      text: translate(locale, "today"),
      attr: { type: "button" },
    }).addEventListener("click", () => {
      const today = new Date();
      this.month = new Date(today.getFullYear(), today.getMonth(), 1);
      this.selectedDate = localDateKey(today);
      this.render();
    });
    if (settings.profiles.some((profile) => profile.enabled && profile.editable && profile.folder)) {
      const add = iconButton("plus", translate(locale, "create"), () => void this.actions.create(this.selectedDate));
      add.addClass("context-calendar__add");
      tools.append(add);
    }
    const menu = iconButton("settings", translate(locale, "settings"), () => this.actions.openSettings());
    tools.append(menu);

    if (!settings.profiles.length) {
      const empty = shell.createDiv({ cls: "context-calendar__onboarding" });
      setIcon(empty.createDiv({ cls: "context-calendar__onboarding-icon" }), "calendar-search");
      empty.createEl("h2", { text: translate(locale, "noSources") });
      empty.createEl("button", { text: translate(locale, "settings") }).onclick = () => this.actions.openSettings();
      return;
    }

    const body = shell.createDiv({ cls: "context-calendar__body" });
    this.renderMonth(body, settings);
    const hasSelectedContent = this.snapshot.events.some(
      (event) => event.startDate <= this.selectedDate && event.endDate >= this.selectedDate,
    );
    if (settings.showContext && (hasSelectedContent || this.snapshot.diagnostics.length > 0) && !this.sideClosed) {
      body.addClass("has-side");
      this.renderSidePanel(body, settings);
    }
  }

  private renderMonth(parent: HTMLElement, settings: CalendarSettings): void {
    const monthPanel = parent.createEl("section", { cls: "context-calendar__month" });
    const grid = monthPanel.createDiv({ cls: "context-calendar__grid", attr: { role: "grid" } });
    const firstDay = firstDayOfWeek(settings.locale, settings.weekStart);
    const dates = monthGrid(this.month, firstDay);
    grid.addClass(`weeks-${String(dates.length / 7)}`);
    for (const weekday of weekdayNames(settings.locale, firstDay)) {
      grid.createDiv({ cls: "context-calendar__weekday", text: weekday, attr: { role: "columnheader" } });
    }
    const visibleEvents = this.snapshot.events.filter((event) => matchesEventQuery(event, this.query));
    const eventsByDate = new Map<string, CalendarEvent[]>();
    for (const event of visibleEvents) {
      for (const day of eachDate(event.startDate, event.endDate)) {
        const events = eventsByDate.get(day) ?? [];
        events.push(event);
        eventsByDate.set(day, events);
      }
    }
    const today = localDateKey(new Date());
    for (const date of dates) {
      const day = parseDateKey(date);
      const outside = day.getMonth() !== this.month.getMonth();
      const cell = grid.createDiv({
        cls: `context-calendar__day${outside ? " is-outside" : ""}${date === this.selectedDate ? " is-selected" : ""}`,
        attr: { "aria-label": date, role: "gridcell", tabindex: date === this.selectedDate ? "0" : "-1" },
      });
      const dayButton = cell.createEl("button", {
        cls: `context-calendar__day-number${date === today ? " is-today" : ""}`,
        text: String(day.getDate()),
        attr: { "aria-label": date === today ? `${date}, ${translate(settings.locale, "today")}` : date, type: "button" },
      });
      dayButton.onclick = () => this.selectDate(date);
      cell.addEventListener("click", (event) => {
        if (event.target === cell) this.selectDate(date);
      });
      cell.addEventListener("keydown", (event) => {
        if (event.target !== cell) return;
        const weekOffset = (day.getDay() - firstDay + 7) % 7;
        const movement = gridMovement(event.key, weekOffset);
        if (movement !== null) {
          event.preventDefault();
          const target = new Date(day);
          target.setDate(target.getDate() + movement);
          this.selectedDate = localDateKey(target);
          this.month = new Date(target.getFullYear(), target.getMonth(), 1);
          this.render();
          window.requestAnimationFrame(() => {
            this.contentEl.querySelector<HTMLElement>(`[role="gridcell"][aria-label="${this.selectedDate}"]`)?.focus();
          });
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.selectDate(date);
        }
      });
      cell.addEventListener("dragover", (event) => event.preventDefault());
      cell.addEventListener("drop", (event) => {
        event.preventDefault();
        const id = event.dataTransfer?.getData("text/context-calendar-event");
        const calendarEvent = this.snapshot.events.find((candidate) => candidate.id === id);
        if (calendarEvent?.editable) void this.actions.move(calendarEvent, date);
      });
      const cards = cell.createDiv({ cls: "context-calendar__cards" });
      const events = eventsByDate.get(date) ?? [];
      const limit = 3;
      for (const event of events.slice(0, limit)) this.renderCard(cards, event, settings, date);
      if (events.length > limit) {
        cards.createEl("button", {
          cls: "context-calendar__more",
          text: `+${String(events.length - limit)}`,
          attr: {
            "aria-label": formatMessage(settings.locale, "moreEvents", {
              count: String(events.length - limit),
            }),
            type: "button",
          },
        }).onclick = () => this.selectDate(date);
      }
    }
  }

  private renderCard(
    parent: HTMLElement,
    event: CalendarEvent,
    settings: CalendarSettings,
    visibleDate: string,
  ): void {
    const card = parent.createEl("button", {
      cls: `context-calendar__card ${categoryToken(event.category)}`,
      text: event.title,
      title: event.title,
      attr: {
        "aria-label": event.category ? `${event.title}, ${event.category}` : event.title,
        draggable: String(event.editable),
        type: "button",
      },
    });
    if (event.id === this.selectedEventId) card.addClass("is-active");
    card.onclick = (click) => {
      click.stopPropagation();
      this.selectedDate = visibleDate;
      this.selectedEventId = event.id;
      this.sideClosed = false;
      this.render();
    };
    card.ondblclick = () => void this.actions.open(event.filePath);
    card.oncontextmenu = (mouseEvent) => {
      const menu = new Menu();
      menu.addItem((item) => item
        .setTitle(translate(settings.locale, "open"))
        .setIcon("file-text")
        .onClick(() => void this.actions.open(event.filePath)));
      if (event.editable) {
        menu.addItem((item) => item
          .setTitle(translate(settings.locale, "create"))
          .setIcon("copy-plus")
          .onClick(() => void this.actions.create(event.startDate)));
      }
      menu.showAtMouseEvent(mouseEvent);
    };
    card.addEventListener("dragstart", (dragEvent) => {
      if (!event.editable) {
        dragEvent.preventDefault();
        return;
      }
      dragEvent.dataTransfer?.setData("text/context-calendar-event", event.id);
      if (dragEvent.dataTransfer) dragEvent.dataTransfer.effectAllowed = "move";
    });
  }

  private renderSidePanel(parent: HTMLElement, settings: CalendarSettings): void {
    const panel = parent.createEl("aside", { cls: "context-calendar__side" });
    const dateEvents = this.snapshot.events.filter(
      (event) => event.startDate <= this.selectedDate && event.endDate >= this.selectedDate,
    );
    const heading = panel.createDiv({ cls: "context-calendar__side-heading" });
    heading.createEl("h2", { text: translate(settings.locale, "agenda") });
    heading.append(iconButton("x", translate(settings.locale, "closeContext"), () => {
      this.sideClosed = true;
      this.render();
    }));
    panel.createEl("time", { cls: "context-calendar__selected-date", text: this.selectedDate });
    if (!dateEvents.length) panel.createDiv({ cls: "context-calendar__empty", text: translate(settings.locale, "empty") });
    for (const event of dateEvents) {
      const item = panel.createEl("button", {
        cls: `context-calendar__agenda-item ${categoryToken(event.category)}${event.id === this.selectedEventId ? " is-active" : ""}`,
        attr: { type: "button" },
      });
      item.createSpan({ text: event.title });
      if (event.category) item.createEl("small", { text: event.category });
      item.onclick = () => {
        this.selectedEventId = event.id;
        this.render();
      };
    }
    const selected = this.snapshot.events.find((event) => event.id === this.selectedEventId);
    if (selected) this.renderContext(panel, selected, settings);
    if (this.snapshot.diagnostics.length) {
      const diagnostics = panel.createEl("details", { cls: "context-calendar__diagnostics" });
      diagnostics.createEl("summary", {
        text: `${translate(settings.locale, "diagnostics")} · ${String(this.snapshot.diagnostics.length)}`,
      });
      for (const item of this.snapshot.diagnostics.slice(0, 20)) {
        diagnostics.createEl("button", {
          text: `${fileTitle(item.filePath)} — ${translate(settings.locale, diagnosticMessage(item.code))}`,
          title: item.filePath,
          attr: { type: "button" },
        }).onclick = () => void this.actions.open(item.filePath);
      }
    }
  }

  private renderContext(parent: HTMLElement, event: CalendarEvent, settings: CalendarSettings): void {
    const section = parent.createEl("section", { cls: "context-calendar__context" });
    const heading = section.createDiv({ cls: "context-calendar__context-heading" });
    heading.createEl("h2", { text: translate(settings.locale, "context") });
    heading.createEl("button", {
      cls: "context-calendar__open",
      text: translate(settings.locale, "open"),
      attr: { type: "button" },
    }).onclick = () => void this.actions.open(event.filePath);
    section.createEl("h3", { text: event.title });
    if (!event.editable) section.createDiv({ cls: "context-calendar__readonly", text: translate(settings.locale, "readOnly") });
    for (const [key, label] of [
      ["people", translate(settings.locale, "people")],
      ["project", translate(settings.locale, "project")],
      ["related", translate(settings.locale, "related")],
      ["links", translate(settings.locale, "links")],
      ["backlinks", translate(settings.locale, "backlinks")],
    ] as const) {
      const linksForSection = event.context[key];
      if (!linksForSection.length) continue;
      section.createEl("h4", { text: label });
      const links = section.createDiv({ cls: "context-calendar__context-links" });
      for (const link of linksForSection) {
        links.createEl("button", {
          text: link.label,
          title: link.path,
          attr: { type: "button" },
        }).onclick = () => void this.actions.open(link.path);
      }
    }
  }

  private selectDate(date: string): void {
    this.selectedDate = date;
    this.selectedEventId = this.snapshot.events.find(
      (event) => event.startDate <= date && event.endDate >= date,
    )?.id ?? "";
    this.sideClosed = false;
    this.render();
  }
}

function diagnosticMessage(code: CalendarSnapshot["diagnostics"][number]["code"]):
  | "diagnosticEndBeforeStart"
  | "diagnosticEventTooLong"
  | "diagnosticInvalidDate"
  | "diagnosticInvalidEnd"
  | "diagnosticMissingDate" {
  if (code === "end-before-start") return "diagnosticEndBeforeStart";
  if (code === "event-too-long") return "diagnosticEventTooLong";
  if (code === "invalid-date") return "diagnosticInvalidDate";
  if (code === "invalid-end") return "diagnosticInvalidEnd";
  return "diagnosticMissingDate";
}

function iconButton(icon: string, label: string, action: () => void): HTMLButtonElement {
  const button = createEl("button", { cls: "context-calendar__icon-button" });
  button.type = "button";
  button.ariaLabel = label;
  button.title = label;
  setIcon(button, icon);
  button.addEventListener("click", action);
  return button;
}
