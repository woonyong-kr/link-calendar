import { describe, expect, it } from "vitest";

import { extractFrontmatterTemporal, extractMarkdownTemporal } from "../src/temporal";

describe("automatic temporal extraction", () => {
  it("classifies explicit schedule, period, history, deadline, and document dates", () => {
    const candidates = extractFrontmatterTemporal("Career/Application.md", "Application", {
      created: "2026-08-01",
      deadline: "2026-08-31",
      ended_on: "2026-08-27",
      history: [{ at: "2026-08-21T16:30:00+09:00", event: "Interview" }],
      scheduled_for: "2026-08-21T16:30:00+09:00",
      started_on: "2026-08-02",
      title: "KRAFTON application",
      updated: "2026-08-28",
    });

    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "event", startDate: "2026-08-21" }),
      expect.objectContaining({ kind: "period", startDate: "2026-08-02", endDate: "2026-08-27" }),
      expect.objectContaining({ kind: "history", startDate: "2026-08-21", title: "Interview" }),
      expect.objectContaining({ kind: "deadline", startDate: "2026-08-31" }),
      expect.objectContaining({ kind: "document", startDate: "2026-08-01" }),
      expect.objectContaining({ kind: "document", startDate: "2026-08-28" }),
    ]));
  });

  it("extracts structured body dates while ignoring frontmatter, code, quotes, and URLs", () => {
    const candidates = extractMarkdownTemporal(
      "People/Minjeong.md",
      "Minjeong",
      `---
updated: 2026-08-30
---
## 날짜별 이력

- 2026-08-04 → 2026-08-17 · [[Projects/Kubernetes|Kubernetes 장애 복구]]
- 2026-08-24 → 진행 중 · [[Interview/Data Foundation]]
- 2026-09-02 예정 · [[Calendar/Final interview|최종 면접 동행]]
- 2026-09-10 마감 · [[Career/Application]]
- 2026-08-25 · 결과 확인

\`2026-01-01\`
> 2026-02-02 인용
https://example.com/2026-03-03
\`\`\`
2026-04-04
\`\`\`
<!-- 2026-05-05 -->`,
      "2026-09-01",
    );

    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "period",
        linkPath: "Projects/Kubernetes",
        startDate: "2026-08-04",
        endDate: "2026-08-17",
      }),
      expect.objectContaining({
        kind: "period",
        ongoing: true,
        startDate: "2026-08-24",
        endDate: "2026-09-01",
      }),
      expect.objectContaining({ kind: "event", startDate: "2026-09-02" }),
      expect.objectContaining({ kind: "deadline", startDate: "2026-09-10" }),
      expect.objectContaining({ kind: "history", startDate: "2026-08-25" }),
    ]));
    expect(candidates.map((candidate) => candidate.startDate)).not.toEqual(expect.arrayContaining([
      "2026-01-01",
      "2026-02-02",
      "2026-03-03",
      "2026-04-04",
      "2026-05-05",
      "2026-08-30",
    ]));
  });

  it("keeps unstructured prose dates in the document-date layer", () => {
    const candidates = extractMarkdownTemporal(
      "Notes/Decision.md",
      "Decision",
      "2026-08-25에 원본을 다시 검토했다.",
    );

    expect(candidates).toEqual([
      expect.objectContaining({ kind: "document", startDate: "2026-08-25" }),
    ]);
  });
});
