/** Unit tests for {@link buildStandardRule} and {@link extractMdConfig}. @module tests/unit/rules/standard/StandardRuleAdapter.test */
import { describe, it, expect } from "bun:test";
import {
  buildStandardRule,
  extractMdConfig,
} from "../../../../src/infrastructure/rules/standard/StandardRuleAdapter.js";
import type {
  MarkdownLintAdapter,
  StandardViolation,
} from "../../../../src/infrastructure/rules/standard/MarkdownLintAdapter.js";
import { runRuleOnSource } from "../helpers/runRuleOnSource.js";
import { DEFAULT_CONFIG } from "../../../../src/infrastructure/config/defaults.js";
import { OFM_MD_CONFLICTS } from "../../../../src/infrastructure/rules/standard/OFM_MD_CONFLICTS.js";

/**
 * Build a stub {@link MarkdownLintAdapter} that returns the canned
 * violations for every call, regardless of inputs. This keeps
 * StandardRuleAdapter tests hermetic — they do not depend on upstream
 * markdownlint behaviour.
 */
function stubAdapter(violations: readonly StandardViolation[]): MarkdownLintAdapter {
  return {
    runOnce(): readonly StandardViolation[] {
      return violations;
    },
  };
}

describe("buildStandardRule", () => {
  const descMd013 = {
    code: "MD013",
    name: "line-length",
    description: "Line length",
    fixable: false,
    severity: "warning" as const,
  };

  it("exposes markdownlint rule codes via both names", () => {
    const rule = buildStandardRule(descMd013, stubAdapter([]));
    expect(rule.names).toEqual(["MD013", "line-length"]);
    expect(rule.tags).toEqual(["markdownlint", "standard"]);
  });

  it("emits one LintError per matching violation with line/column/message", async () => {
    const adapter = stubAdapter([
      {
        ruleNames: ["MD013", "line-length"],
        ruleDescription: "Line length",
        lineNumber: 7,
        errorRange: [42, 1],
        errorDetail: "Expected: 80; Actual: 120",
      },
    ]);
    const rule = buildStandardRule(descMd013, adapter);
    const errors = await runRuleOnSource(rule, "# h\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      ruleCode: "MD013",
      ruleName: "line-length",
      line: 7,
      column: 42,
      severity: "warning",
      message: "Line length: Expected: 80; Actual: 120",
    });
  });

  it("falls back to column 1 when markdownlint omits errorRange", async () => {
    const adapter = stubAdapter([
      {
        ruleNames: ["MD013", "line-length"],
        ruleDescription: "Line length",
        lineNumber: 3,
      },
    ]);
    const rule = buildStandardRule(descMd013, adapter);
    const errors = await runRuleOnSource(rule, "# h\n");
    expect(errors[0]?.column).toBe(1);
    expect(errors[0]?.message).toBe("Line length");
  });

  it("filters violations that do not match its code", async () => {
    const adapter = stubAdapter([
      {
        ruleNames: ["MD001", "heading-increment"],
        ruleDescription: "Heading levels",
        lineNumber: 2,
      },
      {
        ruleNames: ["MD013", "line-length"],
        ruleDescription: "Line length",
        lineNumber: 5,
      },
    ]);
    const rule = buildStandardRule(descMd013, adapter);
    const errors = await runRuleOnSource(rule, "# h\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.line).toBe(5);
  });

  it("threads fixInfo as a Fix when the violation carries it", async () => {
    const adapter = stubAdapter([
      {
        ruleNames: ["MD009", "no-trailing-spaces"],
        ruleDescription: "Trailing spaces",
        lineNumber: 4,
        fixInfo: {
          editColumn: 10,
          deleteCount: 2,
          insertText: "",
        },
      },
    ]);
    const descMd009 = {
      code: "MD009",
      name: "no-trailing-spaces",
      description: "Trailing spaces",
      fixable: true,
      severity: "warning" as const,
    };
    const rule = buildStandardRule(descMd009, adapter);
    const errors = await runRuleOnSource(rule, "hello     \nworld\n");
    expect(errors[0]?.fix).toBeDefined();
    expect(errors[0]?.fix).toMatchObject({
      lineNumber: 4,
      editColumn: 10,
      deleteCount: 2,
      insertText: "",
    });
  });

  it("omits fix when violation has no fixInfo", async () => {
    const adapter = stubAdapter([
      {
        ruleNames: ["MD013", "line-length"],
        ruleDescription: "Line length",
        lineNumber: 7,
      },
    ]);
    const rule = buildStandardRule(descMd013, adapter);
    const errors = await runRuleOnSource(rule, "# h\n");
    expect(errors[0]?.fix).toBeUndefined();
  });

  // Regression: issue #28. Markdownlint uses `deleteCount: -1` as a sentinel
  // for "delete the entire line" (MD012, MD053). Our column-based applyFixes
  // pipeline cannot represent line removal, so we surface the violation
  // without a fix instead of crashing the rule with `Fix.deleteCount must
  // be >= 0` (which the LintUseCase wraps as OFM901).
  it("surfaces violations whose fixInfo uses the deleteCount=-1 sentinel without crashing", async () => {
    const descMd012 = {
      code: "MD012",
      name: "no-multiple-blanks",
      description: "Multiple consecutive blank lines",
      fixable: true,
      severity: "warning" as const,
    };
    const adapter = stubAdapter([
      {
        ruleNames: ["MD012", "no-multiple-blanks"],
        ruleDescription: "Multiple consecutive blank lines",
        lineNumber: 5,
        fixInfo: { deleteCount: -1 },
      },
    ]);
    const rule = buildStandardRule(descMd012, adapter);
    const errors = await runRuleOnSource(rule, "# h\n\n\n\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      ruleCode: "MD012",
      line: 5,
    });
    expect(errors[0]?.fix).toBeUndefined();
  });

  it("preserves valid fixInfo unchanged even when fixable rules can also emit deleteCount=-1", async () => {
    const descMd012 = {
      code: "MD012",
      name: "no-multiple-blanks",
      description: "Multiple consecutive blank lines",
      fixable: true,
      severity: "warning" as const,
    };
    const adapter = stubAdapter([
      {
        ruleNames: ["MD012", "no-multiple-blanks"],
        ruleDescription: "Multiple consecutive blank lines",
        lineNumber: 3,
        fixInfo: { lineNumber: 3, editColumn: 1, deleteCount: 0, insertText: "" },
      },
    ]);
    const rule = buildStandardRule(descMd012, adapter);
    const errors = await runRuleOnSource(rule, "# h\n\n\n");
    expect(errors[0]?.fix).toMatchObject({
      lineNumber: 3,
      editColumn: 1,
      deleteCount: 0,
      insertText: "",
    });
  });
});

describe("extractMdConfig", () => {
  it("starts every translation with { default: true }", () => {
    const cfg = { ...DEFAULT_CONFIG, rules: {} };
    expect(extractMdConfig(cfg)).toEqual({ default: true });
  });

  it("maps enabled: false to false", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      rules: { MD013: { enabled: false } },
    };
    const mdc = extractMdConfig(cfg);
    expect(mdc.MD013).toBe(false);
    expect(mdc.default).toBe(true);
  });

  it("forwards rule options verbatim when provided", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      rules: {
        MD013: { enabled: true, options: { line_length: 120 } },
      },
    };
    const mdc = extractMdConfig(cfg);
    expect(mdc.MD013).toEqual({ line_length: 120 });
  });

  it("uses true (enabled, no options) when only enabled is set", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      rules: { MD013: { enabled: true } },
    };
    expect(extractMdConfig(cfg).MD013).toBe(true);
  });

  it("ignores non-MD rule keys so upstream markdownlint does not reject them", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      rules: {
        OFM001: { enabled: false },
        MD013: { enabled: false },
      },
    };
    const mdc = extractMdConfig(cfg);
    expect(mdc.OFM001).toBeUndefined();
    expect(mdc.MD013).toBe(false);
  });

  it("translates every OFM_MD_CONFLICTS default disable for markdownlint", () => {
    const mdc = extractMdConfig(DEFAULT_CONFIG);
    for (const conflict of OFM_MD_CONFLICTS) {
      expect(mdc[conflict.code]).toBe(false);
    }
  });
});
