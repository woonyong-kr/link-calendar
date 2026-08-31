import { TFile, TFolder, type CachedMetadata, type MetadataCache, type Vault } from "obsidian";

import {
  type CalendarEvent,
  type CalendarSnapshot,
  type Diagnostic,
  type SourceProfile,
  MAX_EVENT_SPAN_DAYS,
  calendarSpanLength,
  dateKey,
  isRecord,
  readField,
  values,
} from "./model";

export { readField } from "./model";

interface IndexedNote {
  diagnostic: Diagnostic | null;
  event: CalendarEvent | null;
}

export interface SourceDetection {
  dateProperties: { count: number; name: string }[];
  datedNoteCount: number;
  noteCount: number;
  suggestedStart: string;
}

export interface SourceHealth {
  invalid: number;
  missing: number;
  total: number;
  valid: number;
}

export class CalendarIndex {
  private readonly notes = new Map<string, IndexedNote>();
  private profiles: SourceProfile[];
  private revision = 0;

  constructor(
    private readonly vault: Vault,
    private readonly metadataCache: MetadataCache,
    profiles: SourceProfile[],
  ) {
    this.profiles = profiles;
  }

  rebuild(): void {
    this.notes.clear();
    for (const file of sourceFiles(this.vault, this.profiles)) this.indexFile(file);
    this.revision += 1;
  }

  update(file: TFile, frontmatterOverride?: Record<string, unknown>): void {
    this.notes.delete(file.path);
    this.indexFile(file, frontmatterOverride);
    this.revision += 1;
  }

  remove(path: string): void {
    if (this.notes.delete(path)) this.revision += 1;
  }

  setProfiles(profiles: SourceProfile[]): void {
    this.profiles = profiles;
    this.rebuild();
  }

  snapshot(): CalendarSnapshot {
    const diagnostics: Diagnostic[] = [];
    const events: CalendarEvent[] = [];
    for (const note of this.notes.values()) {
      if (note.diagnostic) diagnostics.push(note.diagnostic);
      if (note.event) events.push(note.event);
    }
    events.sort((left, right) =>
      left.startDate.localeCompare(right.startDate)
      || left.startTime.localeCompare(right.startTime)
      || left.title.localeCompare(right.title)
      || left.filePath.localeCompare(right.filePath),
    );
    diagnostics.sort((left, right) => left.filePath.localeCompare(right.filePath));
    return { diagnostics, events, revision: this.revision };
  }

  sourceHealth(profileId: string): SourceHealth {
    const health: SourceHealth = { invalid: 0, missing: 0, total: 0, valid: 0 };
    for (const note of this.notes.values()) {
      const noteProfileId = note.event?.profileId ?? note.diagnostic?.profileId;
      if (noteProfileId !== profileId) continue;
      health.total += 1;
      if (note.event) health.valid += 1;
      else if (note.diagnostic?.code === "missing-date") health.missing += 1;
      else health.invalid += 1;
    }
    return health;
  }

  private indexFile(file: TFile, frontmatterOverride?: Record<string, unknown>): void {
    const cache = this.metadataCache.getFileCache(file);
    const effectiveCache = frontmatterOverride
      ? metadataWithFrontmatter(cache, frontmatterOverride)
      : cache;
    const profile = selectProfile(file, effectiveCache, this.profiles);
    if (!profile) return;
    const frontmatter = frontmatterOverride ?? (isRecord(cache?.frontmatter) ? cache.frontmatter : {});
    const rawStart = readField(frontmatter, profile.properties.start);
    const start = dateKey(rawStart);
    if (!start) {
      this.notes.set(file.path, {
        diagnostic: {
          code: rawStart === undefined ? "missing-date" : "invalid-date",
          filePath: file.path,
          profileId: profile.id,
        },
        event: null,
      });
      return;
    }
    const rawEnd = readField(frontmatter, profile.properties.end);
    const explicitEnd = rawEnd !== undefined;
    const parsedEnd = explicitEnd ? dateKey(rawEnd) : start;
    if (!parsedEnd) {
      this.notes.set(file.path, invalidNote(file.path, profile.id, "invalid-end"));
      return;
    }
    const end = parsedEnd;
    if (end < start) {
      this.notes.set(file.path, invalidNote(file.path, profile.id, "end-before-start"));
      return;
    }
    if (calendarSpanLength(start, end) > MAX_EVENT_SPAN_DAYS) {
      this.notes.set(file.path, invalidNote(file.path, profile.id, "event-too-long"));
      return;
    }
    const title = stringField(frontmatter, profile.properties.title) || file.basename;
    const category = stringField(frontmatter, profile.properties.category);
    const allDay = booleanField(frontmatter, profile.properties.allDay);
    const writableProfile = selectProfileFromFrontmatter(file, frontmatter, this.profiles);
    this.notes.set(file.path, {
      diagnostic: null,
      event: {
        allDay,
        category,
        editable: profile.editable && writableProfile?.id === profile.id,
        endDate: end,
        endTime: allDay ? "" : stringField(frontmatter, profile.properties.endTime),
        filePath: file.path,
        id: `${profile.id}:${file.path}`,
        profileId: profile.id,
        startDate: start,
        startTime: allDay ? "" : stringField(frontmatter, profile.properties.startTime),
        title,
      },
    });
  }
}

export function matchesProfile(
  file: Pick<TFile, "path">,
  cache: CachedMetadata | null,
  profile: SourceProfile,
): boolean {
  if (!profile.enabled || !profile.folder) return false;
  const folderMatches = file.path.startsWith(`${profile.folder}/`)
    && (profile.recursive || !file.path.slice(profile.folder.length + 1).includes("/"));
  if (!folderMatches) return false;
  if (!profile.tag) return true;
  const expected = profile.tag.toLocaleLowerCase();
  return tags(cache).some((tag) => tag.toLocaleLowerCase() === expected);
}

export function selectProfile(
  file: Pick<TFile, "path">,
  cache: CachedMetadata | null,
  profiles: SourceProfile[],
): SourceProfile | undefined {
  return profiles
    .filter((profile) => matchesProfile(file, cache, profile))
    .sort((left, right) =>
      right.folder.length - left.folder.length
      || Number(left.editable) - Number(right.editable)
      || left.id.localeCompare(right.id),
    )[0];
}

export function selectProfileFromFrontmatter(
  file: Pick<TFile, "path">,
  frontmatter: Record<string, unknown>,
  profiles: SourceProfile[],
): SourceProfile | undefined {
  return selectProfile(file, { frontmatter }, profiles);
}

function metadataWithFrontmatter(
  cache: CachedMetadata | null,
  frontmatter: Record<string, unknown>,
): CachedMetadata {
  return { ...(cache ?? {}), frontmatter };
}

function tags(cache: CachedMetadata | null): string[] {
  const result = new Set<string>();
  for (const item of cache?.tags ?? []) result.add(item.tag.replace(/^#/, ""));
  const frontmatter = isRecord(cache?.frontmatter) ? cache.frontmatter : {};
  for (const item of values(readField(frontmatter, "tags"))) result.add(item.replace(/^#/, ""));
  return [...result];
}

function stringField(frontmatter: Record<string, unknown>, name: string): string {
  const value = readField(frontmatter, name);
  if (typeof value === "string") return value.trim();
  return typeof value === "number" ? String(value) : "";
}

function booleanField(frontmatter: Record<string, unknown>, name: string): boolean {
  const value = readField(frontmatter, name);
  return value === true || (typeof value === "string" && value.toLocaleLowerCase() === "true");
}

function invalidNote(
  filePath: string,
  profileId: string,
  code: Diagnostic["code"],
): IndexedNote {
  return { diagnostic: { code, filePath, profileId }, event: null };
}

function sourceFiles(vault: Vault, profiles: SourceProfile[]): TFile[] {
  const files = new Map<string, TFile>();
  for (const profile of profiles) {
    if (!profile.enabled || !profile.folder) continue;
    const folder = vault.getFolderByPath(profile.folder);
    if (!folder) continue;
    collectMarkdownFiles(folder, profile.recursive, files);
  }
  return [...files.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export function detectSourceFolder(
  vault: Vault,
  metadataCache: MetadataCache,
  folderPath: string,
  recursive: boolean,
): SourceDetection {
  const folder = vault.getFolderByPath(folderPath);
  if (!folder) {
    return { dateProperties: [], datedNoteCount: 0, noteCount: 0, suggestedStart: "" };
  }
  const files = new Map<string, TFile>();
  collectMarkdownFiles(folder, recursive, files);
  const counts = new Map<string, number>();
  for (const file of files.values()) {
    const frontmatter = metadataCache.getFileCache(file)?.frontmatter;
    if (!isRecord(frontmatter)) continue;
    for (const [name, value] of Object.entries(frontmatter)) {
      if (!dateKey(value)) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const dateProperties = [...counts].map(([name, count]) => ({ count, name })).sort((left, right) =>
    datePropertyPriority(left.name) - datePropertyPriority(right.name)
    || right.count - left.count
    || left.name.localeCompare(right.name),
  );
  const suggestedStart = dateProperties[0]?.name ?? "";
  return {
    dateProperties,
    datedNoteCount: suggestedStart ? counts.get(suggestedStart) ?? 0 : 0,
    noteCount: files.size,
    suggestedStart,
  };
}

export function inspectSourceHealth(
  vault: Vault,
  metadataCache: MetadataCache,
  profile: SourceProfile,
): SourceHealth {
  const folder = profile.folder ? vault.getFolderByPath(profile.folder) : null;
  if (!folder) return { invalid: 0, missing: 0, total: 0, valid: 0 };
  const files = new Map<string, TFile>();
  collectMarkdownFiles(folder, profile.recursive, files);
  const health: SourceHealth = { invalid: 0, missing: 0, total: 0, valid: 0 };
  for (const file of files.values()) {
    const cache = metadataCache.getFileCache(file);
    if (!matchesProfile(file, cache, profile)) continue;
    health.total += 1;
    const frontmatter = isRecord(cache?.frontmatter) ? cache.frontmatter : {};
    const rawStart = readField(frontmatter, profile.properties.start);
    if (rawStart === undefined) health.missing += 1;
    else if (dateKey(rawStart)) health.valid += 1;
    else health.invalid += 1;
  }
  return health;
}

function datePropertyPriority(name: string): number {
  const normalized = name.replace(/[\s_-]/g, "").toLocaleLowerCase();
  const preferred = ["date", "start", "startdate", "begins", "scheduled", "when", "day"];
  const index = preferred.indexOf(normalized);
  return index === -1 ? preferred.length : index;
}

function collectMarkdownFiles(folder: TFolder, recursive: boolean, files: Map<string, TFile>): void {
  for (const child of folder.children) {
    if (child instanceof TFile && child.extension === "md") files.set(child.path, child);
    else if (recursive && child instanceof TFolder) collectMarkdownFiles(child, true, files);
  }
}
