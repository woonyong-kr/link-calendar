import { TFile, TFolder, type CachedMetadata, type MetadataCache, type Vault } from "obsidian";

import {
  type CalendarEvent,
  type CalendarLink,
  type CalendarSnapshot,
  type Diagnostic,
  type SourceProfile,
  MAX_EVENT_SPAN_DAYS,
  calendarSpanLength,
  dateKey,
  fileTitle,
  isRecord,
  linkTarget,
  readField,
  values,
} from "./model";

export { readField } from "./model";

interface IndexedNote {
  diagnostic: Diagnostic | null;
  event: CalendarEvent | null;
  outgoing: CalendarLink[];
}

export interface SourceDetection {
  dateProperties: { count: number; name: string }[];
  datedNoteCount: number;
  noteCount: number;
  suggestedStart: string;
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
    const reverse = this.reverseLinks();
    const diagnostics: Diagnostic[] = [];
    const events: CalendarEvent[] = [];
    for (const note of this.notes.values()) {
      if (note.diagnostic) diagnostics.push(note.diagnostic);
      if (note.event) {
        const refreshLinks = (links: CalendarLink[]) => links.map((link) => this.calendarLink(link.path));
        events.push({
          ...note.event,
          context: {
            links: refreshLinks(note.event.context.links),
            people: refreshLinks(note.event.context.people),
            project: refreshLinks(note.event.context.project),
            related: refreshLinks(note.event.context.related),
            backlinks: reverse.get(note.event.filePath) ?? [],
          },
        });
      }
    }
    events.sort((left, right) =>
      left.startDate.localeCompare(right.startDate)
      || left.title.localeCompare(right.title)
      || left.filePath.localeCompare(right.filePath),
    );
    diagnostics.sort((left, right) => left.filePath.localeCompare(right.filePath));
    return { diagnostics, events, revision: this.revision };
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
    const outgoing = this.resolveOutgoing(file, cache, frontmatter, profile);
    if (!start) {
      this.notes.set(file.path, {
        diagnostic: {
          code: rawStart === undefined ? "missing-date" : "invalid-date",
          filePath: file.path,
          profileId: profile.id,
        },
        event: null,
        outgoing,
      });
      return;
    }
    const rawEnd = readField(frontmatter, profile.properties.end);
    const explicitEnd = rawEnd !== undefined;
    const parsedEnd = explicitEnd ? dateKey(rawEnd) : start;
    if (!parsedEnd) {
      this.notes.set(file.path, invalidNote(file.path, profile.id, outgoing, "invalid-end"));
      return;
    }
    const end = parsedEnd;
    if (end < start) {
      this.notes.set(file.path, invalidNote(file.path, profile.id, outgoing, "end-before-start"));
      return;
    }
    if (calendarSpanLength(start, end) > MAX_EVENT_SPAN_DAYS) {
      this.notes.set(file.path, invalidNote(file.path, profile.id, outgoing, "event-too-long"));
      return;
    }
    const title = stringField(frontmatter, profile.properties.title) || file.basename;
    const category = stringField(frontmatter, profile.properties.category);
    const people = this.resolveProperty(file, frontmatter, profile.properties.people);
    const project = this.resolveProperty(file, frontmatter, profile.properties.project);
    const related = this.resolveProperty(file, frontmatter, profile.properties.related);
    const classified = new Set([...people, ...project, ...related].map((link) => link.path));
    const writableProfile = selectProfileFromFrontmatter(file, frontmatter, this.profiles);
    this.notes.set(file.path, {
      diagnostic: null,
      event: {
        category,
        context: {
          backlinks: [],
          links: outgoing.filter((link) => !classified.has(link.path)),
          people,
          project,
          related,
        },
        editable: profile.editable && writableProfile?.id === profile.id,
        endDate: end,
        filePath: file.path,
        id: `${profile.id}:${file.path}`,
        profileId: profile.id,
        startDate: start,
        title,
      },
      outgoing,
    });
  }

  private resolveOutgoing(
    file: TFile,
    cache: CachedMetadata | null,
    frontmatter: Record<string, unknown>,
    profile: SourceProfile,
  ): CalendarLink[] {
    const candidates = new Set<string>();
    for (const link of cache?.links ?? []) candidates.add(link.link);
    for (const link of cache?.frontmatterLinks ?? []) candidates.add(link.link);
    for (const field of [profile.properties.people, profile.properties.project, profile.properties.related]) {
      for (const item of values(readField(frontmatter, field))) candidates.add(linkTarget(item));
    }
    const paths = [...new Set(
      [...candidates]
        .map((candidate) => this.metadataCache.getFirstLinkpathDest(candidate, file.path)?.path)
        .filter((path): path is string => Boolean(path) && path !== file.path),
    )].sort();
    return paths.map((path) => this.calendarLink(path));
  }

  private resolveProperty(
    file: TFile,
    frontmatter: Record<string, unknown>,
    field: string,
  ): CalendarLink[] {
    const paths = [...new Set(
      values(readField(frontmatter, field))
        .map(linkTarget)
        .map((candidate) => this.metadataCache.getFirstLinkpathDest(candidate, file.path)?.path)
        .filter((path): path is string => Boolean(path) && path !== file.path),
    )].sort();
    return paths.map((path) => this.calendarLink(path));
  }

  private reverseLinks(): Map<string, CalendarLink[]> {
    const reverse = new Map<string, Set<string>>();
    const eventPaths = new Set(
      [...this.notes.entries()]
        .filter(([, note]) => note.event !== null)
        .map(([path]) => path),
    );
    for (const [source, targets] of Object.entries(this.metadataCache.resolvedLinks)) {
      for (const target of Object.keys(targets)) {
        if (source === target || !eventPaths.has(target)) continue;
        const sources = reverse.get(target) ?? new Set<string>();
        sources.add(source);
        reverse.set(target, sources);
      }
    }
    return new Map([...reverse].map(([target, sources]) => [
      target,
      [...sources].sort().map((path) => this.calendarLink(path)),
    ]));
  }

  private calendarLink(path: string): CalendarLink {
    const file = this.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return { label: fileTitle(path), path };
    const markdownFile = file;
    const frontmatter = this.metadataCache.getFileCache(markdownFile)?.frontmatter;
    const title = isRecord(frontmatter) ? readField(frontmatter, "title") : undefined;
    const fallback = markdownFile.basename === "README"
      ? markdownFile.parent?.name ?? markdownFile.basename
      : markdownFile.basename;
    return {
      label: typeof title === "string" && title.trim() ? title.trim() : fallback,
      path,
    };
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

function invalidNote(
  filePath: string,
  profileId: string,
  outgoing: CalendarLink[],
  code: Diagnostic["code"],
): IndexedNote {
  return { diagnostic: { code, filePath, profileId }, event: null, outgoing };
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
