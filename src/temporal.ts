import {
  type TemporalKind,
  type TemporalSource,
  dateKey,
  fileTitle,
  localDateKey,
} from "./model";

export interface TemporalCandidate {
  category: string;
  endDate: string;
  endTime: string;
  kind: TemporalKind;
  linkPath: string;
  ongoing: boolean;
  origin: "body";
  source: TemporalSource;
  startDate: string;
  startTime: string;
  title: string;
}

const DATE_PATTERN = "(\\d{4}-\\d{2}-\\d{2})";
const RANGE_PATTERN = new RegExp(
  `${DATE_PATTERN}\\s*(?:→|->|–|—|~)\\s*(${DATE_PATTERN}|진행\\s*중|present|ongoing)`,
  "iu",
);
const SCHEDULE_PATTERN = new RegExp(
  `${DATE_PATTERN}\\s*(예정|마감|scheduled|deadline)`,
  "iu",
);
const ANY_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/gu;
const WIKI_LINK_PATTERN = /\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]+))?\]\]/u;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]*)?\)/iu;

export function extractMarkdownTemporal(
  filePath: string,
  basename: string,
  markdown: string,
  today = localDateKey(new Date()),
): TemporalCandidate[] {
  const candidates: TemporalCandidate[] = [];
  let inFrontmatter = markdown.startsWith("---");
  let inFence = false;
  let inComment = false;
  const lines = markdown.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const trimmed = rawLine.trim();
    if (inFrontmatter) {
      if (index > 0 && trimmed === "---") inFrontmatter = false;
      continue;
    }
    if (/^(```|~~~)/u.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || trimmed.startsWith(">")) continue;
    let line = rawLine;
    if (inComment) {
      const end = line.indexOf("-->");
      if (end < 0) continue;
      line = line.slice(end + 3);
      inComment = false;
    }
    const commentStart = line.indexOf("<!--");
    if (commentStart >= 0) {
      const commentEnd = line.indexOf("-->", commentStart + 4);
      if (commentEnd < 0) {
        line = line.slice(0, commentStart);
        inComment = true;
      } else {
        line = line.slice(0, commentStart) + line.slice(commentEnd + 3);
      }
    }
    line = stripIgnoredInline(line);
    const range = RANGE_PATTERN.exec(line);
    if (range) {
      const startDate = dateKey(range[1]);
      const parsedEnd = dateKey(range[2]);
      if (!startDate) continue;
      const ongoing = !parsedEnd && isOngoing(range[2]);
      const endDate = parsedEnd ?? (ongoing ? today : startDate);
      if (endDate < startDate) continue;
      candidates.push(bodyCandidate(filePath, basename, line, index + 1, {
        endDate,
        kind: "period",
        ongoing,
        startDate,
      }));
      continue;
    }
    const scheduled = SCHEDULE_PATTERN.exec(line);
    if (scheduled) {
      const startDate = dateKey(scheduled[1]);
      if (!startDate) continue;
      const kind = /마감|deadline/iu.test(scheduled[2] ?? "") ? "deadline" : "event";
      candidates.push(bodyCandidate(filePath, basename, line, index + 1, {
        endDate: startDate,
        kind,
        ongoing: false,
        startDate,
      }));
      continue;
    }
    if (!/^\s*[-*+]\s/u.test(line)) continue;
    for (const match of line.matchAll(ANY_DATE_PATTERN)) {
      const startDate = dateKey(match[0]);
      if (!startDate) continue;
      candidates.push(bodyCandidate(filePath, basename, line, index + 1, {
        endDate: startDate,
        kind: "history",
        ongoing: false,
        startDate,
      }));
    }
  }
  return distinctCandidates(candidates);
}

function bodyCandidate(
  filePath: string,
  basename: string,
  line: string,
  lineNumber: number,
  dates: Pick<TemporalCandidate, "endDate" | "kind" | "ongoing" | "startDate">,
): TemporalCandidate {
  const link = linkedDocument(line);
  return {
    category: "",
    endDate: dates.endDate,
    endTime: "",
    kind: dates.kind,
    linkPath: link.path,
    ongoing: dates.ongoing,
    origin: "body",
    source: temporalSource(filePath, lineNumber, compactExcerpt(line)),
    startDate: dates.startDate,
    startTime: "",
    title: link.label || fileTitle(link.path) || basename,
  };
}

function linkedDocument(line: string): { label: string; path: string } {
  const wiki = WIKI_LINK_PATTERN.exec(line);
  if (wiki) {
    const path = wiki[1]?.trim() ?? "";
    return { label: wiki[2]?.trim() || fileTitle(path), path };
  }
  const markdown = MARKDOWN_LINK_PATTERN.exec(line);
  if (markdown) {
    return {
      label: markdown[1]?.trim() ?? "",
      path: decodeURIComponent((markdown[2] ?? "").trim()),
    };
  }
  return { label: "", path: "" };
}

function stripIgnoredInline(line: string): string {
  return line
    .replace(/`[^`]*`/gu, "")
    .replace(/https?:\/\/\S+/giu, "");
}

function temporalSource(filePath: string, line: number, excerpt: string): TemporalSource {
  return { excerpt: excerpt.trim(), filePath, line };
}

function compactExcerpt(line: string): string {
  return line.trim().replace(/^[-*+]\s+/u, "").slice(0, 240);
}

function isOngoing(value: unknown): boolean {
  return typeof value === "string" && /^(진행\s*중|present|ongoing)$/iu.test(value.trim());
}

function distinctCandidates(candidates: TemporalCandidate[]): TemporalCandidate[] {
  const result = new Map<string, TemporalCandidate>();
  for (const candidate of candidates) {
    const key = [
      candidate.linkPath,
      candidate.source.filePath,
      candidate.source.line,
      candidate.startDate,
      candidate.endDate,
      candidate.kind,
      candidate.title,
    ].join("\u0000");
    if (!result.has(key)) result.set(key, candidate);
  }
  return [...result.values()];
}
