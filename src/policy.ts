import type { CalendarEvent, SourceProfile } from "./model";
import {
  addDays,
  calendarDayDifference,
  dateKey,
  findFieldKey,
  isSafeVaultPath,
  normalizeVaultPath,
  readField,
} from "./model";

export interface EventDraft {
  category: string;
  date: string;
  title: string;
}

export type ProfileValidation = "missing-source" | "missing-start" | "unsafe-folder";

export function validateProfile(profile: SourceProfile): ProfileValidation | null {
  if (!profile.folder) return "missing-source";
  if (!isSafeVaultPath(profile.folder)) return "unsafe-folder";
  if (!profile.properties.start.trim()) return "missing-start";
  return null;
}

export function writableProfiles(profiles: SourceProfile[]): SourceProfile[] {
  return profiles.filter((profile) =>
    profile.enabled
    && profile.editable
    && Boolean(profile.folder)
    && validateProfile(profile) === null);
}

export function canCreateWithProfile(
  profile: SourceProfile,
  selectedProfile: SourceProfile | undefined,
): boolean {
  return selectedProfile?.id === profile.id && writableProfiles([profile]).length === 1;
}

export function canMoveEvent(
  event: CalendarEvent,
  profile: SourceProfile | undefined,
  currentlyMatches: boolean,
): profile is SourceProfile {
  return Boolean(
    event.editable
    && profile
    && profile.id === event.profileId
    && profile.enabled
    && profile.editable
    && profile.properties.start.trim()
    && currentlyMatches,
  );
}

export function planMoveFrontmatter(
  event: CalendarEvent,
  profile: SourceProfile | undefined,
  selectedProfile: SourceProfile | undefined,
  frontmatter: Record<string, unknown>,
  targetDate: string,
): Record<string, unknown> | null {
  if (!profile || !dateKey(targetDate) || !canMoveEvent(event, profile, selectedProfile?.id === profile.id)) {
    return null;
  }
  const startKey = findFieldKey(frontmatter, profile.properties.start);
  const currentStart = dateKey(readField(frontmatter, profile.properties.start));
  if (!startKey || !currentStart) return null;

  const changes: Record<string, unknown> = { [startKey]: targetDate };
  const endField = profile.properties.end.trim();
  const endKey = endField ? findFieldKey(frontmatter, endField) : null;
  if (!endKey) return changes;

  const currentEnd = dateKey(frontmatter[endKey]);
  if (!currentEnd || currentEnd < currentStart) return null;
  changes[endKey] = addDays(targetDate, calendarDayDifference(currentStart, currentEnd));
  return changes;
}

export function eventFrontmatter(profile: SourceProfile, draft: EventDraft): Record<string, unknown> {
  const frontmatter: Record<string, unknown> = {
    [profile.properties.start]: draft.date,
  };
  if (profile.properties.title) frontmatter[profile.properties.title] = draft.title;
  if (draft.category && profile.properties.category) {
    frontmatter[profile.properties.category] = draft.category;
  }
  if (profile.tag) frontmatter.tags = [profile.tag];
  return frontmatter;
}

export function gridMovement(key: string, weekOffset: number): number | null {
  const movements: Record<string, number> = {
    ArrowDown: 7,
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    End: 6 - weekOffset,
    Home: -weekOffset,
  };
  return Object.hasOwn(movements, key) ? movements[key] ?? null : null;
}

export function matchesEventQuery(event: CalendarEvent, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [
    event.title,
    event.category,
    event.filePath,
    ...Object.values(event.context).flat().flatMap((link) => [link.label, link.path]),
  ].some((value) => value.toLocaleLowerCase().includes(normalized));
}

export function embedSource(value: unknown): { invalid: boolean; source: string } {
  if (value === undefined) return { invalid: false, source: "" };
  if (typeof value !== "string") return { invalid: true, source: "" };
  const source = normalizeVaultPath(value);
  return source && isSafeVaultPath(value)
    ? { invalid: false, source }
    : { invalid: true, source: "" };
}
