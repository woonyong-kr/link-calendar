import {
  type App,
  Notice,
  type Plugin,
  PluginSettingTab,
  type SettingDefinitionItem,
  type SettingDefinitionPage,
} from "obsidian";

import { type MessageKey, translate } from "./i18n";
import { type CalendarSettings, type SourceProfile, createProfile } from "./model";
import { type ProfileValidation, validateProfile } from "./policy";

export interface SettingsHost {
  app: App;
  settings: CalendarSettings;
  saveSettings(rebuildIndex?: boolean): Promise<void>;
}

export class ContextCalendarSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly host: SettingsHost & Plugin) {
    super(app, host);
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const locale = this.host.settings.locale;
    return [
      {
        type: "group",
        heading: translate(locale, "settings"),
        items: [
          {
            name: translate(locale, "language"),
            desc: translate(locale, "languageDesc"),
            control: {
              type: "dropdown",
              key: "locale",
              options: {
                auto: translate(locale, "automatic"),
                en: translate(locale, "english"),
                ko: translate(locale, "korean"),
              },
            },
          },
          {
            name: translate(locale, "weekStartsOn"),
            control: {
              type: "dropdown",
              key: "weekStart",
              options: {
                auto: translate(locale, "automatic"),
                sunday: translate(locale, "sunday"),
                monday: translate(locale, "monday"),
              },
            },
          },
          {
            name: translate(locale, "contextPanel"),
            desc: translate(locale, "contextPanelDesc"),
            control: { type: "toggle", key: "showContext" },
          },
        ],
      },
      {
        type: "group",
        heading: translate(locale, "sources"),
        items: [
          ...this.host.settings.profiles.map((profile) => this.profilePage(profile)),
          {
            name: translate(locale, "addSource"),
            desc: translate(locale, "sourceDesc"),
            action: () => {
              const profile = createProfile();
              profile.name = translate(locale, "calendarNotes");
              this.host.settings.profiles.push(profile);
              this.update();
            },
          },
        ],
      },
    ];
  }

  override getControlValue(key: string): unknown {
    if (key === "locale") return this.host.settings.locale;
    if (key === "weekStart") return this.host.settings.weekStart;
    if (key === "showContext") return this.host.settings.showContext;
    return undefined;
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "locale" && (value === "auto" || value === "en" || value === "ko")) {
      this.host.settings.locale = value;
    } else if (key === "weekStart" && (value === "auto" || value === "sunday" || value === "monday")) {
      this.host.settings.weekStart = value;
    } else if (key === "showContext" && typeof value === "boolean") {
      this.host.settings.showContext = value;
    } else {
      return;
    }
    await this.host.saveSettings();
    this.update();
  }

  private profilePage(profile: SourceProfile): SettingDefinitionPage {
    const locale = this.host.settings.locale;
    const draft = structuredClone(profile);
    const fields = [
      ["start", translate(locale, "startDate")],
      ["end", translate(locale, "endDate")],
      ["title", translate(locale, "titleField")],
      ["category", translate(locale, "category")],
      ["people", translate(locale, "people")],
      ["project", translate(locale, "project")],
      ["related", translate(locale, "related")],
    ] as const;
    return {
      type: "page",
      name: profile.name || translate(locale, "calendarSource"),
      desc: translate(locale, profile.enabled ? "included" : "disabled"),
      displayValue: profile.folder || translate(locale, "folderRequired"),
      status: validateProfile(profile) ? "warning" : null,
      items: [
        {
          type: "group",
          items: [
            {
              name: translate(locale, "enableSource"),
              render: (setting) => {
                setting.addToggle((control) => {
                  control.setValue(draft.enabled).onChange((value) => { draft.enabled = value; });
                });
              },
            },
            {
              name: translate(locale, "name"),
              render: (setting) => {
                setting.addText((control) => {
                  control.setValue(draft.name).onChange((value) => { draft.name = value.trim(); });
                });
              },
            },
            {
              name: translate(locale, "folder"),
              desc: translate(locale, "folderDesc"),
              render: (setting) => {
                setting.addText((control) => {
                  control
                    .setPlaceholder(translate(locale, "calendarNotes"))
                    .setValue(draft.folder)
                    .onChange((value) => {
                      draft.folder = value.trim().replace(/^\/+|\/+$/g, "");
                    });
                });
              },
            },
            {
              name: translate(locale, "tag"),
              desc: translate(locale, "tagDesc"),
              render: (setting) => {
                setting.addText((control) => {
                  control.setPlaceholder("Calendar").setValue(draft.tag).onChange((value) => {
                    draft.tag = value.replace(/^#/, "").trim();
                  });
                });
              },
            },
            {
              name: translate(locale, "writable"),
              desc: translate(locale, "writableDesc"),
              render: (setting) => {
                setting.addToggle((control) => {
                  control.setValue(draft.editable).onChange((value) => { draft.editable = value; });
                });
              },
            },
            {
              name: translate(locale, "includeSubfolders"),
              render: (setting) => {
                setting.addToggle((control) => {
                  control.setValue(draft.recursive).onChange((value) => { draft.recursive = value; });
                });
              },
            },
          ],
        },
        {
          type: "group",
          heading: translate(locale, "propertyMapping"),
          items: fields.map(([key, label]) => ({
            name: label,
            render: (setting) => {
              setting.addText((control) => {
                control.setValue(draft.properties[key]).onChange((value) => {
                  draft.properties[key] = value.trim();
                });
              });
            },
          })),
        },
        {
          name: translate(locale, "apply"),
          action: () => {
            const invalid = validateProfile(draft);
            if (invalid) {
              new Notice(translate(locale, validationMessage(invalid)));
              return;
            }
            Object.assign(profile, structuredClone(draft));
            void this.host.saveSettings(true).then(() => this.update());
          },
        },
        {
          name: translate(locale, "removeSource"),
          action: () => {
            this.host.settings.profiles = this.host.settings.profiles.filter((item) => item.id !== profile.id);
            void this.host.saveSettings(true).then(() => this.update());
          },
        },
      ],
    };
  }
}

function validationMessage(value: ProfileValidation): MessageKey {
  if (value === "missing-start") return "missingStart";
  if (value === "unsafe-folder") return "invalidFolder";
  return "missingSource";
}
