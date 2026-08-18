const { Notice, Plugin } = require("obsidian");

const DEFAULT_DASHBOARD_PATH = "inbox/calendar/apple-calendar.md";
const DEFAULT_SOURCE = "inbox/calendar/events";
const CATEGORY_CLASSES = {
  "커리어": "career",
  "학습": "learning",
  "창작": "creative",
  "생활": "life",
  "관계": "relationship",
  "건강": "health",
  "행정": "admin",
};
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

class SimpleCalendarPlugin extends Plugin {
  onload() {
    this.renderers = new Set();
    this.tooltip = null;
    this.addRibbonIcon("calendar-days", "Apple Calendar 열기", () => void this.openDashboard());
    this.addCommand({
      id: "open-simple-calendar",
      name: "Apple Calendar 열기",
      callback: () => void this.openDashboard(),
    });
    this.registerMarkdownCodeBlockProcessor("woon-simple-calendar", (source, element) => {
      const config = parseConfig(source);
      const state = {
        categoryField: config.category_field || "Category",
        dateField: config.date_field || "Date",
        month: startOfMonth(new Date()),
        root: element.createDiv({ cls: "simple-calendar" }),
        source: config.source || DEFAULT_SOURCE,
      };
      this.renderers.add(state);
      this.render(state);
    });

    const refresh = () => this.refresh();
    this.registerEvent(this.app.metadataCache.on("changed", refresh));
    this.registerEvent(this.app.vault.on("create", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
    this.registerEvent(this.app.workspace.on("layout-change", refresh));
  }

  onunload() {
    this.hideTooltip();
    this.renderers.clear();
  }

  refresh() {
    for (const state of [...this.renderers]) {
      if (!state.root.isConnected) {
        this.renderers.delete(state);
        continue;
      }
      this.render(state);
    }
  }

  async openDashboard() {
    const dashboard = this.app.vault
      .getMarkdownFiles()
      .find((file) => file.path === DEFAULT_DASHBOARD_PATH);
    if (!dashboard) {
      new Notice("Apple Calendar 화면을 찾을 수 없습니다. 먼저 일정 새로 고침을 실행하세요.");
      return;
    }
    await this.app.workspace.getLeaf("tab").openFile(dashboard);
  }

  render(state) {
    this.hideTooltip();
    state.root.empty();
    if (state.source !== DEFAULT_SOURCE) {
      state.root.createDiv({
        cls: "simple-calendar-error",
        text: "Simple Calendar는 설정된 Markdown 일정 경로만 표시합니다.",
      });
      return;
    }

    const month = state.month;
    const eventsByDate = groupEventsByDate(this.events(state));
    this.renderHeader(state, month);
    const grid = state.root.createDiv({ cls: "simple-calendar-grid" });
    grid.style.setProperty("--simple-calendar-week-count", String(weekCount(month)));
    for (const weekday of WEEKDAYS) {
      grid.createDiv({ cls: "simple-calendar-weekday", text: weekday });
    }

    const firstWeekday = month.getDay();
    const lastDay = daysInMonth(month);
    const todayKey = toDateKey(new Date());
    for (let index = 0; index < firstWeekday + lastDay; index += 1) {
      const day = index - firstWeekday + 1;
      const cell = grid.createDiv({
        cls: day < 1 ? "simple-calendar-day is-empty" : "simple-calendar-day",
      });
      if (day < 1) {
        continue;
      }
      const dateKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayNumber = cell.createDiv({ cls: "simple-calendar-day-number", text: String(day) });
      if (dateKey === todayKey) {
        dayNumber.addClass("is-today");
      }
      const cards = cell.createDiv({ cls: "simple-calendar-cards" });
      for (const event of eventsByDate.get(dateKey) || []) {
        this.renderEventCard(cards, event);
      }
    }
  }

  renderHeader(state, month) {
    const header = state.root.createDiv({ cls: "simple-calendar-header" });
    const controls = header.createDiv({ cls: "simple-calendar-controls" });
    const previous = controls.createEl("button", {
      cls: "simple-calendar-nav simple-calendar-nav--previous",
      text: "‹",
      attr: { "aria-label": "이전 달", type: "button" },
    });
    previous.onclick = () => {
      state.month = addMonths(month, -1);
      this.render(state);
    };
    const next = controls.createEl("button", {
      cls: "simple-calendar-nav simple-calendar-nav--next",
      text: "›",
      attr: { "aria-label": "다음 달", type: "button" },
    });
    next.onclick = () => {
      state.month = addMonths(month, 1);
      this.render(state);
    };
    header.createDiv({
      cls: "simple-calendar-title",
      text: `${month.getFullYear()}년 ${month.getMonth() + 1}월`,
    });
    const today = header.createEl("button", {
      cls: "simple-calendar-today",
      text: "오늘",
      attr: { type: "button" },
    });
    today.onclick = () => {
      state.month = startOfMonth(new Date());
      this.render(state);
    };
  }

  renderEventCard(cards, event) {
    const categoryClass = CATEGORY_CLASSES[event.category] || "other";
    const card = cards.createDiv({
      cls: `simple-calendar-card simple-calendar-card--${categoryClass}`,
      attr: {
        "aria-label": `${event.title} 일정 열기`,
        role: "button",
        tabindex: "0",
      },
    });
    card.createSpan({ cls: "simple-calendar-card-dot", attr: { "aria-hidden": "true" } });
    card.createSpan({ cls: "simple-calendar-card-title", text: event.displayTitle });
    const open = () => void this.app.workspace.getLeaf("tab").openFile(event.file);
    card.onclick = open;
    card.onkeydown = (keyboardEvent) => {
      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
        keyboardEvent.preventDefault();
        open();
      }
    };
    card.onmouseenter = () => this.showTooltip(card, event.title);
    card.onmouseleave = () => this.hideTooltip();
    card.onfocus = () => this.showTooltip(card, event.title);
    card.onblur = () => this.hideTooltip();
  }

  showTooltip(anchor, title) {
    this.hideTooltip();
    const tooltip = document.createElement("div");
    tooltip.className = "simple-calendar-tooltip";
    tooltip.textContent = title;
    tooltip.setAttribute("role", "tooltip");
    document.body.append(tooltip);
    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchorRect.left, window.innerWidth - tooltipRect.width - 12));
    const below = anchorRect.bottom + 8;
    const top = below + tooltipRect.height <= window.innerHeight
      ? below
      : Math.max(12, anchorRect.top - tooltipRect.height - 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    this.tooltip = tooltip;
  }

  hideTooltip() {
    this.tooltip?.remove();
    this.tooltip = null;
  }

  events(state) {
    return this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith(`${state.source}/`) && file.name !== "_database.md")
      .flatMap((file) => {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        const date = frontmatter[state.dateField];
        if (!isDate(date)) {
          return [];
        }
        return [{
          category: typeof frontmatter[state.categoryField] === "string" ? frontmatter[state.categoryField] : "기타",
          date,
          displayTitle: calendarCardTitle(file.basename, frontmatter[state.categoryField]),
          file,
          start: typeof frontmatter["Start Date"] === "string" ? frontmatter["Start Date"] : "",
          title: file.basename,
        }];
      })
      .sort((left, right) => left.date.localeCompare(right.date) || left.start.localeCompare(right.start) || left.title.localeCompare(right.title));
  }
}

function parseConfig(source) {
  return Object.fromEntries(
    source
      .split("\n")
      .map((line) => line.match(/^([^:#]+):\s*(.+)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()]),
  );
}

function groupEventsByDate(events) {
  return events.reduce((groups, event) => {
    const items = groups.get(event.date) || [];
    items.push(event);
    groups.set(event.date, items);
    return groups;
  }, new Map());
}

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value, amount) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function daysInMonth(value) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
}

function weekCount(value) {
  return Math.ceil((value.getDay() + daysInMonth(value)) / 7);
}

function toDateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function calendarCardTitle(title, category) {
  if (typeof category !== "string" || !category) {
    return title;
  }
  const suffix = ` · ${category}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

module.exports = SimpleCalendarPlugin;
module.exports._internals = {
  addMonths,
  calendarCardTitle,
  groupEventsByDate,
  parseConfig,
  toDateKey,
  weekCount,
};
