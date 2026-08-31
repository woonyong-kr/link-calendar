import { readFile, readdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const versions = JSON.parse(await readFile("versions.json", "utf8"));
const errors = [];
const sourceFiles = (await readdir("src")).filter((file) => file.endsWith(".ts"));
const source = await Promise.all(sourceFiles.map((file) => readFile(`src/${file}`, "utf8")));
const publicDocs = await Promise.all(
  ["README.md", "CHANGELOG.md", "CONTRIBUTING.md"].map((file) => readFile(file, "utf8")),
);
const styles = await readFile("styles.css", "utf8");

const { stdout: trackedBundle } = await run("git", ["ls-files", "main.js"]);
if (trackedBundle.trim()) errors.push("main.js must be a release asset, not a tracked source file");

if (manifest.id !== "link-calendar") errors.push("manifest id must be link-calendar");
if (manifest.name !== "Link Calendar Navigator") {
  errors.push("manifest name must be Link Calendar Navigator");
}
if (packageJson.name !== "link-calendar") errors.push("package name must be link-calendar");
if (!packageJson.repository?.url?.endsWith("woonyong-kr/link-calendar.git")) {
  errors.push("package repository must be woonyong-kr/link-calendar");
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push("manifest version must use exact x.y.z format");
if (manifest.version !== packageJson.version) errors.push("manifest/package versions differ");
if (versions[manifest.version] !== manifest.minAppVersion) errors.push("versions.json does not match manifest");
if (manifest.minAppVersion !== "1.13.0") errors.push("declarative settings require minAppVersion 1.13.0");
if (manifest.description.length > 250 || !manifest.description.endsWith(".")) {
  errors.push("manifest description must be at most 250 characters and end with a period");
}
for (const key of ["name", "description", "author", "authorUrl", "minAppVersion"]) {
  if (!manifest[key]) errors.push(`manifest is missing ${key}`);
}
for (const file of ["main.js", "manifest.json", "styles.css"]) {
  if ((await stat(file)).size === 0) errors.push(`${file} is empty`);
}
if ((await stat("main.js")).size > 1_000_000) errors.push("main.js exceeds 1 MB");
if (publicDocs.some((content) => content.includes("\\x60"))) {
  errors.push("public documentation contains escaped backtick literals");
}
for (const forbidden of [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /require\(["'](?:fs|child_process|http|https)["']\)/,
  /\.style\./,
  /setAttribute\(["']style["']/,
  /\bgetMarkdownFiles\s*\(/,
  /\bgetFiles\s*\(/,
  /instanceof\s+InputEvent/,
  /as\s+InputEvent/,
]) {
  if (source.some((content) => forbidden.test(content))) {
    errors.push(`source contains forbidden capability: ${String(forbidden)}`);
  }
}
if (!source.some((content) => content.includes("getSettingDefinitions()"))) {
  errors.push("settings must use the declarative settings API");
}
if (!source.some((content) => content.includes('VIEW_TYPE = "link-calendar-view"'))) {
  errors.push("view type must use the link-calendar namespace");
}
if (source.some((content) => content.includes('VIEW_TYPE = "context-calendar-view"'))) {
  errors.push("legacy context-calendar view type would collide during migration");
}
if (source.some((content) => content.includes('registerMarkdownCodeBlockProcessor("context-calendar"'))) {
  errors.push("legacy context-calendar code block would collide during migration");
}
if (styles.includes("!important")) errors.push("styles.css must not use !important");
for (const removedSelector of ["link-calendar__preview", "link-calendar__properties", "link-calendar__relation"]) {
  if (styles.includes(removedSelector)) errors.push(`styles contain removed UI: ${removedSelector}`);
}
if (source.some((content) => content.includes('setIcon(link, "arrow-up-right")'))) {
  errors.push("agenda links must use the visible note title, not an arrow icon");
}

if (errors.length) throw new Error(errors.join("\n"));
console.log(JSON.stringify({ status: "ok", id: manifest.id, version: manifest.version }));
