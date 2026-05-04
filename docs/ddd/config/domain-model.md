# Config Domain Model

## Value Objects

### LinterConfig

Immutable. The fully merged, validated configuration for one LintRun.

```typescript
interface LinterConfig {
  readonly vaultRoot: string | null;
  readonly resolve: boolean;
  readonly wikilinks: WikilinkConfig;
  readonly callouts: CalloutConfig;
  readonly embeds: EmbedConfig;
  readonly frontmatter: FrontmatterConfig;
  readonly tags: TagConfig;
  readonly blockRefs: BlockRefConfig;
  readonly highlights: HighlightConfig;
  readonly comments: CommentConfig;
  readonly rules: Readonly<Record<string, RuleConfig>>;
  readonly customRules: readonly string[];
  readonly globs: readonly string[];
  readonly ignores: readonly string[];
  readonly fix: boolean;
  readonly outputFormatter: string;
}
```

### WikilinkConfig

Controls alias handling, case sensitivity, and the vault-index resolution mode
used by OFM001, OFM004, OFM005, and other wikilink-aware rules.

```typescript
interface WikilinkConfig {
  readonly caseSensitive: boolean;
  readonly allowAlias: boolean;
  readonly resolveMode: "path-relative" | "obsidian-fuzzy";
}
```

`path-relative` is the default and keeps exact path, case-insensitive path, and
basename matching. `obsidian-fuzzy` adds a path-suffix step for path-like targets
before basename matching, so `[[sources/foo]]` can resolve to
`wiki/sources/foo.md` while bare links like `[[foo]]` still use basename
resolution.

### RuleConfig

Per-rule enable/disable and options.

```typescript
interface RuleConfig {
  readonly enabled: boolean;
  readonly severity?: "error" | "warning";
  readonly options?: Readonly<Record<string, unknown>>;
}
```

## Cascade Logic

Config files are discovered by walking from each file's directory up to vault root.
Closer files take precedence. Precedence order (high → low):

1. CLI `--config` flag
2. `.markdownlint-cli2.jsonc/yaml/cjs/mjs`
3. `.obsidian-linter.jsonc/yaml`
4. `.markdownlint.jsonc/yaml`
5. `package.json#/markdownlint`
6. Built-in defaults
