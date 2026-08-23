export type LocaleId = "auto" | "en" | "ko";
export type WeekStart = "auto" | "sunday" | "monday";

export interface PropertyMap {
  category: string;
  end: string;
  people: string;
  project: string;
  related: string;
  start: string;
  title: string;
}

export interface SourceProfile {
  editable: boolean;
  enabled: boolean;
  folder: string;
  id: string;
  name: string;
  properties: PropertyMap;
  recursive: boolean;
  tag: string;
}

export interface CalendarSettings {
  locale: LocaleId;
  profiles: SourceProfile[];
  showContext: boolean;
  weekStart: WeekStart;
}

export interface CalendarEvent {
  category: string;
  context: {
    backlinks: CalendarLink[];
    links: CalendarLink[];
    people: CalendarLink[];
    project: CalendarLink[];
    related: CalendarLink[];
  };
  editable: boolean;
  endDate: string;
  filePath: string;
  id: string;
  profileId: string;
  startDate: string;
  title: string;
}

export interface CalendarLink {
  label: string;
  path: string;
}

export interface Diagnostic {
  code: "end-before-start" | "event-too-long" | "invalid-date" | "invalid-end" | "missing-date";
  filePath: string;
  profileId: string;
}

export const MAX_EVENT_SPAN_DAYS = 370;

export interface CalendarSnapshot {
  diagnostics: Diagnostic[];
  events: CalendarEvent[];
  revision: number;
}

export const DEFAULT_PROPERTIES: PropertyMap = {
  category: "category",
  end: "end",
  people: "people",
  project: "project",
  related: "related",
  start: "date",
  title: "title",
};

export const DEFAULT_SETTINGS: CalendarSettings = {
  locale: "auto",
  profiles: [],
  showContext: true,
  weekStart: "auto",
};

export function createProfile(folder = ""): SourceProfile {
  const normalized = normalizeVaultPath(folder);
  return {
    editable: true,
    enabled: true,
    folder: normalized,
    id: crypto.randomUUID(),
    name: normalized ? normalized.split("/").at(-1) ?? normalized : "Calendar notes",
    properties: { ...DEFAULT_PROPERTIES },
    recursive: true,
    tag: "",
  };
}

export function normalizeSettings(value: unknown): CalendarSettings {
  if (!isRecord(value)) return structuredClone(DEFAULT_SETTINGS);
  const rawProfiles = Array.isArray(value.sourceProfiles)
    ? value.sourceProfiles
    : Array.isArray(value.profiles) ? value.profiles : [];
  const normalizedProfiles = rawProfiles
    .map(normalizeProfile).filter((item): item is SourceProfile => item !== null);
  const profileIds = new Map<string, number>();
  const profiles = normalizedProfiles.map((profile) => {
    const count = (profileIds.get(profile.id) ?? 0) + 1;
    profileIds.set(profile.id, count);
    return count === 1 ? profile : { ...profile, id: `${profile.id}-${String(count)}` };
  });
  return {
    locale: value.locale === "en" || value.locale === "ko" ? value.locale : "auto",
    profiles,
    showContext: value.showContext !== false,
    weekStart: value.weekStart === "sunday" || value.weekStart === "monday"
      ? value.weekStart
      : "auto",
  };
}

export function serializeSettings(settings: CalendarSettings): Record<string, unknown> {
  return {
    schemaVersion: 1,
    locale: settings.locale,
    showContext: settings.showContext,
    sourceProfiles: settings.profiles.map((profile) => ({
      editable: profile.editable,
      enabled: profile.enabled,
      id: profile.id,
      name: profile.name,
      properties: profile.properties,
      source: {
        path: profile.folder,
        recursive: profile.recursive,
        tag: profile.tag,
        type: "folder",
      },
    })),
    weekStart: settings.weekStart,
  };
}

function normalizeProfile(value: unknown): SourceProfile | null {
  if (!isRecord(value)) return null;
  const sourceConfig = isRecord(value.source) ? value.source : {};
  const folder = normalizeVaultPath(stringValue(sourceConfig.path) || stringValue(value.folder));
  const tag = (stringValue(sourceConfig.tag) || stringValue(value.tag)).replace(/^#/, "").trim();
  if (!folder && !tag) return null;
  const source = isRecord(value.properties) ? value.properties : {};
  return {
    editable: value.editable !== false,
    enabled: Boolean(folder) && value.enabled !== false,
    folder,
    id: stringValue(value.id) || crypto.randomUUID(),
    name: stringValue(value.name) || folder || tag,
    properties: {
      category: propertyName(source.category, DEFAULT_PROPERTIES.category),
      end: propertyName(source.end, DEFAULT_PROPERTIES.end),
      people: propertyName(source.people, DEFAULT_PROPERTIES.people),
      project: propertyName(source.project ?? source.projects, DEFAULT_PROPERTIES.project),
      related: propertyName(source.related, DEFAULT_PROPERTIES.related),
      start: propertyName(source.start, DEFAULT_PROPERTIES.start),
      title: propertyName(source.title, DEFAULT_PROPERTIES.title),
    },
    recursive: sourceConfig.recursive !== false && value.recursive !== false,
    tag,
  };
}

export function normalizeVaultPath(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

export function isSafeVaultPath(value: string): boolean {
  const normalized = normalizeVaultPath(value);
  return Boolean(normalized) && !value.startsWith("/") && !normalized.split("/").includes("..");
}

export function dateKey(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return localDateKey(value);
  }
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

export function localDateKey(value: Date): string {
  return [
    String(value.getFullYear()).padStart(4, "0"),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseDateKey(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, amount: number): string {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

export function eachDate(start: string, end: string): string[] {
  const length = calendarSpanLength(start, end);
  if (length < 1 || length > MAX_EVENT_SPAN_DAYS) return [];
  return Array.from({ length }, (_, index) => addDays(start, index));
}

export function calendarDayDifference(start: string, end: string): number {
  const [startYear = 0, startMonth = 1, startDay = 1] = start.split("-").map(Number);
  const [endYear = 0, endMonth = 1, endDay = 1] = end.split("-").map(Number);
  return Math.round(
    (Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay))
      / 86_400_000,
  );
}

export function calendarSpanLength(start: string, end: string): number {
  return calendarDayDifference(start, end) + 1;
}

export function monthGrid(month: Date, firstDay: 0 | 1): string[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - firstDay + 7) % 7;
  first.setDate(first.getDate() - offset);
  const count = offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() > 35 ? 42 : 35;
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first);
    day.setDate(day.getDate() + index);
    return localDateKey(day);
  });
}

export function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

export function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(values);
  if (typeof value !== "string") return [];
  return splitPropertyValue(value)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitPropertyValue(value: string): string[] {
  const result: string[] = [];
  let current = "";
  let wikiDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const pair = value.slice(index, index + 2);
    if (pair === "[[") wikiDepth += 1;
    if (pair === "]]" && wikiDepth > 0) wikiDepth -= 1;
    if (value[index] === "," && wikiDepth === 0) {
      result.push(current);
      current = "";
    } else {
      current += value[index] ?? "";
    }
  }
  result.push(current);
  return result;
}

export function linkTarget(value: string): string {
  const match = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]$/.exec(value.trim());
  return (match?.[1] ?? value).trim();
}

export function categoryToken(value: string): string {
  const normalized = value.trim().toLocaleLowerCase();
  let hash = 0;
  for (const character of normalized) hash = Math.imul(31, hash) + character.charCodeAt(0) | 0;
  return `tone-${String(Math.abs(hash) % 8)}`;
}

export function fileTitle(path: string): string {
  return path.split("/").at(-1)?.replace(/\.md$/i, "") ?? path;
}

export function findFieldKey(frontmatter: Record<string, unknown>, name: string): string | null {
  if (Object.hasOwn(frontmatter, name)) return name;
  const wanted = name.toLocaleLowerCase();
  return Object.keys(frontmatter).find((candidate) => candidate.toLocaleLowerCase() === wanted) ?? null;
}

export function readField(frontmatter: Record<string, unknown>, name: string): unknown {
  const key = findFieldKey(frontmatter, name);
  return key ? frontmatter[key] : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function propertyName(value: unknown, fallback: string): string {
  return stringValue(value).trim() || fallback;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
