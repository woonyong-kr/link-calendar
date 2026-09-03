import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      obsidian: new URL("./tests/obsidian-runtime.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/dom-setup.ts"],
    coverage: {
      exclude: ["src/main.ts", "src/settings.ts", "src/view.ts"],
      include: [
        "src/model.ts",
        "src/index.ts",
        "src/i18n.ts",
        "src/google-auth.ts",
        "src/google-calendar.ts",
        "src/policy.ts",
        "src/presentation.ts",
      ],
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
