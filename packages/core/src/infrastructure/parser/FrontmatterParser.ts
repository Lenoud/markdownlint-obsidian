/**
 * Purpose: Parses YAML/TOML frontmatter from Markdown source strings using gray-matter.
 *
 * Provides: {@link parseFrontmatter}, {@link FrontmatterParseOutput}
 *
 * Role in system: Serves as the first stage of the infrastructure parsing pipeline,
 * extracting structured frontmatter data and computing the body start line so downstream
 * parsers and OFM extractors operate on the correct line offsets.
 *
 * @module infrastructure/parser/FrontmatterParser
 */
import matter from "gray-matter";

export interface FrontmatterParseOutput {
  readonly data: Readonly<Record<string, unknown>>;
  readonly rawFrontmatter: string | null;
  /** Markdown body with any frontmatter delimiter block removed. */
  readonly body: string;
  /** 1-based line number where the body begins (after closing `---`). */
  readonly bodyStartLine: number;
}

/**
 * Parse YAML/TOML frontmatter from a Markdown source string.
 * Throws an Error prefixed with `OFM902:` when the frontmatter cannot be
 * parsed; callers translate this into a LintError.
 */
export function parseFrontmatter(source: string): FrontmatterParseOutput {
  try {
    return parseInternal(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OFM902: frontmatter parse error — ${message}`);
  }
}

function parseInternal(source: string): FrontmatterParseOutput {
  // gray-matter caches parsed results by content string; { cache: false } disables this.
  // Without it, OFM902 (invalid-frontmatter) fails to fire when the same malformed content
  // is parsed twice in the same process (e.g., in test suites or repeated linting).
  // The cast is required because gray-matter's TypeScript types do not expose this option.
  const options = { cache: false } as unknown as Parameters<typeof matter>[1];
  const parsed = matter({ content: source }, options);
  const data = (parsed.data ?? {}) as Record<string, unknown>;
  const hasFrontmatter = hasDelimitedYamlFrontmatter(source);
  const rawFrontmatter = hasFrontmatter ? normalizeMatter(parsed.matter) : null;
  const body = hasFrontmatter ? parsed.content : source;
  const bodyStartLine = hasFrontmatter ? sourceLineCountBeforeBody(source, body) + 1 : 1;
  return { data, rawFrontmatter, body, bodyStartLine };
}

function normalizeMatter(rawMatter: string | undefined): string | null {
  const value = rawMatter ?? "";
  // gray-matter's `matter` field is typically prefixed with a leading newline.
  return value.startsWith("\n") ? value.slice(1) : value;
}

function hasDelimitedYamlFrontmatter(source: string): boolean {
  return /^---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/.test(source);
}

function sourceLineCountBeforeBody(source: string, body: string): number {
  const bodyStartOffset = source.length - body.length;
  if (bodyStartOffset <= 0) return 0;
  const prefix = source.slice(0, bodyStartOffset);
  const parts = prefix.split(/\r?\n/);
  return parts.at(-1) === "" ? parts.length - 1 : parts.length;
}
