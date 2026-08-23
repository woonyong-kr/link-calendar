import {
  MarkdownRenderChild,
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
  TFolder,
  normalizePath,
  parseYaml,
  stringifyYaml,
} from "obsidian";

import {
  CalendarIndex,
  selectProfileFromFrontmatter,
  suggestedProfiles,
} from "./index";
import { translate } from "./i18n";
import {
  type CalendarEvent,
  type CalendarSettings,
  type SourceProfile,
  DEFAULT_SETTINGS,
  createProfile,
  dateKey,
  isRecord,
  normalizeSettings,
  serializeSettings,
} from "./model";
import {
  type EventDraft,
  canCreateWithProfile,
  embedSource,
  eventFrontmatter,
  planMoveFrontmatter,
  writableProfiles,
} from "./policy";
import { ContextCalendarSettingTab, OnboardingModal, type SettingsHost } from "./settings";
import { ContextCalendarView, VIEW_TYPE, type CalendarActions } from "./view";

const CODE_BLOCK = "context-calendar";

export default class ContextCalendarPlugin extends Plugin implements SettingsHost {
  settings: CalendarSettings = structuredClone(DEFAULT_SETTINGS);
  private index!: CalendarIndex;
  private readonly listeners = new Set<() => void>();
  private refreshQueued = false;
  private refreshTimer: number | null = null;

  override async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.index = new CalendarIndex(this.app.vault, this.app.metadataCache, this.settings.profiles);
    this.registerView(VIEW_TYPE, (leaf) =>
      new ContextCalendarView(leaf, () => this.settings, this.actions()));
    this.addRibbonIcon(
      "calendar-days",
      translate(this.settings.locale, "openCalendar"),
      () => void this.openCalendar(),
    );
    this.addCommand({
      id: "open-month",
      name: translate(this.settings.locale, "openCalendar"),
      callback: () => void this.openCalendar(),
    });
    this.addCommand({
      id: "create-event-note",
      name: translate(this.settings.locale, "createEvent"),
      callback: () => void this.createEvent(dateKey(new Date()) ?? ""),
    });
    this.addSettingTab(new ContextCalendarSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor(CODE_BLOCK, (source, element, context) => {
      context.addChild(new CalendarEmbedChild(element, this, source));
    });

    this.app.workspace.onLayoutReady(() => {
      this.index.rebuild();
      this.publishSnapshot();
      this.registerIndexEvents();
    });
  }

  override onunload(): void {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
  }

  async saveSettings(rebuildIndex = false): Promise<void> {
    await this.saveData(serializeSettings(this.settings));
    if (rebuildIndex) this.index.setProfiles(this.settings.profiles);
    this.publishSnapshot();
  }

  suggestedFolders(): string[] {
    return suggestedProfiles(this.app.vault.getMarkdownFiles(), this.app.metadataCache)
      .map((profile) => profile.folder);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private registerIndexEvents(): void {
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.index.update(file);
        this.queuePublish();
      }),
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.index.update(file);
          this.queuePublish();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile) {
          this.index.remove(file.path);
          this.queuePublish();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile && file.extension === "md") {
          this.index.remove(oldPath);
          this.index.update(file);
          this.queuePublish();
        }
      }),
    );
  }

  private queuePublish(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    this.refreshTimer = window.setTimeout(() => {
      this.refreshQueued = false;
      this.refreshTimer = null;
      this.publishSnapshot();
    }, 80);
  }

  private publishSnapshot(): void {
    const snapshot = this.index.snapshot();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      const view = leaf.view;
      if (view instanceof ContextCalendarView) view.setSnapshot(snapshot);
    }
    for (const listener of this.listeners) listener();
  }

  private actions(): CalendarActions {
    return {
      create: (date) => this.createEvent(date),
      move: (event, date) => this.moveEvent(event, date),
      open: (path) => this.openPath(path),
      openSettings: () => new Notice(translate(this.settings.locale, "openSettingsHelp")),
    };
  }

  private async openCalendar(): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ active: true, type: VIEW_TYPE });
    }
    await this.app.workspace.revealLeaf(leaf);
    const view = leaf.view;
    if (view instanceof ContextCalendarView) view.setSnapshot(this.index.snapshot());
    if (!this.settings.profiles.length) {
      new OnboardingModal(
        this.app,
        this.suggestedFolders(),
        this.settings.locale,
        async (folder) => {
          this.settings.profiles = [createProfile(folder)];
          await this.saveSettings(true);
        },
      ).open();
    }
  }

  private async openPath(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`${translate(this.settings.locale, "noteNotFound")}: ${path}`);
      return;
    }
    await this.app.workspace.getLeaf("tab").openFile(file);
  }

  private async createEvent(initialDate: string): Promise<void> {
    const writable = writableProfiles(this.settings.profiles);
    if (!writable.length) {
      new Notice(translate(this.settings.locale, "writableSourceRequired"));
      return;
    }
    new EventModal(
      this.app,
      writable,
      initialDate,
      this.settings.locale,
      async (input) => {
        const profile = writableProfiles(this.settings.profiles)
          .find((candidate) => candidate.id === input.profileId);
        if (!profile) {
          new Notice(translate(this.settings.locale, "writableSourceRequired"));
          return;
        }
        try {
          const basename = safeBasename(input.title);
          let path = normalizePath(`${profile.folder}/${input.date} ${basename}.md`);
          for (let suffix = 2; this.app.vault.getAbstractFileByPath(path); suffix += 1) {
            path = normalizePath(`${profile.folder}/${input.date} ${basename} ${String(suffix)}.md`);
          }
          const frontmatter = eventFrontmatter(profile, input);
          const selected = selectProfileFromFrontmatter(
            { path },
            frontmatter,
            this.settings.profiles,
          );
          if (!canCreateWithProfile(profile, selected)) {
            new Notice(translate(this.settings.locale, "writableSourceRequired"));
            return;
          }
          await this.ensureFolder(profile.folder);
          const yaml = stringifyYaml(frontmatter).trimEnd();
          const file = await this.app.vault.create(path, `---\n${yaml}\n---\n\n# ${input.title}\n`);
          this.index.update(file, frontmatter);
          this.publishSnapshot();
          await this.app.workspace.getLeaf("tab").openFile(file);
        } catch {
          new Notice(translate(this.settings.locale, "createFailed"));
        }
      },
    ).open();
  }

  private async moveEvent(event: CalendarEvent, targetDate: string): Promise<void> {
    const profile = this.settings.profiles.find((candidate) => candidate.id === event.profileId);
    const file = this.app.vault.getAbstractFileByPath(event.filePath);
    if (!profile || !(file instanceof TFile)) return;
    let updated: Record<string, unknown> | undefined;
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        const target = frontmatter as Record<string, unknown>;
        const current = structuredClone(target);
        const selected = selectProfileFromFrontmatter(
          file,
          current,
          this.settings.profiles,
        );
        const changes = planMoveFrontmatter(event, profile, selected, current, targetDate);
        if (!changes) {
          throw new EventMutationRejected();
        }
        Object.assign(target, changes);
        updated = structuredClone(target);
      });
      this.index.update(file, updated);
      this.publishSnapshot();
    } catch (error) {
      new Notice(translate(
        this.settings.locale,
        error instanceof EventMutationRejected ? "readOnly" : "moveFailed",
      ));
    }
  }

  private async ensureFolder(folder: string): Promise<void> {
    const segments = normalizePath(folder).split("/");
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (!existing) await this.app.vault.createFolder(current);
      else if (!(existing instanceof TFolder)) throw new Error(`Expected folder: ${current}`);
    }
  }

  renderEmbed(source: string, element: HTMLElement): void {
    const config = parseBlock(source);
    element.empty();
    const root = element.createDiv({ cls: "context-calendar-embed" });
    root.createEl("strong", { text: config.title || "Context Calendar" });
    if (config.invalid) {
      root.createDiv({
        cls: "context-calendar-embed__error",
        text: translate(this.settings.locale, "invalidEmbedSource"),
      });
      return;
    }
    const events = this.index.snapshot().events.filter((event) =>
      !config.source || event.filePath.startsWith(`${config.source}/`));
    const upcoming = events
      .filter((event) => event.endDate >= (dateKey(new Date()) ?? ""))
      .slice(0, 5);
    const list = root.createDiv({ cls: "context-calendar-embed__events" });
    for (const event of upcoming) {
      const button = list.createEl("button", { attr: { type: "button" } });
      button.createEl("time", { text: event.startDate });
      button.createSpan({ text: event.title });
      button.onclick = () => void this.openPath(event.filePath);
    }
    root.createEl("button", {
      text: translate(this.settings.locale, "openCalendar"),
      attr: { type: "button" },
    }).onclick = () => void this.openCalendar();
  }
}

class EventMutationRejected extends Error {}

class CalendarEmbedChild extends MarkdownRenderChild {
  constructor(
    container: HTMLElement,
    private readonly plugin: ContextCalendarPlugin,
    private readonly source: string,
  ) {
    super(container);
  }

  override onload(): void {
    const render = () => this.plugin.renderEmbed(this.source, this.containerEl);
    render();
    this.register(this.plugin.subscribe(render));
  }
}

interface EventInput extends EventDraft {
  profileId: string;
}

class EventModal extends Modal {
  private input: EventInput;

  constructor(
    app: ContextCalendarPlugin["app"],
    private readonly profiles: SourceProfile[],
    initialDate: string,
    private readonly locale: CalendarSettings["locale"],
    private readonly submit: (input: EventInput) => Promise<void>,
  ) {
    super(app);
    this.input = {
      category: "",
      date: dateKey(initialDate) ?? dateKey(new Date()) ?? "",
      profileId: profiles[0]?.id ?? "",
      title: "",
    };
  }

  override onOpen(): void {
    this.titleEl.setText(translate(this.locale, "newEventNote"));
    new Setting(this.contentEl).setName(translate(this.locale, "titleField")).addText((control) => {
      control.setValue(this.input.title).onChange((value) => { this.input.title = value.trim(); });
      window.setTimeout(() => control.inputEl.focus(), 0);
    });
    new Setting(this.contentEl).setName(translate(this.locale, "dateField")).addText((control) => {
      control.inputEl.type = "date";
      control.setValue(this.input.date).onChange((value) => { this.input.date = value; });
    });
    new Setting(this.contentEl).setName(translate(this.locale, "category")).addText((control) => {
      control.setValue(this.input.category).onChange((value) => { this.input.category = value.trim(); });
    });
    if (this.profiles.length > 1) {
      new Setting(this.contentEl).setName(translate(this.locale, "sourceField")).addDropdown((control) => {
        control.addOptions(Object.fromEntries(this.profiles.map((profile) => [profile.id, profile.name])));
        control.setValue(this.input.profileId).onChange((value) => { this.input.profileId = value; });
      });
    }
    new Setting(this.contentEl).addButton((button) => {
      button.setButtonText(translate(this.locale, "create")).setCta().onClick(async () => {
        if (!this.input.title || !dateKey(this.input.date)) {
          new Notice(translate(this.locale, "titleDateRequired"));
          return;
        }
        await this.submit(this.input);
        this.close();
      });
    });
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

export function parseBlock(source: string): { invalid: boolean; source: string; title: string } {
  if (!source.trim()) return { invalid: false, source: "", title: "" };
  try {
    const value: unknown = parseYaml(source);
    if (!isRecord(value)) return { invalid: true, source: "", title: "" };
    const parsedSource = embedSource(value.source);
    return {
      invalid: parsedSource.invalid,
      source: parsedSource.source,
      title: typeof value.title === "string" ? value.title.trim() : "",
    };
  } catch {
    return { invalid: true, source: "", title: "" };
  }
}

function safeBasename(value: string): string {
  return value.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 96) || "Event";
}
