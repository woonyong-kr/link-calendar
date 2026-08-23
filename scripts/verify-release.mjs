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

const { stdout: trackedBundle } = await run("git", ["ls-files", "main.js"]);
if (trackedBundle.trim()) errors.push("main.js must be a release asset, not a tracked source file");

if (manifest.id !== "context-calendar") errors.push("manifest id must be context-calendar");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push("manifest version must use exact x.y.z format");
if (manifest.version !== packageJson.version) errors.push("manifest/package versions differ");
if (versions[manifest.version] !== manifest.minAppVersion) errors.push("versions.json does not match manifest");
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
]) {
  if (source.some((content) => forbidden.test(content))) {
    errors.push(`source contains forbidden capability: ${String(forbidden)}`);
  }
}

if (errors.length) throw new Error(errors.join("\n"));
console.log(JSON.stringify({ status: "ok", id: manifest.id, version: manifest.version }));
