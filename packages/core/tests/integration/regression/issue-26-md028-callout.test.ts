/**
 * Regression test for GitHub issue #26.
 *
 * MD028 (`no-blanks-blockquote`) was firing on every Obsidian callout
 * despite being shipped disabled-by-default in the Phase-7 conflict list.
 * The unit-level tests (`tests/unit/config/defaults.phase7.test.ts`) only
 * assert the *shape* of {@link DEFAULT_CONFIG.rules.MD028} — they do not
 * exercise the wiring all the way through {@link extractMdConfig} →
 * {@link MarkdownLintAdapter}. This integration test runs the full
 * pipeline against both the canonical OFM multi-paragraph callout separator
 * and a callout-shaped blockquote pattern that **does** trigger upstream
 * markdownlint's MD028 (a truly blank line separating two blockquoted
 * regions). Together they pin the expected behaviour: zero MD028 violations
 * under defaults, one MD028 violation when the user explicitly re-enables
 * the rule.
 *
 * The repro intentionally uses a plain blank-line separator rather than
 * the `>` blank-line variant from the issue text — upstream markdownlint
 * only flags the former, so it is the only variant capable of regression-
 * breaking the default-disable wiring.
 *
 * Issue URL: https://github.com/alisonaquinas/markdownlint-obsidian/issues/26
 *
 * @module tests/integration/regression/issue-26-md028-callout.test
 */
import { describe, it, expect } from "bun:test";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import { lint } from "../../../src/engine/index.js";

const CANONICAL_MULTI_PARAGRAPH_CALLOUT = `> [!info] Test callout
> Line one.
>
> Line two.
`;

const MD028_REPRO_CALLOUT = `> [!info] Test callout
> Line one.

> Line two.
`;

async function makeTmpVaultWith(content: string, configBody?: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ofm-issue26-"));
  await fs.mkdir(path.join(dir, ".obsidian"), { recursive: true });
  await fs.writeFile(path.join(dir, "note.md"), content);
  if (configBody !== undefined) {
    await fs.writeFile(path.join(dir, ".obsidian-linter.jsonc"), configBody);
  }
  return dir;
}

describe("regression: issue #26 — MD028 false-positive on OFM callouts", () => {
  it("does not fire on a canonical multi-paragraph callout under default config", async () => {
    const tmpDir = await makeTmpVaultWith(CANONICAL_MULTI_PARAGRAPH_CALLOUT);
    try {
      const results = await lint({ globs: ["**/*.md"], cwd: tmpDir });
      expect(results).toHaveLength(1);
      const md028 = results[0]!.errors.filter((e) => e.ruleCode === "MD028");
      expect(md028).toEqual([]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not surface the upstream MD028 repro under default config", async () => {
    const tmpDir = await makeTmpVaultWith(MD028_REPRO_CALLOUT);
    try {
      const results = await lint({ globs: ["**/*.md"], cwd: tmpDir });
      expect(results).toHaveLength(1);
      const md028 = results[0]!.errors.filter((e) => e.ruleCode === "MD028");
      expect(md028).toEqual([]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("fires when the user explicitly re-enables MD028", async () => {
    const userConfig = JSON.stringify({ rules: { MD028: { enabled: true } } });
    const tmpDir = await makeTmpVaultWith(MD028_REPRO_CALLOUT, userConfig);
    try {
      const results = await lint({ globs: ["**/*.md"], cwd: tmpDir });
      expect(results).toHaveLength(1);
      const md028 = results[0]!.errors.filter((e) => e.ruleCode === "MD028");
      expect(md028).toHaveLength(1);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
