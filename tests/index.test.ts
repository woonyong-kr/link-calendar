import { TFile } from "obsidian";
import { describe, expect, it } from "vitest";

import {
  CalendarIndex,
  matchesProfile,
  readField,
  selectProfile,
  selectProfileFromFrontmatter,
} from "../src/index";
import { createProfile } from "../src/model";
import { canCreateWithProfile, eventFrontmatter } from "../src/policy";

function fixture() {
  const files = [
    testFile("Calendar/Alpha.md"),
    testFile("Calendar/Bad.md"),
    testFile("People/Jane.md"),
  ];
  const caches = new Map<string, {
    frontmatter: Record<string, unknown>;
    frontmatterLinks?: { link: string }[];
    links: { link: string }[];
  }>([
    ["Calendar/Alpha.md", {
      frontmatter: {
        Date: "2026-08-18",
        End: "2026-08-19",
        Title: "Alpha event",
        Category: "Learning",
        People: ["[[Jane]]"],
        Related: "[[People/Jane]]",
      },
      links: [{ link: "People/Jane" }],
      frontmatterLinks: [{ link: "Jane" }],
    }],
    ["Calendar/Bad.md", { frontmatter: { Date: "2026-99-99" }, links: [] }],
    ["People/Jane.md", { frontmatter: {}, links: [{ link: "Calendar/Alpha" }] }],
  ]);
  const vault = {
    getAbstractFileByPath: (path: string) => files.find((file) => file.path === path) ?? null,
    getMarkdownFiles: () => files,
  };
  const metadataCache = {
    getFileCache: (file: { path: string }) => caches.get(file.path) ?? null,
    getFirstLinkpathDest: (link: string) => {
      const normalized = link.endsWith(".md") ? link : `${link}.md`;
      const file = files.find((candidate) =>
        candidate.path === normalized || candidate.basename === link);
      return file ?? null;
    },
  };
  const profile = createProfile("Calendar");
  profile.id = "calendar";
  profile.properties = {
    category: "Category",
    end: "End",
    people: "People",
    project: "Project",
    related: "Related",
    start: "Date",
    title: "Title",
  };
  return { caches, files, metadataCache, profile, vault };
}

function testFile(path: string): TFile {
  const file = new TFile();
  file.path = path;
  file.basename = path.split("/").at(-1)?.replace(/\.md$/, "") ?? "";
  file.extension = "md";
  file.parent = { path: path.split("/").slice(0, -1).join("/") } as never;
  return file;
}

describe("CalendarIndex", () => {
  it("indexes mapped properties, links, and diagnostics once", () => {
    const { metadataCache, profile, vault } = fixture();
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);
    index.rebuild();
    const snapshot = index.snapshot();
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.events[0]).toMatchObject({
      title: "Alpha event",
      startDate: "2026-08-18",
      endDate: "2026-08-19",
      category: "Learning",
      editable: true,
    });
    expect(snapshot.events[0]?.context.people).toEqual([
      { label: "Jane", path: "People/Jane.md" },
    ]);
    expect(snapshot.events[0]?.context.links).toEqual([]);
    expect(snapshot.events[0]?.context.backlinks).toEqual([
      { label: "Jane", path: "People/Jane.md" },
    ]);
    expect(snapshot.diagnostics).toEqual([
      { code: "invalid-date", filePath: "Calendar/Bad.md", profileId: "calendar" },
    ]);
  });

  it("updates and removes one file without asking the Vault for every file", () => {
    const { files, metadataCache, profile, vault } = fixture();
    let scans = 0;
    vault.getMarkdownFiles = () => {
      scans += 1;
      return files;
    };
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);
    index.rebuild();
    expect(scans).toBe(1);
    index.update(files[0] as never);
    index.remove(files[1]?.path ?? "");
    expect(scans).toBe(1);
    expect(index.snapshot().diagnostics).toHaveLength(0);
  });

  it("uses the frontmatter written by a mutation before MetadataCache catches up", () => {
    const { files, metadataCache, profile, vault } = fixture();
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);
    index.rebuild();

    index.update(files[0] as never, {
      Date: "2026-08-25",
      Title: "Moved immediately",
    });

    expect(index.snapshot().events[0]).toMatchObject({
      startDate: "2026-08-25",
      title: "Moved immediately",
    });
  });

  it("matches a tag-constrained source with mutation frontmatter", () => {
    const { files, metadataCache, profile, vault } = fixture();
    profile.tag = "calendar";
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);

    index.update(files[0] as never, { Date: "2026-08-18", tags: ["calendar"] });

    expect(index.snapshot().events).toHaveLength(1);
  });

  it("refreshes linked titles when the target note changes", () => {
    const { caches, files, metadataCache, profile, vault } = fixture();
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);
    index.rebuild();
    caches.set("People/Jane.md", {
      frontmatter: { title: "Jane Doe" },
      links: [{ link: "Calendar/Alpha" }],
    });

    index.update(files[2] as never);

    expect(index.snapshot().events[0]?.context.people).toEqual([
      { label: "Jane Doe", path: "People/Jane.md" },
    ]);
  });

  it("rejects invalid explicit ends and spans longer than 370 days", () => {
    const { caches, files, metadataCache, profile, vault } = fixture();
    files.push(
      testFile("Calendar/Backward.md"),
      testFile("Calendar/Invalid-end.md"),
      testFile("Calendar/Too-long.md"),
    );
    caches.set("Calendar/Backward.md", {
      frontmatter: { Date: "2026-08-18", End: "2026-08-17" },
      links: [],
    });
    caches.set("Calendar/Invalid-end.md", {
      frontmatter: { Date: "2026-08-18", End: "invalid" },
      links: [],
    });
    caches.set("Calendar/Too-long.md", {
      frontmatter: { Date: "2026-01-01", End: "2027-01-06" },
      links: [],
    });
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);

    index.rebuild();

    expect(index.snapshot().diagnostics).toEqual(expect.arrayContaining([
      { code: "end-before-start", filePath: "Calendar/Backward.md", profileId: "calendar" },
      { code: "invalid-end", filePath: "Calendar/Invalid-end.md", profileId: "calendar" },
      { code: "event-too-long", filePath: "Calendar/Too-long.md", profileId: "calendar" },
    ]));
    expect(index.snapshot().events.map((item) => item.filePath)).not.toContain("Calendar/Invalid-end.md");
    expect(index.snapshot().events.map((item) => item.filePath)).not.toContain("Calendar/Too-long.md");
  });
});

describe("profile matching", () => {
  it("supports folder and tag constraints", () => {
    const profile = createProfile("Calendar");
    profile.tag = "work";
    expect(matchesProfile(
      { path: "Calendar/A.md" },
      { tags: [{ tag: "#work", position: {} as never }] },
      profile,
    )).toBe(true);
    expect(matchesProfile({ path: "Archive/A.md" }, { tags: [{ tag: "#work", position: {} as never }] }, profile)).toBe(false);
  });

  it("does not treat a root note with the folder name as part of the folder", () => {
    const profile = createProfile("Calendar");
    expect(matchesProfile({ path: "Calendar.md" }, { frontmatter: {} }, profile)).toBe(false);
    expect(matchesProfile({ path: "Calendar/A.md" }, { frontmatter: {} }, profile)).toBe(true);
  });

  it("maps property names case-insensitively", () => {
    expect(readField({ "Start Date": "2026-08-18" }, "start date")).toBe("2026-08-18");
  });

  it("prefers the most specific source and read-only on an exact overlap", () => {
    const broad = createProfile("inbox");
    broad.id = "broad";
    const generated = createProfile("Generated/Calendar");
    generated.id = "generated";
    generated.editable = false;
    const conflicting = createProfile("Generated/Calendar");
    conflicting.id = "writable-conflict";

    expect(selectProfile(
      { path: "Generated/Calendar/A.md" },
      { frontmatter: {} },
      [broad, conflicting, generated],
    )?.id).toBe("generated");
  });

  it("rechecks generated frontmatter against overlapping sources before creation", () => {
    const writable = createProfile("Calendar");
    writable.id = "writable";
    const readOnly = createProfile("Calendar");
    readOnly.id = "read-only";
    readOnly.editable = false;
    const frontmatter = eventFrontmatter(writable, {
      category: "Learning",
      date: "2026-08-18",
      title: "Program orientation",
    });
    const selected = selectProfileFromFrontmatter(
      { path: "Calendar/2026-08-18 Program orientation.md" },
      frontmatter,
      [writable, readOnly],
    );

    expect(selected?.id).toBe("read-only");
    expect(canCreateWithProfile(writable, selected)).toBe(false);
  });

  it("uses current frontmatter only for mutation ownership", () => {
    const profile = createProfile("Calendar");
    profile.tag = "calendar";

    expect(selectProfileFromFrontmatter(
      { path: "Calendar/Event.md" },
      { date: "2026-08-18", tags: [] },
      [profile],
    )).toBeUndefined();
  });

  it("keeps inline-tag-only matches read-only", () => {
    const { files, metadataCache, profile, vault } = fixture();
    profile.tag = "calendar";
    metadataCache.getFileCache = (file: { path: string }) => file.path === "Calendar/Alpha.md"
      ? {
          frontmatter: { Date: "2026-08-18" },
          links: [],
          tags: [{ tag: "#calendar" }],
        }
      : null;
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);

    index.update(files[0] as never);

    expect(index.snapshot().events[0]?.editable).toBe(false);
  });
});
