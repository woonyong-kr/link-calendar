import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const repository = new URL("../", import.meta.url);
const requiredAssets = [
  "docs/media/context-calendar-overview.png",
  "docs/media/context-calendar-context.png",
  "docs/media/context-calendar-demo.gif",
];

const readJson = async (path) => JSON.parse(await readFile(new URL(path, repository), "utf8"));
const [packageJson, manifest, media, readme] = await Promise.all([
  readJson("package.json"),
  readJson("manifest.json"),
  readJson("docs/release-media.json"),
  readFile(new URL("README.md", repository), "utf8"),
]);

const fail = (message) => {
  throw new Error(`release media contract: ${message}`);
};

const imageDimensions = (bytes, path) => {
  if (bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) {
    return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  fail(`${path} is not a PNG or GIF`);
};

if (packageJson.version !== manifest.version) fail("package and manifest versions differ");
if (media.version !== packageJson.version) fail("capture record does not match the build version");
if (media.renderedWith !== "production plugin CSS") fail("renderedWith must name the production renderer");
if (!/^\d{4}-\d{2}-\d{2}$/.test(media.capturedAt)) fail("capturedAt must be an ISO date");
if (media.publicSafeSample !== true) fail("captures must use public-safe sample content");

const records = new Map(media.assets.map((asset) => [asset.path, asset]));
if (records.size !== requiredAssets.length) fail("capture record must contain exactly the required assets");

for (const path of requiredAssets) {
  const record = records.get(path);
  if (!record) fail(`missing record for ${path}`);
  if (!readme.includes(`](${path})`)) fail(`README does not embed ${path}`);

  const bytes = await readFile(new URL(path, repository));
  const { width, height } = imageDimensions(bytes, path);
  if (width < 1200 || height < 700) fail(`${path} is too small for README inspection`);
  if (record.width !== width || record.height !== height) fail(`${path} dimensions are stale`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (record.sha256 !== sha256) fail(`${path} SHA-256 is stale`);
}

console.log(JSON.stringify({ status: "ok", version: media.version, assets: requiredAssets.length }));
