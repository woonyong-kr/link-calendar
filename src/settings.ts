import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";

import { type MessageKey, translate } from "./i18n";
import {
  type CalendarSettings,
  type SourceProfile,
  createProfile,
} from "./model";
import { type ProfileValidation, validateProfile } from "./policy";

export interface SettingsHost {
  app: App;
  settings: CalendarSettings;
  saveSettings(rebuildIndex?: boolean): Promise<void>;
  suggestedFolders(): string[];
}

export class ContextCalendarSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly host: SettingsHost) {
    super(app, host as never);
  }

  override display(): void {
    const { containerEl } = this;
    const locale = this.host.settings.locale;
    containerEl.empty();
    new Setting(containerEl).setName(translate(locale, "settings")).setHeading();

    new Setting(containerEl)
      .setName(translate(locale, "language"))
      .setDesc(translate(locale, "languageDesc"))
      .addDropdown((control) => {
        control
          .addOptions({
            auto: translate(locale, "automatic"),
            en: translate(locale, "english"),
            ko: translate(locale, "korean"),
          })
          .setValue(locale)
          .onChange(async (value) => {
            this.host.settings.locale = value as CalendarSettings["locale"];
            await this.host.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(translate(locale, "weekStartsOn"))
      .addDropdown((control) => {
        control
          .addOptions({
            auto: translate(locale, "automatic"),
            sunday: translate(locale, "sunday"),
            monday: translate(locale, "monday"),
          })
          .setValue(this.host.settings.weekStart)
          .onChange(async (value) => {
            this.host.settings.weekStart = value as CalendarSettings["weekStart"];
            await this.host.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(translate(locale, "contextPanel"))
      .setDesc(translate(locale, "contextPanelDesc"))
      .addToggle((control) => {
        control.setValue(this.host.settings.showContext).onChange(async (value) => {
          this.host.settings.showContext = value;
          await this.host.saveSettings();
        });
      });

    new Setting(containerEl).setName(translate(locale, "sources")).setHeading();
    for (const profile of this.host.settings.profiles) this.renderProfile(containerEl, profile);
    new Setting(containerEl)
      .setName(translate(locale, "addSource"))
      .setDesc(translate(locale, "sourceDesc"))
      .addButton((button) => {
        button.setButtonText(translate(locale, "add")).setCta().onClick(() => {
          const profile = createProfile();
          profile.name = translate(locale, "calendarNotes");
          this.host.settings.profiles.push(profile);
          this.display();
        });
      });
  }

  private renderProfile(container: HTMLElement, profile: SourceProfile): void {
    const locale = this.host.settings.locale;
    const draft = structuredClone(profile);
    const section = container.createDiv({ cls: "context-calendar-setting-source" });
    new Setting(section)
      .setName(profile.name || translate(locale, "calendarSource"))
      .setDesc(translate(locale, profile.enabled ? "included" : "disabled"))
      .addExtraButton((button) => {
        button.setIcon("trash-2").setTooltip(translate(locale, "removeSource")).onClick(async () => {
          this.host.settings.profiles = this.host.settings.profiles.filter((item) => item.id !== profile.id);
          await this.host.saveSettings(true);
          this.display();
        });
      });
    new Setting(section).setName(translate(locale, "enableSource")).addToggle((control) => {
      control.setValue(draft.enabled).onChange((value) => { draft.enabled = value; });
    });
    new Setting(section).setName(translate(locale, "name")).addText((control) => {
      control.setValue(draft.name).onChange((value) => { draft.name = value.trim(); });
    });
    new Setting(section)
      .setName(translate(locale, "folder"))
      .setDesc(translate(locale, "folderDesc"))
      .addText((control) => {
        control
          .setPlaceholder(this.host.suggestedFolders()[0] ?? "Calendar")
          .setValue(draft.folder)
          .onChange((value) => { draft.folder = value.trim().replace(/^\/+|\/+$/g, ""); });
      });
    new Setting(section)
      .setName(translate(locale, "tag"))
      .setDesc(translate(locale, "tagDesc"))
      .addText((control) => {
        control.setPlaceholder("Calendar").setValue(draft.tag).onChange((value) => {
          draft.tag = value.replace(/^#/, "").trim();
        });
      });
    new Setting(section)
      .setName(translate(locale, "writable"))
      .setDesc(translate(locale, "writableDesc"))
      .addToggle((control) => {
        control.setValue(draft.editable).onChange((value) => { draft.editable = value; });
      });
    new Setting(section)
      .setName(translate(locale, "includeSubfolders"))
      .addToggle((control) => {
        control.setValue(draft.recursive).onChange((value) => { draft.recursive = value; });
      });
    const details = section.createEl("details");
    details.createEl("summary", { text: translate(locale, "propertyMapping") });
    for (const [key, label] of [
      ["start", translate(locale, "startDate")],
      ["end", translate(locale, "endDate")],
      ["title", translate(locale, "titleField")],
      ["category", translate(locale, "category")],
      ["people", translate(locale, "people")],
      ["project", translate(locale, "project")],
      ["related", translate(locale, "related")],
    ] as const) {
      new Setting(details).setName(label).addText((control) => {
        control.setValue(draft.properties[key]).onChange((value) => {
          draft.properties[key] = value.trim();
        });
      });
    }
    new Setting(section).addButton((button) => {
      button.setButtonText(translate(locale, "apply")).setCta().onClick(async () => {
        const invalid = validateProfile(draft);
        if (invalid) {
          new Notice(translate(locale, validationMessage(invalid)));
          return;
        }
        Object.assign(profile, structuredClone(draft));
        await this.host.saveSettings(true);
        this.display();
      });
    });
  }
}

export class OnboardingModal extends Modal {
  constructor(
    app: App,
    private readonly folders: string[],
    private readonly locale: CalendarSettings["locale"],
    private readonly choose: (folder: string) => Promise<void>,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText("Context Calendar");
    this.contentEl.createEl("p", { text: translate(this.locale, "onboarding") });
    if (!this.folders.length) {
      this.contentEl.createEl("p", {
        cls: "mod-warning",
        text: translate(this.locale, "noDetectedFolder"),
      });
    }
    for (const folder of this.folders) {
      new Setting(this.contentEl).setName(folder).addButton((button) => {
        button.setButtonText(translate(this.locale, "useFolder")).setCta().onClick(async () => {
          await this.choose(folder);
          this.close();
        });
      });
    }
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

function validationMessage(value: ProfileValidation): MessageKey {
  if (value === "missing-start") return "missingStart";
  if (value === "unsafe-folder") return "invalidFolder";
  return "missingSource";
}
