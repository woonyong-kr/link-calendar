import { TFile, TFolder } from "obsidian";
import { describe, expect, it } from "vitest";

import { CalendarIndex } from "../src/index";
import { createProfile } from "../src/model";

describe("large Vault indexing", () => {
  it("indexes 10,000 cached notes and keeps single-file updates incremental", () => {
    const files = Array.from({ length: 10_000 }, (_, index) => {
      const file = new TFile();
      file.basename = `Event ${String(index)}`;
      file.extension = "md";
      file.parent = { path: "Calendar" } as never;
      file.path = `Calendar/Event-${String(index)}.md`;
      return file;
    });
    const folder = new TFolder();
    folder.path = "Calendar";
    folder.name = "Calendar";
    folder.children = files;
    for (const file of files) file.parent = folder;
    const vault = { getFolderByPath: (path: string) => path === folder.path ? folder : null };
    const metadataCache = {
      getFileCache: () => ({ frontmatter: { date: "2026-08-18" }, links: [] }),
      getFirstLinkpathDest: () => null,
      resolvedLinks: {},
    };
    const profile = createProfile("Calendar");
    const index = new CalendarIndex(vault as never, metadataCache as never, [profile]);

    const buildStarted = performance.now();
    index.rebuild();
    expect(index.snapshot().events).toHaveLength(10_000);
    const buildElapsed = performance.now() - buildStarted;

    const updateStarted = performance.now();
    index.update(files[0] as never);
    const updateElapsed = performance.now() - updateStarted;

    expect(buildElapsed).toBeLessThan(2_000);
    expect(updateElapsed).toBeLessThan(150);
  });

  it("builds the automatic body timeline incrementally", async () => {
    const files = Array.from({ length: 5_000 }, (_, index) => {
      const file = new TFile();
      file.basename = `Project ${String(index)}`;
      file.extension = "md";
      file.path = `Wiki/Project-${String(index)}.md`;
      return file;
    });
    const filesByPath = new Map(files.map((file) => [file.path, file]));
    const vault = {
      cachedRead: async (file: TFile) =>
        `- 2026-08-01 → 2026-08-31 · [[${file.path.replace(/\.md$/u, "")}]]`,
      getFolderByPath: () => null,
      getMarkdownFiles: () => files,
    };
    const metadataCache = {
      getFileCache: (file: TFile) => ({
        frontmatter: {
          ended_on: "2026-08-31",
          started_on: "2026-08-01",
          title: file.basename,
        },
        links: [],
      }),
      getFirstLinkpathDest: (link: string) => {
        const path = link.endsWith(".md") ? link : `${link}.md`;
        return filesByPath.get(path) ?? null;
      },
    };
    const index = new CalendarIndex(vault as never, metadataCache as never, [], true);

    const buildStarted = performance.now();
    index.rebuild();
    await index.rebuildBodies();
    const buildElapsed = performance.now() - buildStarted;

    expect(index.snapshot().events.filter((event) => event.kind === "period")).toHaveLength(5_000);
    expect(buildElapsed).toBeLessThan(3_000);
  });
});
