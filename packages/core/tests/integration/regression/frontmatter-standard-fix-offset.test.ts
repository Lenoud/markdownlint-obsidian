/**
 * Regression coverage for standard markdownlint fixes on files with frontmatter.
 *
 * @module tests/integration/regression/frontmatter-standard-fix-offset.test
 */
import { describe, it, expect } from "bun:test";
import { makeMarkdownItParser } from "../../../src/infrastructure/parser/MarkdownItParser.js";
import { buildStandardRule } from "../../../src/infrastructure/rules/standard/StandardRuleAdapter.js";
import type {
  MarkdownLintAdapter,
  StandardViolation,
} from "../../../src/infrastructure/rules/standard/MarkdownLintAdapter.js";
import { DEFAULT_CONFIG } from "../../../src/infrastructure/config/defaults.js";

const markdownlintStub: MarkdownLintAdapter = {
  runOnce(): readonly StandardViolation[] {
    return [
      {
        ruleNames: ["MD022", "blanks-around-headings"],
        ruleDescription: "Headings should be surrounded by blank lines",
        lineNumber: 1,
        errorRange: [1, 1],
        fixInfo: {
          lineNumber: 2,
          editColumn: 1,
          deleteCount: 0,
          insertText: "\n",
        },
      },
    ];
  },
};

describe("regression: standard markdownlint fix offsets past frontmatter", () => {
  it("reports body-relative violations at absolute file lines", async () => {
    const parser = makeMarkdownItParser();
    const parsed = parser.parse("frontmatter.md", "---\ntitle: Test\n---\n## Heading\nNext\n");
    const rule = buildStandardRule(
      {
        code: "MD022",
        name: "blanks-around-headings",
        description: "Headings should be surrounded by blank lines",
        fixable: true,
        severity: "error",
      },
      markdownlintStub,
    );
    const errors: Array<Parameters<Parameters<typeof rule.run>[1]>[0]> = [];

    await rule.run(
      {
        filePath: parsed.filePath,
        parsed,
        config: DEFAULT_CONFIG,
        vault: null,
        blockRefIndex: null,
        fsCheck: { exists: async () => false },
      },
      (error) => errors.push(error),
    );

    expect(errors[0]).toMatchObject({
      line: 4,
      fix: {
        lineNumber: 5,
        editColumn: 1,
        deleteCount: 0,
        insertText: "\n",
      },
    });
  });
});
