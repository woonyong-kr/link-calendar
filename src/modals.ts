import { FuzzySuggestModal, Modal, Notice, Setting, TFolder, type App } from "obsidian";

import type { SourceDetection } from "./index";
import { formatMessage, translate } from "./i18n";
import { type CalendarSettings, type SourceProfile, dateKey } from "./model";
import {
  type SourcePresetId,
  SOURCE_PRESETS,
  detectedStartProperty,
} from "./onboarding";
import type { EventDraft } from "./policy";

type Locale = CalendarSettings["locale"];

export interface EventInput extends EventDraft {
  profileId: string;
}

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  constructor(
    app: App,
    private readonly locale: Locale,
    private readonly choose: (folder: TFolder) => void,
  ) {
    super(app);
    this.setPlaceholder(translate(locale, "chooseFolder"));
    this.emptyStateText = translate(locale, "noFolders");
  }

  override getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const visit = (folder: TFolder): void => {
      if (folder.path) folders.push(folder);
      for (const child of folder.children) if (child instanceof TFolder) visit(child);
    };
    visit(this.app.vault.getRoot());
    return folders.sort((left, right) => left.path.localeCompare(right.path));
  }

  override getItemText(folder: TFolder): string {
    return folder.path;
  }

  override onChooseItem(folder: TFolder): void {
    this.choose(folder);
  }
}

export class SourcePreviewModal extends Modal {
  private presetId: SourcePresetId = "learning-log";
  private startProperty: string;

  constructor(
    app: App,
    private readonly locale: Locale,
    private readonly folder: TFolder,
    private readonly detection: SourceDetection,
    private readonly submit: (presetId: SourcePresetId, startProperty: string) => Promise<void>,
  ) {
    super(app);
    this.startProperty = detection.suggestedStart || "date";
  }

  override onOpen(): void {
    this.titleEl.setText(translate(this.locale, "sourcePreview"));
    this.renderContent();
  }

  private renderContent(): void {
    this.contentEl.empty();
    this.contentEl.createEl("p", {
      cls: "link-calendar-source-preview__folder",
      text: this.folder.path,
    });
    const summary = this.contentEl.createEl("p", {
      text: formatMessage(this.locale, "sourcePreviewSummary", {
        dated: String(this.detectedCount()),
        property: this.startProperty,
        total: String(this.detection.noteCount),
      }),
    });
    new Setting(this.contentEl)
      .setName(translate(this.locale, "sourcePreset"))
      .setDesc(translate(this.locale, "sourcePresetDesc"))
      .addDropdown((control) => {
        control.addOptions(Object.fromEntries(SOURCE_PRESETS.map((preset) => [
          preset.id,
          translate(this.locale, presetMessage(preset.id)),
        ]))).setValue(this.presetId).onChange((value) => {
          this.presetId = value as SourcePresetId;
          this.startProperty = detectedStartProperty(
            this.presetId,
            this.detection.dateProperties.map((item) => item.name),
          );
          this.renderContent();
        });
      });
    new Setting(this.contentEl)
      .setName(translate(this.locale, "startDate"))
      .setDesc(translate(this.locale, "detectedDateProperty"))
      .addDropdown((control) => {
        const options = this.detection.dateProperties.length
          ? Object.fromEntries(this.detection.dateProperties.map((item) => [
              item.name,
              `${item.name} (${String(item.count)})`,
            ]))
          : { date: "date (0)" };
        control.addOptions(options).setValue(this.startProperty).onChange((value) => {
          this.startProperty = value;
          summary.setText(formatMessage(this.locale, "sourcePreviewSummary", {
            dated: String(this.detectedCount()),
            property: this.startProperty,
            total: String(this.detection.noteCount),
          }));
        });
      });
    if (!this.detectedCount()) {
      this.contentEl.createEl("p", {
        cls: "link-calendar-source-preview__warning",
        text: translate(this.locale, "noDatedNotes"),
      });
    }
    new Setting(this.contentEl).addButton((button) => {
      button.setButtonText(translate(this.locale, "addSource")).setCta().onClick(async () => {
        await this.submit(this.presetId, this.startProperty);
        this.close();
      });
    });
  }

  private detectedCount(): number {
    return this.detection.dateProperties.find((item) => item.name === this.startProperty)?.count ?? 0;
  }
}

export class EventModal extends Modal {
  private input: EventInput;

  constructor(
    app: App,
    private readonly profiles: SourceProfile[],
    initialDate: string,
    private readonly locale: Locale,
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

function presetMessage(presetId: SourcePresetId):
  | "presetDailyNote"
  | "presetLearningLog"
  | "presetMeeting"
  | "presetProjectDeadline" {
  if (presetId === "daily-note") return "presetDailyNote";
  if (presetId === "meeting") return "presetMeeting";
  if (presetId === "project-deadline") return "presetProjectDeadline";
  return "presetLearningLog";
}
