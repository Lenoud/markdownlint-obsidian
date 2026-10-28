# Changelog

<!-- markdownlint-configure-file {
  "MD013": false,
  "MD024": {
    "siblings_only": true
  }
} -->

## [1.2.0](https://github.com/Lenoud/markdownlint-obsidian/compare/markdownlint-obsidianv1.1.0...markdownlint-obsidianv1.2.0) (2026-10-28)


### Features

* **action,release:** outputs, fail-on-warnings, dist drift check, and publish fixes ([ce6f2d9](https://github.com/Lenoud/markdownlint-obsidian/commit/ce6f2d99a6e3c16367256ac11540720c3499a4bb))
* **wikilinks:** obsidian-fuzzy resolveMode for mixed-namespace vaults ([#27](https://github.com/Lenoud/markdownlint-obsidian/issues/27)) ([05b35cd](https://github.com/Lenoud/markdownlint-obsidian/commit/05b35cd1467b5b9056e4fed411b8026125096b58))
* **wikilinks:** obsidian-fuzzy resolveMode for mixed-namespace vaults ([#27](https://github.com/Lenoud/markdownlint-obsidian/issues/27)) ([89d45ad](https://github.com/Lenoud/markdownlint-obsidian/commit/89d45ad98c58ab40c7e16cb431e8c9f00b4c66b8))


### Bug Fixes

* **config,cli:** real YAML parsing, explicit config files, deep merge, and honoured CLI/config options ([3ab2580](https://github.com/Lenoud/markdownlint-obsidian/commit/3ab258011e1f2172289944659677cdd5b3a7325a))
* **core:** correct frontmatter line offsets, empty frontmatter, stale block-ref index, and severity overrides ([7d0390a](https://github.com/Lenoud/markdownlint-obsidian/commit/7d0390ae989018d8b7b3f817df0ea5764d5b3388))
* disable MD028 by default — OFM callout multi-paragraph syntax requires blank blockquote lines ([cb5cd6b](https://github.com/Lenoud/markdownlint-obsidian/commit/cb5cd6b19899bba9377dcb99d2b196f05fd5ba23))
* disable MD028 by default (OFM callout multi-paragraph conflict) ([c6c1a09](https://github.com/Lenoud/markdownlint-obsidian/commit/c6c1a09c3c92e340cdc4ed82bf86f3408b6634ae))
* disable MD028 by default (OFM callout multi-paragraph conflict) ([c6c1a09](https://github.com/Lenoud/markdownlint-obsidian/commit/c6c1a09c3c92e340cdc4ed82bf86f3408b6634ae))
* **docs:** compact [@module](https://github.com/module) header to stay under max-lines limit ([497a279](https://github.com/Lenoud/markdownlint-obsidian/commit/497a27941381e69c8e3abb2b80fc989677d9ceb5))
* **parser,rules:** handle same-file links, code spans, comments, highlights, callout case, block ids, and ISO dates ([4353c64](https://github.com/Lenoud/markdownlint-obsidian/commit/4353c649baecd2017294d1ae0879b7d850dadb4c))
* **standard:** handle markdownlint deleteCount=-1 sentinel without crashing ([#28](https://github.com/Lenoud/markdownlint-obsidian/issues/28)) ([bf843cb](https://github.com/Lenoud/markdownlint-obsidian/commit/bf843cb374f2356e6d9f01175763ae308f0092dd))
* **standard:** handle markdownlint deleteCount=-1 sentinel without crashing ([#28](https://github.com/Lenoud/markdownlint-obsidian/issues/28)) ([27f845e](https://github.com/Lenoud/markdownlint-obsidian/commit/27f845e4f75dfd4209ccd3e0e0f4d827966df15d))

## [1.1.0](https://github.com/alisonaquinas/markdownlint-obsidian/compare/markdownlint-obsidianv1.0.2...markdownlint-obsidianv1.1.0) (2026-05-04)

### Features

* add `wikilinks.resolveMode = "obsidian-fuzzy"` for mixed-namespace vaults ([89d45ad](https://github.com/alisonaquinas/markdownlint-obsidian/commit/89d45ad))

### Bug Fixes

* handle markdownlint `deleteCount = -1` sentinel without crashing ([27f845e](https://github.com/alisonaquinas/markdownlint-obsidian/commit/27f845e))

## [1.0.2](https://github.com/alisonaquinas/markdownlint-obsidian/compare/markdownlint-obsidianv1.0.1...markdownlint-obsidianv1.0.2) (2026-04-18)

### Bug Fixes

* disable MD028 by default — OFM callout multi-paragraph syntax requires blank blockquote lines ([cb5cd6b](https://github.com/alisonaquinas/markdownlint-obsidian/commit/cb5cd6b19899bba9377dcb99d2b196f05fd5ba23))
* disable MD028 by default (OFM callout multi-paragraph conflict) ([c6c1a09](https://github.com/alisonaquinas/markdownlint-obsidian/commit/c6c1a09c3c92e340cdc4ed82bf86f3408b6634ae))
* disable MD028 by default (OFM callout multi-paragraph conflict) ([c6c1a09](https://github.com/alisonaquinas/markdownlint-obsidian/commit/c6c1a09c3c92e340cdc4ed82bf86f3408b6634ae))

## [1.0.1](https://github.com/alisonaquinas/markdownlint-obsidian/compare/markdownlint-obsidianv1.0.0...markdownlint-obsidianv1.0.1) (2026-04-14)

### Bug Fixes

* **docs:** compact [@module](https://github.com/module) header to stay under max-lines limit ([497a279](https://github.com/alisonaquinas/markdownlint-obsidian/commit/497a27941381e69c8e3abb2b80fc989677d9ceb5))
