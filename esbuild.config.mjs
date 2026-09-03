import esbuild from "esbuild";

const production = process.argv[2] === "production";
const googleRelayUrl = process.env.LINK_CALENDAR_GOOGLE_RELAY_URL ?? "";
const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  define: {
    __LINK_CALENDAR_GOOGLE_RELAY_URL__: JSON.stringify(googleRelayUrl),
  },
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  logLevel: "info",
  minify: production,
  outfile: "main.js",
  platform: "browser",
  sourcemap: production ? false : "inline",
  target: "es2022",
  treeShaking: true,
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
