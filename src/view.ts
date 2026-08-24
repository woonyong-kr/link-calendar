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
  contextLinkAction,
  filterCalendarEvents,
  gridMovement,
  resolveEventPath,
} from "./policy";
import {
  type CalendarSurfaceState,
  calendarSurfaceState,
  responsiveEventLimit,
} from "./presentation";

export const VIEW_TYPE = "context-calendar-view";

const PANEL_ID = "context-calendar-page-peek";
const PANEL_TITLE_ID = "context-calendar-page-peek-title";
const SEARCH_DELAY_MS = 80;

export interface CalendarActions {
  create: (date: string) => Promise<void>;
  move: (event: CalendarEvent, date: string) => Promise<void>;
  open: (path: string) => Promise<void>;
  openSettings: () => void;
  preview: (path: string) => Promise<string>;
  setup: () => void;
}

interface PreviewState {
  eventId: string;
  status: "empty" | "error" | "idle" | "loading" | "ready";
  text: string;
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
  private preview: PreviewState = { eventId: "", status: "idle", text: "" };
  private previewRequest = 0;
  private densityObserver: ResizeObserver | null = null;
  private densityFrame: number | null = null;
  private searchTimer: number | null = null;

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
      this.clearSelection();
    }
    this.render();
  }

  revealPath(path: string): boolean {
    const event = resolveEventPath(this.snapshot.events, path);
    if (!event) return false;
    const date = parseDateKey(event.startDate);
    this.month = new Date(date.getFullYear(), date.getMonth(), 1);
    this.profileId = "";
    this.lens = null;
    this.selectEvent(event, event.startDate);
    return true;
  }

  override async onOpen(): Promise<void> {
    this.contentEl.addClass("context-calendar-view");
    this.registerDomEvent(document, "fullscreenchange", () => this.render());
    this.registerDomEvent(this.contentEl, "keydown", (event) => {
      if (event.key === "Escape" && !this.sideClosed) {
        event.preventDefault();
        this.closeSidePanel();
      }
    });
    this.setSnapshot(this.getSnapshot());
  }

  override async onClose(): Promise<void> {
    this.disconnectDensityObserver();
    if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
    if (document.fullscreenElement === this.contentEl) await document.exitFullscreen();
  }

  private render(): void {
    this.disconnectDensityObserver();
    const settings = this.getSettings();
    const root = this.contentEl;
    root.empty();
    const shell = root.createDiv({ cls: "context-calendar" });
    this.renderHeader(shell, settings);

    const enabledProfiles = settings.profiles.filter((profile) => profile.enabled && profile.folder);
    if (!enabledProfiles.some((profile) => profile.id === this.profileId)) this.profileId = "";
    if (!enabledProfiles.length) {
      this.renderOnboarding(shell, settings);
      return;
    }

    if (enabledProfiles.length > 1 || this.lens || this.query) {
      this.renderScope(shell, settings, enabledProfiles);
    }

    const body = shell.createDiv({ cls: "context-calendar__body" });
    const monthPanel = this.renderMonth(body, settings);
    const visibleEvents = this.visibleEvents();
    const monthEvents = visibleEvents.filter((event) => this.overlapsCurrentMonth(event));
    const diagnostics = this.visibleDiagnostics();
    const state = calendarSurfaceState({
      diagnosticCount: diagnostics.length,
      eventCount: monthEvents.length,
      filtered: Boolean(this.query.trim() || this.lens || this.profileId),
      revision: this.snapshot.revision,
    });
    this.renderSurfaceState(monthPanel, state, settings);
    if (state === "ready" && diagnostics.length > 0) {
      this.renderDiagnosticNotice(monthPanel, settings, diagnostics.length);
    }

    const hasSelectedContent = visibleEvents.some(
      (event) => event.startDate <= this.selectedDate && event.endDate >= this.selectedDate,
    );
    if (
      settings.showContext
      && (hasSelectedContent || diagnostics.length > 0)
      && !this.sideClosed
    ) {
      body.addClass("has-side");
      this.renderSidePanel(body, settings);
    }
  }

  private renderHeader(parent: HTMLElement, settings: CalendarSettings): void {
    const locale = settings.locale;
    const header = parent.createEl("header", { cls: "context-calendar__header" });
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
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => {
        this.searchTimer = null;
        this.normalizeSelection();
        this.render();
        const next = this.contentEl.querySelector<HTMLInputElement>(".context-calendar__search input");
        next?.focus();
        next?.setSelectionRange(this.query.length, this.query.length);
      }, SEARCH_DELAY_MS);
    });
    if (settings.profiles.some((profile) => profile.enabled && profile.editable && profile.folder)) {
      const add = iconButton("plus", translate(locale, "create"), () => {
        void this.actions.create(this.selectedDate);
      });
      add.addClass("context-calendar__add");
      tools.append(add);
    }
    tools.append(iconButton(
      document.fullscreenElement === this.contentEl ? "minimize-2" : "maximize-2",
      translate(locale, document.fullscreenElement === this.contentEl ? "exitFocusMode" : "focusMode"),
      () => void this.toggleFocusMode(),
    ));
    tools.append(iconButton("settings", translate(locale, "settings"), () => {
      this.actions.openSettings();
    }));
  }

  private renderOnboarding(parent: HTMLElement, settings: CalendarSettings): void {
    const empty = parent.createDiv({
      cls: "context-calendar__onboarding",
      attr: { "aria-live": "polite", role: "status" },
    });
    setIcon(empty.createDiv({ cls: "context-calendar__onboarding-icon" }), "calendar-search");
    empty.createEl("h2", { text: translate(settings.locale, "noSources") });
    empty.createEl("p", { text: translate(settings.locale, "onboarding") });
    empty.createEl("button", {
      cls: "mod-cta",
      text: translate(settings.locale, "chooseFolder"),
      attr: { type: "button" },
    }).onclick = () => this.actions.setup();
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
    scope.createSpan({ cls: "context-calendar__scope-label", text: translate(settings.locale, "sources") });
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
    if (this.lens || this.query) {
      scope.createDiv({ cls: "context-calendar__scope-divider" });
      const label = this.lens?.label || this.query;
      const clear = scope.createEl("button", {
        cls: "context-calendar__lens",
        text: `${label} ×`,
        title: translate(settings.locale, "clearFilter"),
        attr: { type: "button" },
      });
      clear.onclick = () => this.clearFilters();
    }
    scope.createSpan({
      cls: "context-calendar__result-count",
      text: formatMessage(settings.locale, "visibleEvents", {
        count: String(this.visibleEvents().filter((event) => this.overlapsCurrentMonth(event)).length),
      }),
      attr: { "aria-live": "polite" },
    });
  }

  private renderMonth(parent: HTMLElement, settings: CalendarSettings): HTMLElement {
    const monthPanel = parent.createEl("section", { cls: "context-calendar__month" });
    const firstDay = firstDayOfWeek(settings.locale, settings.weekStart);
    const dates = monthGrid(this.month, firstDay);
    const weekCount = dates.length / 7;
    const grid = monthPanel.createDiv({
      cls: `context-calendar__grid weeks-${String(weekCount)}`,
      attr: {
        "aria-colcount": "7",
        "aria-label": monthTitle(settings.locale, this.month),
        "aria-rowcount": String(weekCount + 1),
        role: "grid",
      },
    });
    weekdayNames(settings.locale, firstDay).forEach((weekday, index) => {
      grid.createDiv({
        cls: "context-calendar__weekday",
        text: weekday,
        attr: { "aria-colindex": String(index + 1), role: "columnheader" },
      });
    });
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
    dates.forEach((date, index) => {
      const day = parseDateKey(date);
      const outside = day.getMonth() !== this.month.getMonth();
      const cell = grid.createDiv({
        cls: `context-calendar__day${outside ? " is-outside" : ""}${date === this.selectedDate ? " is-selected" : ""}`,
        attr: {
          "aria-colindex": String((index % 7) + 1),
          "aria-current": date === today ? "date" : null,
          "aria-label": date === today ? `${date}, ${translate(settings.locale, "today")}` : date,
          "aria-rowindex": String(Math.floor(index / 7) + 2),
          "aria-selected": String(date === this.selectedDate),
          role: "gridcell",
          tabindex: date === this.selectedDate ? "0" : "-1",
        },
      });
      cell.createSpan({
        cls: `context-calendar__day-number${date === today ? " is-today" : ""}`,
        text: String(day.getDate()),
        attr: { "aria-hidden": "true" },
      });
      cell.addEventListener("click", (event) => {
        if (event.target === cell || event.target === cell.firstElementChild) this.selectDate(date);
      });
      cell.addEventListener("keydown", (event) => this.handleDayKey(event, day, date, firstDay));
      cell.addEventListener("dragover", (event) => event.preventDefault());
      cell.addEventListener("drop", (event) => {
        event.preventDefault();
        const id = event.dataTransfer?.getData("text/context-calendar-event");
        const calendarEvent = this.snapshot.events.find((candidate) => candidate.id === id);
        if (calendarEvent?.editable) void this.actions.move(calendarEvent, date);
      });
      const events = eventsByDate.get(date) ?? [];
      const cards = cell.createDiv({
        cls: "context-calendar__cards",
        attr: { "data-event-count": String(events.length) },
      });
      for (const event of events) this.renderCard(cards, event, settings, date);
      if (events.length > 0) {
        const more = cards.createEl("button", {
          cls: "context-calendar__more",
          attr: { hidden: "", type: "button" },
        });
        more.onclick = () => this.selectDate(date);
      }
    });
    this.installDensityObserver(grid, settings);
    return monthPanel;
  }

  private handleDayKey(
    event: KeyboardEvent,
    day: Date,
    date: string,
    firstDay: 0 | 1,
  ): void {
    if (event.target !== event.currentTarget) return;
    const weekOffset = (day.getDay() - firstDay + 7) % 7;
    const movement = gridMovement(event.key, weekOffset);
    if (movement !== null) {
      event.preventDefault();
      const target = new Date(day);
      target.setDate(target.getDate() + movement);
      this.selectedDate = localDateKey(target);
      this.month = new Date(target.getFullYear(), target.getMonth(), 1);
      this.render();
      window.requestAnimationFrame(() => this.focusSelectedDay());
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.selectDate(date);
    }
  }

  private renderCard(
    parent: HTMLElement,
    event: CalendarEvent,
    settings: CalendarSettings,
    visibleDate: string,
  ): void {
    const connectionCount = connectedNoteCount(event);
    const accessibleName = [
      event.title,
      event.category,
      connectionCount > 0
        ? formatMessage(settings.locale, "connectedNotes", { count: String(connectionCount) })
        : "",
    ].filter(Boolean).join(", ");
    const card = parent.createEl("button", {
      cls: `context-calendar__card ${categoryToken(event.category, this.categoryTones)}`,
      title: event.title,
      attr: {
        "aria-controls": PANEL_ID,
        "aria-expanded": String(event.id === this.selectedEventId && !this.sideClosed),
        "aria-label": accessibleName,
        "aria-pressed": String(event.id === this.selectedEventId),
        draggable: String(event.editable),
        type: "button",
        "data-event-id": event.id,
      },
    });
    card.createSpan({ cls: "context-calendar__card-title", text: event.title });
    if (connectionCount > 0) {
      const context = card.createSpan({
        cls: "context-calendar__card-context",
        title: formatMessage(settings.locale, "connectedNotes", { count: String(connectionCount) }),
        attr: { "aria-hidden": "true" },
      });
      setIcon(context.createSpan(), "network");
      context.createSpan({ text: String(connectionCount) });
    }
    if (event.id === this.selectedEventId) card.addClass("is-active");
    card.onclick = (click) => {
      click.stopPropagation();
      this.selectEvent(event, visibleDate);
    };
    card.onkeydown = (keyboardEvent) => {
      if (keyboardEvent.key === "Enter" && (keyboardEvent.metaKey || keyboardEvent.ctrlKey)) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        void this.actions.open(event.filePath);
      }
    };
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

  private renderSurfaceState(
    parent: HTMLElement,
    state: CalendarSurfaceState,
    settings: CalendarSettings,
  ): void {
    if (state === "ready") return;
    const keys = {
      empty: ["calendar-off", "emptyMonth", "emptyMonthDesc"],
      error: ["triangle-alert", "invalidNotes", "invalidNotesDesc"],
      "filtered-empty": ["list-filter", "noFilterResults", "noFilterResultsDesc"],
      loading: ["loader-circle", "loading", "loadingDesc"],
    } as const;
    const [icon, title, description] = keys[state];
    const surface = parent.createDiv({
      cls: `context-calendar__surface-state is-${state}`,
      attr: { "aria-live": "polite", role: state === "error" ? "alert" : "status" },
    });
    setIcon(surface.createDiv({ cls: "context-calendar__surface-icon" }), icon);
    surface.createEl("h2", { text: translate(settings.locale, title) });
    surface.createEl("p", { text: translate(settings.locale, description) });
    if (state === "filtered-empty") {
      surface.createEl("button", {
        text: translate(settings.locale, "clearFilters"),
        attr: { type: "button" },
      }).onclick = () => this.clearFilters();
    } else if (state === "error") {
      surface.createEl("button", {
        text: translate(settings.locale, "reviewDiagnostics"),
        attr: { type: "button" },
      }).onclick = () => {
        this.sideClosed = false;
        this.render();
        this.focusSidePanel();
      };
    }
  }

  private renderDiagnosticNotice(
    parent: HTMLElement,
    settings: CalendarSettings,
    count: number,
  ): void {
    const notice = parent.createEl("button", {
      cls: "context-calendar__diagnostic-notice",
      title: translate(settings.locale, "reviewDiagnostics"),
      attr: { type: "button" },
    });
    setIcon(notice.createSpan(), "triangle-alert");
    notice.createSpan({
      text: formatMessage(settings.locale, "invalidNoteCount", { count: String(count) }),
    });
    notice.onclick = () => {
      this.sideClosed = false;
      this.render();
      this.focusSidePanel();
    };
  }

  private renderSidePanel(parent: HTMLElement, settings: CalendarSettings): void {
    const panel = parent.createEl("aside", {
      cls: "context-calendar__side",
      attr: { "aria-labelledby": PANEL_TITLE_ID, id: PANEL_ID, tabindex: "-1" },
    });
    const dateEvents = this.visibleEvents().filter(
      (event) => event.startDate <= this.selectedDate && event.endDate >= this.selectedDate,
    );
    const topbar = panel.createDiv({ cls: "context-calendar__side-topbar" });
    const date = topbar.createDiv({ cls: "context-calendar__side-date", attr: { id: PANEL_TITLE_ID } });
    setIcon(date.createSpan({ cls: "context-calendar__side-date-icon" }), "calendar-days");
    date.createEl("time", { text: formatEventDate(settings.locale, this.selectedDate) });
    topbar.append(iconButton("x", translate(settings.locale, "closeContext"), () => {
      this.closeSidePanel();
    }));
    if (!dateEvents.length) {
      panel.createDiv({ cls: "context-calendar__empty", text: translate(settings.locale, "empty") });
    }
    if (dateEvents.length > 1) this.renderAgenda(panel, dateEvents, settings);
    const selected = dateEvents.find((event) => event.id === this.selectedEventId) ?? dateEvents[0];
    if (selected) this.renderContext(panel, selected, settings);
    this.renderDiagnostics(panel, settings);
  }

  private renderAgenda(
    parent: HTMLElement,
    events: CalendarEvent[],
    settings: CalendarSettings,
  ): void {
    const agenda = parent.createDiv({ cls: "context-calendar__agenda-switcher" });
    agenda.createDiv({
      cls: "context-calendar__agenda-label",
      text: formatMessage(settings.locale, "eventsOnDate", { count: String(events.length) }),
    });
    for (const event of events) {
      const item = agenda.createEl("button", {
        cls: `context-calendar__agenda-item ${categoryToken(event.category, this.categoryTones)}${event.id === this.selectedEventId ? " is-active" : ""}`,
        title: event.title,
        attr: {
          "aria-label": event.category ? `${event.title}, ${event.category}` : event.title,
          "aria-pressed": String(event.id === this.selectedEventId),
          type: "button",
        },
      });
      item.createSpan({ cls: "context-calendar__agenda-title", text: event.title });
      item.onclick = () => this.selectEvent(event, this.selectedDate);
    }
  }

  private renderContext(parent: HTMLElement, event: CalendarEvent, settings: CalendarSettings): void {
    const section = parent.createEl("article", { cls: "context-calendar__event-detail" });
    const source = section.createDiv({ cls: "context-calendar__event-source" });
    setIcon(source.createSpan(), "file-text");
    source.createSpan({ text: profileName(settings, event.profileId) });
    const heading = section.createDiv({ cls: "context-calendar__event-heading" });
    const identity = heading.createDiv({ cls: "context-calendar__event-identity" });
    identity.createEl("h2", { text: event.title });
    if (!event.editable) {
      const status = identity.createDiv({ cls: "context-calendar__event-status" });
      setIcon(status.createSpan(), "lock-keyhole");
      status.createSpan({ text: translate(settings.locale, "readOnlyShort") });
    }
    const open = iconButton("arrow-up-right", translate(settings.locale, "open"), () => {
      void this.actions.open(event.filePath);
    });
    open.addClass("context-calendar__open");
    heading.append(open);
    this.renderPreview(section, event, settings);

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
    for (const [key, label] of contextGroups) {
      const links = propertyRow(details, propertyIcon(key), label);
      for (const link of event.context[key]) {
        const lens = { kind: key, label: link.label, value: link.path } as const;
        if (contextLinkAction(key) === "filter") this.renderFacet(links, lens, settings);
        else this.renderRelation(links, lens, settings);
      }
    }
  }

  private renderPreview(
    parent: HTMLElement,
    event: CalendarEvent,
    settings: CalendarSettings,
  ): void {
    if (this.preview.eventId !== event.id || this.preview.status === "idle") return;
    const preview = parent.createDiv({
      cls: `context-calendar__preview is-${this.preview.status}`,
      attr: { "aria-live": "polite" },
    });
    if (this.preview.status === "loading") {
      setIcon(preview.createSpan(), "loader-circle");
      preview.createSpan({ text: translate(settings.locale, "previewLoading") });
    } else if (this.preview.status === "ready") {
      preview.createEl("p", { text: this.preview.text });
    } else {
      preview.createSpan({
        text: translate(
          settings.locale,
          this.preview.status === "error" ? "previewUnavailable" : "previewEmpty",
        ),
      });
    }
  }

  private renderRelation(parent: HTMLElement, lens: EventLens, settings: CalendarSettings): void {
    const relation = parent.createDiv({ cls: "context-calendar__property-value context-calendar__relation" });
    const value = relation.createEl("button", {
      cls: "context-calendar__relation-link",
      title: `${translate(settings.locale, "open")}: ${lens.label}`,
      attr: { type: "button" },
    });
    setIcon(value.createSpan({ cls: "context-calendar__relation-icon" }), "file-text");
    value.createSpan({ cls: "context-calendar__relation-label", text: lens.label });
    value.onclick = () => void this.actions.open(lens.value);
    value.oncontextmenu = (mouseEvent) => {
      const menu = new Menu();
      menu.addItem((item) => item
        .setTitle(translate(settings.locale, "open"))
        .setIcon("file-text")
        .onClick(() => void this.actions.open(lens.value)));
      menu.addItem((item) => item
        .setTitle(translate(settings.locale, "filterMonth"))
        .setIcon("list-filter")
        .onClick(() => this.setLens(lens)));
      menu.showAtMouseEvent(mouseEvent);
    };
  }

  private renderFacet(parent: HTMLElement, lens: EventLens, settings: CalendarSettings): void {
    const row = parent.createDiv({ cls: "context-calendar__property-value" });
    if (lens.kind === "category") row.addClass(categoryToken(lens.value, this.categoryTones));
    const value = row.createEl("button", {
      cls: "context-calendar__property-link",
      text: lens.label,
      title: translate(settings.locale, "filterMonth"),
      attr: {
        "aria-pressed": String(this.lens?.kind === lens.kind && this.lens.value === lens.value),
        type: "button",
      },
    });
    value.onclick = () => this.setLens(lens);
  }

  private renderDiagnostics(parent: HTMLElement, settings: CalendarSettings): void {
    const diagnostics = this.visibleDiagnostics();
    if (!diagnostics.length) return;
    const details = parent.createEl("details", { cls: "context-calendar__diagnostics" });
    details.createEl("summary", {
      text: `${translate(settings.locale, "diagnostics")} · ${String(diagnostics.length)}`,
    });
    for (const item of diagnostics.slice(0, 20)) {
      details.createEl("button", {
        text: `${fileTitle(item.filePath)} — ${translate(settings.locale, diagnosticMessage(item.code))}`,
        title: item.filePath,
        attr: { type: "button" },
      }).onclick = () => void this.actions.open(item.filePath);
    }
  }

  private setLens(lens: EventLens): void {
    this.lens = lens;
    this.normalizeSelection();
    if (!this.selectedEventId) this.sideClosed = true;
    this.render();
  }

  private clearFilters(): void {
    this.lens = null;
    this.profileId = "";
    this.query = "";
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
    this.clearSelection();
  }

  private clearSelection(): void {
    this.previewRequest += 1;
    this.selectedEventId = "";
    this.preview = { eventId: "", status: "idle", text: "" };
  }

  private overlapsCurrentMonth(event: CalendarEvent): boolean {
    const start = localDateKey(new Date(this.month.getFullYear(), this.month.getMonth(), 1));
    const end = localDateKey(new Date(this.month.getFullYear(), this.month.getMonth() + 1, 0));
    return event.startDate <= end && event.endDate >= start;
  }

  private selectDate(date: string): void {
    this.selectedDate = date;
    const selected = this.visibleEvents().find(
      (event) => event.startDate <= date && event.endDate >= date,
    );
    if (selected) {
      this.selectEvent(selected, date);
      return;
    }
    this.clearSelection();
    this.sideClosed = false;
    this.render();
    this.focusSidePanel();
  }

  private selectEvent(event: CalendarEvent, date: string): void {
    this.selectedDate = date;
    this.selectedEventId = event.id;
    this.sideClosed = false;
    this.previewRequest += 1;
    const request = this.previewRequest;
    this.preview = { eventId: event.id, status: "loading", text: "" };
    this.render();
    this.focusSidePanel();
    void this.loadPreview(event, request);
  }

  private async loadPreview(event: CalendarEvent, request: number): Promise<void> {
    try {
      const text = await this.actions.preview(event.filePath);
      if (request !== this.previewRequest || event.id !== this.selectedEventId) return;
      this.preview = { eventId: event.id, status: text ? "ready" : "empty", text };
    } catch {
      if (request !== this.previewRequest || event.id !== this.selectedEventId) return;
      this.preview = { eventId: event.id, status: "error", text: "" };
    }
    this.render();
    this.focusSidePanel();
  }

  private closeSidePanel(): void {
    const selectedEventId = this.selectedEventId;
    this.sideClosed = true;
    this.render();
    if (selectedEventId) {
      window.requestAnimationFrame(() => {
        this.contentEl.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(selectedEventId)}"]`)?.focus();
      });
    } else {
      window.requestAnimationFrame(() => this.focusSelectedDay());
    }
  }

  private focusSidePanel(): void {
    window.requestAnimationFrame(() => {
      this.contentEl.querySelector<HTMLElement>(`#${PANEL_ID}`)?.focus({ preventScroll: true });
    });
  }

  private focusSelectedDay(): void {
    this.contentEl.querySelector<HTMLElement>(
      `[role="gridcell"][aria-label^="${this.selectedDate}"]`,
    )?.focus();
  }

  private installDensityObserver(grid: HTMLElement, settings: CalendarSettings): void {
    const apply = (): void => this.applyResponsiveDensity(grid, settings);
    if (typeof ResizeObserver !== "undefined") {
      this.densityObserver = new ResizeObserver(() => this.scheduleDensity(apply));
      this.densityObserver.observe(grid);
    }
    this.scheduleDensity(apply);
  }

  private scheduleDensity(apply: () => void): void {
    if (this.densityFrame !== null) window.cancelAnimationFrame(this.densityFrame);
    this.densityFrame = window.requestAnimationFrame(() => {
      this.densityFrame = null;
      apply();
    });
  }

  private applyResponsiveDensity(grid: HTMLElement, settings: CalendarSettings): void {
    for (const container of grid.findAll(".context-calendar__cards")) {
      const cards = container.findAll(":scope > .context-calendar__card");
      const more = container.querySelector<HTMLButtonElement>(":scope > .context-calendar__more");
      if (!cards.length || !more) continue;
      for (const card of cards) card.hidden = false;
      more.hidden = false;
      const style = window.getComputedStyle(container);
      const gap = numericStyle(style.rowGap || style.gap);
      const cardHeight = cards[0]?.getBoundingClientRect().height ?? 0;
      const overflowHeight = more.getBoundingClientRect().height;
      const limit = responsiveEventLimit({
        availableHeight: container.clientHeight,
        cardHeight,
        eventCount: cards.length,
        gap,
        overflowHeight,
      });
      cards.forEach((card, index) => { card.hidden = index >= limit; });
      const hiddenCount = Math.max(0, cards.length - limit);
      more.hidden = hiddenCount === 0;
      if (hiddenCount > 0) {
        more.setText(`+${String(hiddenCount)}`);
        more.ariaLabel = formatMessage(settings.locale, "moreEvents", { count: String(hiddenCount) });
      }
    }
  }

  private disconnectDensityObserver(): void {
    this.densityObserver?.disconnect();
    this.densityObserver = null;
    if (this.densityFrame !== null) {
      window.cancelAnimationFrame(this.densityFrame);
      this.densityFrame = null;
    }
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
  const button = createEl("button", { cls: "clickable-icon context-calendar__icon-button" });
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

function propertyIcon(key: "backlinks" | "links" | "people" | "project" | "related"): string {
  if (key === "people") return "users";
  if (key === "project") return "folder-kanban";
  if (key === "backlinks") return "corner-up-left";
  if (key === "related") return "network";
  return "link-2";
}

function profileName(settings: CalendarSettings, profileId: string): string {
  return settings.profiles.find((profile) => profile.id === profileId)?.name ?? fileTitle(profileId);
}

function formatEventDate(locale: CalendarSettings["locale"], date: string): string {
  return new Intl.DateTimeFormat(resolvedLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(date));
}

function formatEventRange(locale: CalendarSettings["locale"], start: string, end: string): string {
  const startLabel = formatEventDate(locale, start);
  return start === end ? startLabel : `${startLabel} → ${formatEventDate(locale, end)}`;
}

function connectedNoteCount(event: CalendarEvent): number {
  return new Set(Object.values(event.context).flat().map((link) => link.path)).size;
}

function numericStyle(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
