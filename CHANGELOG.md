# Changelog

<!-- markdownlint-configure-file {
  "MD024": {
    "siblings_only": true
  }
} -->

All notable changes to `markdownlint-obsidian` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- OFM rules in files with frontmatter now report file-absolute line numbers,
  and their autofixes target the correct body line instead of the frontmatter
  delimiter. Previously OFM diagnostics and fixes used body-relative offsets
  while `FixUseCase` applied them to the full file, so `--fix` could edit the
  wrong line (or the frontmatter) whenever a document had frontmatter.
- An empty frontmatter block (`---\n---`) is now treated as present rather than
  as no frontmatter, so the delimiter lines are no longer linted as body and
  line offsets stay correct.
- `fix` / `fix-check` now rebuild the `BlockRefIndex` before the final pass
  after writes (using the in-memory writer for `--fix-check`), so cross-file
  block-link rules (OFM102) no longer report stale false positives/negatives
  after OFM104 rewrites a block id.
- Per-rule `severity` overrides from config are now honoured when emitting
  diagnostics (affecting formatter level and CLI exit code).
- `ConfigLoader` now parses `.yaml` / `.yml` config files as YAML, reports a
  clear `OFM901` error (with the file path) for malformed config files instead
  of silently ignoring them, loads an explicit `--config <file>` of any
  basename, deep-merges nested option blocks (`callouts`, `embeds`,
  `frontmatter`, etc.) so partial overrides keep their defaults, and supports
  `--config-pointer` JSON Pointer selection.
- CLI now honours `outputFormatter` and `fix` from config when the matching
  flag is omitted, makes `--no-globs` actually ignore config globs, surfaces
  the underlying config-load error, and drops the unimplemented `--format`
  flag.
- Parser/rule boundary fixes: same-file wikilinks (`[[#Heading]]`,
  `[[#^block]]`) are now represented and validated; multi-backtick inline code
  spans are recognised so OFM syntax inside them is not extracted; Obsidian
  comments inside fenced/inline code are skipped; empty highlights (`====`) are
  detected by OFM124; `callouts.caseSensitive` is honoured; invalid block-id
  candidates reach OFM100; and ISO date validation rejects impossible calendar
  dates such as `2026-02-31`.

### Changed

- GitHub Action now sets `error-count`, `warning-count`, and `sarif-path`
  outputs and implements `fail-on-warnings` (warnings fail the step only when
  enabled). The action bundle is built as ESM and CI verifies it is committed
  via `git diff --exit-code action/dist/main.js`.
- `scripts/prepare-publish.mjs` rewrites scoped workspace dependencies as npm
  aliases (`npm:@scope/pkg@^x.y.z`) so the published CLI's runtime imports keep
  resolving. Action release tags advance `v1` / `v1.x` semver tags from CLI
  releases; docs reference `@v1`.

## [1.1.0] - 2026-05-04

### Added

- `wikilinks.resolveMode` config option (`"path-relative"` default,
  `"obsidian-fuzzy"` opt-in). The fuzzy mode adds a path-suffix step to
  wikilink resolution, mirroring Obsidian's own algorithm so vaults that
  mix vault-absolute (`[[raw/upnote/Note]]`) and folder-implicit
  (`[[sources/foo]]`) link styles resolve correctly without splitting them
  across two lint runs. Multiple suffix matches are reported as ambiguous
  (OFM004) instead of arbitrary picking. Closes #27.

### Fixed

- `StandardRuleAdapter` no longer crashes with
  `OFM901: Fix.deleteCount must be >= 0` when an upstream markdownlint
  rule (MD012, MD053) emits `fixInfo.deleteCount = -1` — the markdownlint
  sentinel for "delete the entire line". Our column-based fix pipeline
  cannot represent line removal, so the adapter now surfaces the
  underlying violation without an attached fix instead of throwing
  through `LintUseCase`. Closes #28.

### Tests

- Added integration regression test (`tests/integration/regression/issue-26-md028-callout.test.ts`)
  exercising the full lint pipeline against a multi-paragraph callout — pins
  the existing default-disable wiring so a future change to `OFM_MD_CONFLICTS`
  or `extractMdConfig` cannot silently re-introduce the issue #26 false-positive.

## [1.0.2] - 2026-04-18

### Fixed

- MD028 (`no-blanks-blockquote`) added to `OFM_MD_CONFLICTS` and disabled by
  default. Blank `>` lines between paragraphs inside OFM callouts are required
  syntax — Obsidian needs them to keep paragraphs inside the callout. MD028
  produced a false positive on every multi-paragraph callout.

### Changed

- Development toolchain migrated to Bun 1.1+. CI, tests, and local dev scripts
  now run through `bun`. Node 20+ remains a supported runtime for the published
  CLI and for programmatic consumers.
- Replaced Vitest with `bun test`. All test imports now come from `bun:test`.
- Dropped `tsx` dev dependency; Bun executes TypeScript entry points natively.
- Docker build stage moved to `oven/bun:1-alpine`; runtime stage stays on
  `node:20-alpine` so the Docker image remains Node-compatible.
- Published `bin` field now points at `dist/bin.mjs` (Node-compatible shebang).
  Works with both `npx markdownlint-obsidian` (Node) and
  `bunx markdownlint-obsidian` (Bun).
- Fixed a pre-existing bug where `dist/bin.mjs` was not generated by the build
  step; it is now produced by `scripts/gen-dist-bin.mjs` as a postbuild step.

### Removed

- `vitest`, `@vitest/coverage-v8`, `tsx` from `devDependencies`.
- `package-lock.json` (replaced by `bun.lock`).
- `vitest.config.ts` (replaced by `bunfig.toml`).

## [1.0.0] - 2026-04-12

### Added

- **Phase 10 — Custom Rules API**
  - `markdownlint-obsidian/api` subpath exports every type and factory needed
    to author a custom rule: `OFMRule`, `RuleParams`, `OnErrorCallback`,
    `LintError`, `LintResult`, `Fix`, parse result VOs, config interfaces,
    and vault types.
  - `markdownlint-obsidian/rules` subpath re-exports all built-in rule
    constants for composition and wrapping.
  - `customRules` config key dynamically imports each listed module path and
    registers the exported rules alongside built-ins.
  - Load failures emit `OFM905` to stderr and never crash the run; name
    collisions emit `OFM904` and skip the duplicate.
  - Two worked examples under `examples/rules/`: `require-frontmatter-status`
    (CUSTOM001) and `banned-wikilink-targets` (CUSTOM002), both with
    integration-test coverage.
  - `docs/guides/custom-rules.md` — full authoring walkthrough.
  - `docs/guides/public-api.md` — subpath reference and stability guarantee.

### Changed

- `package.json` version bumped to `1.0.0`.
- `package.json` gains `exports` field with `.`, `./api`, and `./rules`
  subpaths and declares `examples/` in `files`.

## [0.8.0] - 2026-04-11

### Added

- **Phase 8 — CI delivery**
  - JUnit XML formatter (`--output-formatter junit`) for Jenkins, GitLab CI,
    and Azure Pipelines test dashboards.
  - SARIF 2.1.0 formatter (`--output-formatter sarif`) for GitHub code
    scanning, with deduplicated rule metadata.
  - GitHub Action scaffold at `action/` (JavaScript action, Node 20) with
    pre-built bundle at `action/dist/main.js` and a CI drift-check that
    fails PRs editing `action/src/` without rebuilding.
  - `.pre-commit-hooks.yaml` manifest for the `pre-commit` framework.
  - Multi-stage `docker/Dockerfile` publishing to
    `ghcr.io/alisonaquinas/markdownlint-obsidian` on GitHub release.
  - `docs/guides/ci-integration.md` with GitHub Action, pre-commit, and
    Docker recipes.

### Changed

- `package.json` version bumped to `0.8.0`; `files` array, `repository`,
  `homepage`, `bugs`, and `keywords` populated for npm publishing.
- CLI `--version` now reports `0.8.0`.

## [0.7.0]

### Added

- **Phase 7 — Standard markdownlint integration**
  - `MarkdownLintAdapter` with per-file memoization around upstream
    `markdownlint`.
  - `StandardRuleAdapter` registering MD001..MD049 alongside OFM rules.
  - OFM-conflicting standard rules disabled by default (see
    `docs/rules/standard-md/`).
  - Deep-merge of the `rules` block so user overrides no longer drop
    defaults.

## [0.6.0]

### Added

- **Phase 6 — Block references and highlights**
  - `BlockRefIndexBuilder` and a new runtime block-ref index passed to
    rules via the lint context.
  - OFM rules covering block-reference resolution and `==highlight==`
    syntax.

## [0.5.0]

### Added

- **Phase 5 — Embeds and callouts**
  - `![[wikilink]]` embed validation.
  - Callout admonition parsing and rule coverage.

## [0.4.0]

### Added

- **Phase 4 — Wikilinks**
  - Wikilink parser, exact-match resolution strategy, and vault bootstrap
    (`VaultBootstrap`, `NodeFsVaultDetector`, `FileIndexBuilder`).
  - OFM001..OFM007 no-broken-wikilinks family.

## [0.3.0]

### Added

- **Phase 3 — Frontmatter and tags**
  - Frontmatter YAML parsing via `gray-matter`.
  - Tag syntax rules.

## [0.2.0]

### Added

- **Phase 2 — Parser layer**
  - `MarkdownItParser` wrapping `markdown-it` with a stable AST contract.
  - `LintUseCase` application service.

## [0.1.0]

### Added

- **Phase 1 — Scaffolding**
  - Repository layout, tsconfig/eslint/prettier baseline.
  - DDD/BDD directory scaffolding under `src/` and `tests/`.
  - CLI entrypoint at `bin/markdownlint-obsidian.js`.
  - Architecture policy, roadmap, and design spec under `docs/`.

[0.8.0]: https://github.com/alisonaquinas/markdownlint-obsidian/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/alisonaquinas/markdownlint-obsidian/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/alisonaquinas/markdownlint-obsidian/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/alisonaquinas/markdownlint-obsidian/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/alisonaquinas/markdownlint-obsidian/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/alisonaquinas/markdownlint-obsidian/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/alisonaquinas/markdownlint-obsidian/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/alisonaquinas/markdownlint-obsidian/releases/tag/v0.1.0
