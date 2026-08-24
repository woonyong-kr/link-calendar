import { ItemView, Menu, type WorkspaceLeaf, setIcon } from "obsidian";

import {
  firstDayOfWeek,
  formatMessage,
  monthTitle,
  resolvedLocale,
  translate,
  weekdayNames,
} from "./i18n";
import {
  type CalendarEvent,
  type CalendarSettings,
  type CalendarSnapshot,
  addMonths,
  categoryToneMap,
  categoryToken,
  eachDate,
  fileTitle,
  localDateKey,
  monthGrid,
  parseDateKey,
} from "./model";
import {
  type EventLens,
  filterCalendarEvents,
  gridMovement,
  resolveEventPath,
} from "./policy";

export const VIEW_TYPE = "context-calendar-view";

export interface CalendarActions {
  create(date: string): Promise<void>;
  move(event: CalendarEvent, date: string): Promise<void>;
  open(path: string): Promise<void>;
  openSettings(): void;
  setup(): void;
}

export class ContextCalendarView extends ItemView {
  private month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  private query = "";
  private selectedDate = localDateKey(new Date());
  private selectedEventId = "";
  private sideClosed = true;
  private profileId = "";
  private lens: EventLens | null = null;
  private snapshot: CalendarSnapshot = { diagnostics: [], events: [], revision: 0 };
  private categoryTones: ReadonlyMap<string, string> = new Map();

  constructor(
    leaf: WorkspaceLeaf,
    private readonly getSettings: () => CalendarSettings,
    private readonly getSnapshot: () => CalendarSnapshot,
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
    this.categoryTones = categoryToneMap(snapshot.events.map((event) => event.category));
    if (this.selectedEventId && !snapshot.events.some((event) => event.id === this.selectedEventId)) {
      this.selectedEventId = "";
    }
    this.render();
  }

  revealPath(path: string): boolean {
    const event = resolveEventPath(this.snapshot.events, path);
    if (!event) return false;
    const date = parseDateKey(event.startDate);
    this.month = new Date(date.getFullYear(), date.getMonth(), 1);
    this.selectedDate = event.startDate;
    this.selectedEventId = event.id;
    this.profileId = "";
    this.lens = null;
    this.sideClosed = false;
    this.render();
    window.requestAnimationFrame(() => {
      Array.from(this.contentEl.querySelectorAll<HTMLElement>("[data-event-id]"))
        .find((element) => element.dataset.eventId === event.id)?.focus();
    });
    return true;
  }

  override async onOpen(): Promise<void> {
    this.contentEl.addClass("context-calendar-view");
    this.registerDomEvent(document, "fullscreenchange", () => this.render());
    this.setSnapshot(this.getSnapshot());
  }

  override async onClose(): Promise<void> {
    if (document.fullscreenElement === this.contentEl) await document.exitFullscreen();
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
    navigation.createEl("button", {
      cls: "context-calendar__today",
      text: translate(locale, "today"),
      attr: { type: "button" },
    }).addEventListener("click", () => {
      const today = new Date();
      this.month = new Date(today.getFullYear(), today.getMonth(), 1);
      this.selectedDate = localDateKey(today);
      this.render();
    });
    header.createEl("h1", {
      cls: "context-calendar__title",
      text: monthTitle(locale, this.month),
      attr: { "aria-live": "polite" },
    });
    const tools = header.createDiv({ cls: "context-calendar__tools" });
    const searchContainer = tools.createDiv({
      cls: "search-input-container context-calendar__search",
    });
    const search = searchContainer.createEl("input", {
      attr: { "aria-label": translate(locale, "search"), type: "search" },
      placeholder: translate(locale, "search"),
      value: this.query,
    });
    search.addEventListener("input", (event) => {
      this.query = search.value;
      if ("isComposing" in event && event.isComposing === true) return;
      this.render();
      const nextSearch = this.contentEl.querySelector<HTMLInputElement>(".context-calendar__search input");
      nextSearch?.focus();
      nextSearch?.setSelectionRange(this.query.length, this.query.length);
    });
    if (settings.profiles.some((profile) => profile.enabled && profile.editable && profile.folder)) {
      const add = iconButton("plus", translate(locale, "create"), () => void this.actions.create(this.selectedDate));
      add.addClass("context-calendar__add");
      tools.append(add);
    }
    const focus = iconButton(
      document.fullscreenElement === this.contentEl ? "minimize-2" : "maximize-2",
      translate(
        locale,
        document.fullscreenElement === this.contentEl ? "exitFocusMode" : "focusMode",
      ),
      () => {
        void this.toggleFocusMode();
      },
    );
    tools.append(focus);
    const menu = iconButton("settings", translate(locale, "settings"), () => this.actions.openSettings());
    tools.append(menu);

    const enabledProfiles = settings.profiles.filter((profile) => profile.enabled && profile.folder);
    if (!enabledProfiles.some((profile) => profile.id === this.profileId)) this.profileId = "";
    if (!enabledProfiles.length) {
      const empty = shell.createDiv({ cls: "context-calendar__onboarding" });
      setIcon(empty.createDiv({ cls: "context-calendar__onboarding-icon" }), "calendar-search");
      empty.createEl("h2", { text: translate(locale, "noSources") });
      empty.createEl("p", { text: translate(locale, "onboarding") });
      empty.createEl("button", {
        cls: "mod-cta",
        text: translate(locale, "chooseFolder"),
      }).onclick = () => this.actions.setup();
      return;
    }

    if (enabledProfiles.length > 1 || this.lens) {
      this.renderScope(shell, settings, enabledProfiles);
    }

    const body = shell.createDiv({ cls: "context-calendar__body" });
    this.renderMonth(body, settings);
    const visibleEvents = this.visibleEvents();
    const hasSelectedContent = visibleEvents.some(
      (event) => event.startDate <= this.selectedDate && event.endDate >= this.selectedDate,
    );
    if (settings.showContext && (hasSelectedContent || this.visibleDiagnostics().length > 0) && !this.sideClosed) {
      body.addClass("has-side");
      this.renderSidePanel(body, settings);
    }
  }

  private async toggleFocusMode(): Promise<void> {
    if (document.fullscreenElement === this.contentEl) await document.exitFullscreen();
    else await this.contentEl.requestFullscreen();
  }

  private renderScope(
    parent: HTMLElement,
    settings: CalendarSettings,
    profiles: CalendarSettings["profiles"],
  ): void {
    const scope = parent.createEl("nav", {
      cls: "context-calendar__scope",
      attr: { "aria-label": translate(settings.locale, "calendarScope") },
    });
    scope.createSpan({
      cls: "context-calendar__scope-label",
      text: translate(settings.locale, "sources"),
    });
    const all = scope.createEl("button", {
      text: translate(settings.locale, "allSources"),
      attr: { "aria-pressed": String(!this.profileId), type: "button" },
    });
    all.onclick = () => {
      this.profileId = "";
      this.normalizeSelection();
      this.render();
    };
    for (const profile of profiles) {
      const count = this.snapshot.events.filter((event) =>
        event.profileId === profile.id && this.overlapsCurrentMonth(event)).length;
      const button = scope.createEl("button", {
        text: `${profile.name} ${String(count)}`,
        attr: { "aria-pressed": String(this.profileId === profile.id), type: "button" },
      });
      button.onclick = () => {
        this.profileId = profile.id;
        this.normalizeSelection();
        this.render();
      };
    }
    if (this.lens) {
      scope.createDiv({ cls: "context-calendar__scope-divider" });
      const clear = scope.createEl("button", {
        cls: "context-calendar__lens",
        text: `${this.lens.label} ×`,
        title: translate(settings.locale, "clearFilter"),
        attr: { type: "button" },
      });
      clear.onclick = () => {
        this.lens = null;
        this.normalizeSelection();
        this.render();
      };
    }
    scope.createSpan({
      cls: "context-calendar__result-count",
      text: formatMessage(settings.locale, "visibleEvents", {
        count: String(this.visibleEvents().filter((event) => this.overlapsCurrentMonth(event)).length),
      }),
    });
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
    const visibleEvents = this.visibleEvents();
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
      cls: `context-calendar__card ${categoryToken(event.category, this.categoryTones)}`,
      title: event.title,
      attr: {
        "aria-label": event.category ? `${event.title}, ${event.category}` : event.title,
        draggable: String(event.editable),
        type: "button",
        "data-event-id": event.id,
      },
    });
    card.createSpan({ cls: "context-calendar__card-title", text: event.title });
    const connectionCount = connectedNoteCount(event);
    if (connectionCount > 0) {
      const context = card.createSpan({
        cls: "context-calendar__card-context",
        title: formatMessage(settings.locale, "connectedNotes", {
          count: String(connectionCount),
        }),
        attr: { "aria-hidden": "true" },
      });
      setIcon(context.createSpan(), "network");
      context.createSpan({ text: String(connectionCount) });
    }
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
    const dateEvents = this.visibleEvents().filter(
      (event) => event.startDate <= this.selectedDate && event.endDate >= this.selectedDate,
    );
    const topbar = panel.createDiv({ cls: "context-calendar__side-topbar" });
    const date = topbar.createDiv({ cls: "context-calendar__side-date" });
    setIcon(date.createSpan({ cls: "context-calendar__side-date-icon" }), "calendar-days");
    date.createEl("time", { text: formatEventDate(settings.locale, this.selectedDate) });
    topbar.append(iconButton("x", translate(settings.locale, "closeContext"), () => {
      this.sideClosed = true;
      this.render();
    }));
    if (!dateEvents.length) panel.createDiv({ cls: "context-calendar__empty", text: translate(settings.locale, "empty") });
    if (dateEvents.length > 1) {
      const agenda = panel.createDiv({ cls: "context-calendar__agenda-switcher" });
      agenda.createDiv({
        cls: "context-calendar__agenda-label",
        text: formatMessage(settings.locale, "eventsOnDate", { count: String(dateEvents.length) }),
      });
      for (const event of dateEvents) {
        const item = agenda.createEl("button", {
          cls: `context-calendar__agenda-item ${categoryToken(event.category, this.categoryTones)}${event.id === this.selectedEventId ? " is-active" : ""}`,
          title: event.title,
          attr: {
            "aria-label": event.category ? `${event.title}, ${event.category}` : event.title,
            type: "button",
          },
        });
        item.createSpan({ cls: "context-calendar__agenda-title", text: event.title });
        item.onclick = () => {
          this.selectedEventId = event.id;
          this.render();
        };
      }
    }
    const selected = dateEvents.find((event) => event.id === this.selectedEventId) ?? dateEvents[0];
    if (selected) this.renderContext(panel, selected, settings);
    const visibleDiagnostics = this.visibleDiagnostics();
    if (visibleDiagnostics.length) {
      const diagnostics = panel.createEl("details", { cls: "context-calendar__diagnostics" });
      diagnostics.createEl("summary", {
        text: `${translate(settings.locale, "diagnostics")} · ${String(visibleDiagnostics.length)}`,
      });
      for (const item of visibleDiagnostics.slice(0, 20)) {
        diagnostics.createEl("button", {
          text: `${fileTitle(item.filePath)} — ${translate(settings.locale, diagnosticMessage(item.code))}`,
          title: item.filePath,
          attr: { type: "button" },
        }).onclick = () => void this.actions.open(item.filePath);
      }
    }
  }

  private renderContext(parent: HTMLElement, event: CalendarEvent, settings: CalendarSettings): void {
    const section = parent.createEl("article", { cls: "context-calendar__event-detail" });
    const heading = section.createDiv({ cls: "context-calendar__event-heading" });
    const identity = heading.createDiv({ cls: "context-calendar__event-identity" });
    identity.createEl("h2", { text: event.title });
    const connectionCount = connectedNoteCount(event);
    if (connectionCount > 0) {
      const summary = identity.createDiv({ cls: "context-calendar__event-summary" });
      setIcon(summary.createSpan(), "network");
      summary.createSpan({
        text: formatMessage(settings.locale, "connectedNotes", {
          count: String(connectionCount),
        }),
      });
    }
    if (!event.editable) {
      const status = identity.createDiv({ cls: "context-calendar__event-status" });
      setIcon(status.createSpan(), "lock-keyhole");
      status.createSpan({ text: translate(settings.locale, "readOnlyShort") });
    }
    heading.createEl("button", {
      cls: "context-calendar__open",
      text: translate(settings.locale, "open"),
      attr: { type: "button" },
    }).onclick = () => void this.actions.open(event.filePath);

    const details = section.createDiv({ cls: "context-calendar__properties" });
    const dateValue = propertyRow(details, "calendar-days", translate(settings.locale, "dateField"));
    dateValue.createEl("time", {
      cls: "context-calendar__property-text",
      text: formatEventRange(settings.locale, event.startDate, event.endDate),
    });
    if (event.category) {
      const value = propertyRow(details, "tag", translate(settings.locale, "category"));
      this.renderFacet(value, {
        kind: "category",
        label: event.category,
        value: event.category,
      }, settings);
    }
    const contextGroups = ([
      ["people", translate(settings.locale, "people")],
      ["project", translate(settings.locale, "project")],
      ["related", translate(settings.locale, "related")],
      ["links", translate(settings.locale, "links")],
      ["backlinks", translate(settings.locale, "backlinks")],
    ] as const).filter(([key]) => event.context[key].length > 0);
    if (contextGroups.length > 0) {
      section.createDiv({
        cls: "context-calendar__section-label",
        text: translate(settings.locale, "context"),
      });
    }
    const connections = section.createDiv({ cls: "context-calendar__properties" });
    for (const [key, label] of contextGroups) {
      const linksForSection = event.context[key];
      const links = propertyRow(connections, propertyIcon(key), label);
      for (const link of linksForSection) {
        const row = links.createDiv({ cls: "context-calendar__property-value" });
        row.createEl("button", {
          cls: "context-calendar__property-link",
          text: link.label,
          title: link.path,
          attr: { type: "button" },
        }).onclick = () => void this.actions.open(link.path);
        const filter = iconButton("list-filter", translate(settings.locale, "filterMonth"), () => {
          this.setLens({ kind: key, label: link.label, value: link.path });
        });
        filter.addClass("context-calendar__context-filter");
        row.append(filter);
      }
    }
  }

  private renderFacet(parent: HTMLElement, lens: EventLens, settings: CalendarSettings): void {
    const row = parent.createDiv({ cls: "context-calendar__property-value" });
    if (lens.kind === "category") {
      row.addClass(categoryToken(lens.value, this.categoryTones));
    }
    const value = row.createEl("button", {
      cls: "context-calendar__property-link",
      text: lens.label,
      title: translate(settings.locale, "filterMonth"),
      attr: { type: "button" },
    });
    value.onclick = () => this.setLens(lens);
    const filter = iconButton("list-filter", translate(settings.locale, "filterMonth"), () => {
      this.setLens(lens);
    });
    filter.addClass("context-calendar__context-filter");
    row.append(filter);
  }

  private setLens(lens: EventLens): void {
    this.lens = lens;
    this.sideClosed = true;
    this.normalizeSelection();
    this.render();
  }

  private visibleEvents(): CalendarEvent[] {
    return filterCalendarEvents(this.snapshot.events, {
      lens: this.lens,
      profileId: this.profileId,
      query: this.query,
    });
  }

  private visibleDiagnostics(): CalendarSnapshot["diagnostics"] {
    return this.snapshot.diagnostics.filter((item) =>
      !this.profileId || item.profileId === this.profileId);
  }

  private normalizeSelection(): void {
    const visible = this.visibleEvents();
    if (visible.some((event) => event.id === this.selectedEventId)) return;
    this.selectedEventId = visible.find(
      (event) => event.startDate <= this.selectedDate && event.endDate >= this.selectedDate,
    )?.id ?? "";
  }

  private overlapsCurrentMonth(event: CalendarEvent): boolean {
    const start = localDateKey(new Date(this.month.getFullYear(), this.month.getMonth(), 1));
    const end = localDateKey(new Date(this.month.getFullYear(), this.month.getMonth() + 1, 0));
    return event.startDate <= end && event.endDate >= start;
  }

  private selectDate(date: string): void {
    this.selectedDate = date;
    this.selectedEventId = this.visibleEvents().find(
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
  const button = createEl("button", {
    cls: "clickable-icon context-calendar__icon-button",
  });
  button.type = "button";
  button.ariaLabel = label;
  button.title = label;
  setIcon(button, icon);
  button.addEventListener("click", action);
  return button;
}

function propertyRow(parent: HTMLElement, icon: string, label: string): HTMLDivElement {
  const row = parent.createDiv({ cls: "context-calendar__property" });
  const name = row.createDiv({ cls: "context-calendar__property-name" });
  setIcon(name.createSpan({ cls: "context-calendar__property-icon" }), icon);
  name.createSpan({ text: label });
  return row.createDiv({ cls: "context-calendar__property-values" });
}

function propertyIcon(
  key: "backlinks" | "links" | "people" | "project" | "related",
): string {
  if (key === "people") return "users";
  if (key === "project") return "folder-kanban";
  if (key === "backlinks") return "corner-up-left";
  if (key === "related") return "network";
  return "link-2";
}

function formatEventDate(locale: CalendarSettings["locale"], date: string): string {
  return new Intl.DateTimeFormat(resolvedLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(date));
}

function formatEventRange(
  locale: CalendarSettings["locale"],
  start: string,
  end: string,
): string {
  const startLabel = formatEventDate(locale, start);
  return start === end ? startLabel : `${startLabel} → ${formatEventDate(locale, end)}`;
}

function connectedNoteCount(event: CalendarEvent): number {
  return new Set(Object.values(event.context).flat().map((link) => link.path)).size;
}
