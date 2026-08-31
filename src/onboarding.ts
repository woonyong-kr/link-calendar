import { createProfile, type PropertyMap, type SourceProfile } from "./model";

export type SourcePresetId = "daily-note" | "learning-log" | "meeting" | "project-deadline";

export interface SourcePreset {
  id: SourcePresetId;
  properties: Partial<PropertyMap>;
  startCandidates: readonly string[];
}

export const SOURCE_PRESETS: readonly SourcePreset[] = [
  {
    id: "learning-log",
    properties: { category: "course", start: "date", title: "topic" },
    startCandidates: ["date", "studiedOn", "learningDate", "day"],
  },
  {
    id: "project-deadline",
    properties: { category: "project", start: "due", title: "title" },
    startCandidates: ["due", "deadline", "date", "targetDate"],
  },
  {
    id: "meeting",
    properties: {
      category: "team",
      endTime: "endTime",
      start: "date",
      startTime: "startTime",
      title: "title",
    },
    startCandidates: ["date", "meetingDate", "startDate", "start"],
  },
  {
    id: "daily-note",
    properties: { category: "category", start: "date", title: "title" },
    startCandidates: ["date", "day", "created"],
  },
];

function sourcePreset(id: SourcePresetId): SourcePreset {
  const preset = SOURCE_PRESETS.find((candidate) => candidate.id === id) ?? SOURCE_PRESETS[0];
  if (!preset) throw new Error("Source presets must not be empty");
  return preset;
}

export function detectedStartProperty(
  presetId: SourcePresetId,
  detectedNames: readonly string[],
  fallback = "date",
): string {
  const detected = new Map(detectedNames.map((name) => [normalizedProperty(name), name]));
  for (const candidate of sourcePreset(presetId).startCandidates) {
    const matching = detected.get(normalizedProperty(candidate));
    if (matching) return matching;
  }
  return detectedNames[0] ?? fallback;
}

export function createPresetProfile(
  folder: string,
  presetId: SourcePresetId,
  detectedNames: readonly string[],
): SourceProfile {
  const profile = createProfile(folder);
  const preset = sourcePreset(presetId);
  profile.properties = {
    ...profile.properties,
    ...preset.properties,
    start: detectedStartProperty(presetId, detectedNames, preset.properties.start),
  };
  return profile;
}

function normalizedProperty(value: string): string {
  return value.replace(/[\s_-]/g, "").toLocaleLowerCase();
}
