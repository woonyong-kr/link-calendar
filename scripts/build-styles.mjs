import { readFile, writeFile } from "node:fs/promises";

const sources = [
  "src/styles/tokens.css",
  "src/styles/shell.css",
  "src/styles/month-grid.css",
  "src/styles/event-detail.css",
  "src/styles/supporting.css",
];

const parts = await Promise.all(sources.map((path) => readFile(path, "utf8")));
const components = parts.slice(1).join("\n");
const forbidden = [
  [/(?:^|[^-])#[0-9a-f]{3,8}\b/iu, "literal color"],
  [/\brgba?\(/u, "literal rgb color"],
  [/\.theme-(?:dark|light)\b/u, "appearance-specific selector"],
  [/\bcupertino\b/iu, "theme-specific selector"],
  [/var\(--(?!cc-)/u, "unscoped design token"],
  [/!important\b/u, "important override"],
];

for (const [pattern, label] of forbidden) {
  if (pattern.test(components)) throw new Error(`Component CSS contains ${label}`);
}

if (/(?:^|\})\s*(?:body|html|:root)\b/mu.test(parts[0])) {
  throw new Error("Token CSS contains a global root selector");
}

if (!parts[0].includes("THIRD_PARTY_NOTICES.md")) {
  throw new Error("Token CSS must retain third-party attribution");
}

if (/var\(--(?!cc-)/u.test(parts[0])) {
  throw new Error("Token CSS contains an external design-token dependency");
}

for (const [index, part] of parts.entries()) {
  const opens = [...part.matchAll(/\{/gu)].length;
  const closes = [...part.matchAll(/\}/gu)].length;
  if (opens !== closes) {
    throw new Error(`${sources[index]} has unbalanced braces: ${opens} open, ${closes} close`);
  }
}

await writeFile("styles.css", `${parts.map((part) => part.trim()).join("\n\n")}\n`, "utf8");
