# Security policy

## Supported versions

Security fixes target the latest published release.

## Data boundary

Link Calendar Navigator runs locally inside Obsidian. It does not use network APIs, telemetry, remote AI, accounts, or a plugin-owned event database. It reads only explicitly configured folders. New sources are read-only by default; writes require an explicit per-source setting and use Obsidian's Vault API.

## Reporting

Do not include private Vault content in a public issue. Report reproducible non-sensitive bugs through [GitHub Issues](https://github.com/woonyong-kr/link-calendar/issues/new/choose). For a vulnerability that cannot be described safely in public, use GitHub's private vulnerability reporting for this repository.
