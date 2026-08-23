# Contributing

## Quality gate

```bash
npm ci
npm run verify
```

Changes to date parsing, source capabilities, or file mutation require a regression test. Do not add network requests, credentials, telemetry, Vault-external paths, or direct filesystem writes. UI changes must be checked in Obsidian light and dark themes at desktop and narrow widths.

## Release contract

The version in `manifest.json`, `package.json`, and `versions.json` must match. A GitHub release tag uses the exact version without a `v` prefix and contains `main.js`, `manifest.json`, and `styles.css` as individual assets.
