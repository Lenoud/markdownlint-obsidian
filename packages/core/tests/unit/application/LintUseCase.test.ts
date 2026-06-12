/**
 * Unit tests for {@link runLint}.
 *
 * @module tests/unit/application/LintUseCase.test
 */
import { describe, it, expect } from "bun:test";
import { runLint } from "../../../src/application/LintUseCase.js";
import { DEFAULT_CONFIG } from "../../../src/infrastructure/config/defaults.js";
import { makeRuleRegistry } from "../../../src/domain/linting/RuleRegistry.js";
import { makeMarkdownItParser } from "../../../src/infrastructure/parser/MarkdownItParser.js";
import type { FileExistenceChecker } from "../../../src/domain/fs/FileExistenceChecker.js";
import type { OFMRule } from "../../../src/domain/linting/OFMRule.js";
import { makeFix } from "../../../src/domain/linting/Fix.js";

const stubReadFile = async (): Promise<string> => "# hi\n";
const stubFsCheck: FileExistenceChecker = { exists: async () => false };

const bodyRule: OFMRule = {
  names: ["TEST001", "body-rule"],
  description: "test body-relative rule",
  tags: ["test"],
  severity: "warning",
  fixable: true,
  run(_params, onError) {
    onError({
      line: 1,
      column: 1,
      message: "body-relative violation",
      fix: makeFix({ lineNumber: 1, editColumn: 1, deleteCount: 0, insertText: "fixed " }),
    });
  },
};

const frontmatterRule: OFMRule = {
  names: ["TEST002", "frontmatter-rule"],
  description: "test file-relative rule",
  tags: ["frontmatter"],
  severity: "warning",
  fixable: false,
  run(_params, onError) {
    onError({ line: 1, column: 1, message: "frontmatter violation" });
  },
};

describe("LintUseCase", () => {
  it("returns empty results for empty file list", async () => {
    const registry = makeRuleRegistry();
    const parser = makeMarkdownItParser();
    const results = await runLint([], DEFAULT_CONFIG, registry, {
      parser,
      readFile: stubReadFile,
      fsCheck: stubFsCheck,
    });
    expect(results).toHaveLength(0);
  });

  it("returns one clean result per file (no rules registered)", async () => {
    const registry = makeRuleRegistry();
    const parser = makeMarkdownItParser();
    const results = await runLint(["a.md", "b.md"], DEFAULT_CONFIG, registry, {
      parser,
      readFile: stubReadFile,
      fsCheck: stubFsCheck,
    });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.hasErrors === false)).toBe(true);
  });

  it("maps body-relative OFM diagnostics and fixes after frontmatter to file lines", async () => {
    const registry = makeRuleRegistry();
    registry.register(bodyRule);
    const parser = makeMarkdownItParser();
    const results = await runLint(["a.md"], DEFAULT_CONFIG, registry, {
      parser,
      readFile: async () => "---\ntitle: Test\n---\n# hi\n",
      fsCheck: stubFsCheck,
    });

    const error = results[0]?.errors[0];
    expect(error?.line).toBe(4);
    expect(error?.fix?.lineNumber).toBe(4);
  });

  it("does not offset frontmatter diagnostics that already use file lines", async () => {
    const registry = makeRuleRegistry();
    registry.register(frontmatterRule);
    const parser = makeMarkdownItParser();
    const results = await runLint(["a.md"], DEFAULT_CONFIG, registry, {
      parser,
      readFile: async () => "---\ntitle: Test\n---\n# hi\n",
      fsCheck: stubFsCheck,
    });

    expect(results[0]?.errors[0]?.line).toBe(1);
  });

  it("uses configured severity overrides when building lint errors", async () => {
    const registry = makeRuleRegistry();
    registry.register(bodyRule);
    const parser = makeMarkdownItParser();
    const config = {
      ...DEFAULT_CONFIG,
      rules: { ...DEFAULT_CONFIG.rules, TEST001: { enabled: true, severity: "error" as const } },
    };
    const results = await runLint(["a.md"], config, registry, {
      parser,
      readFile: stubReadFile,
      fsCheck: stubFsCheck,
    });

    expect(results[0]?.errors[0]?.severity).toBe("error");
    expect(results[0]?.hasErrors).toBe(true);
  });
});
