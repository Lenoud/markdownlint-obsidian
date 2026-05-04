/** Unit tests for {@link extractMdConfig}. @module tests/unit/rules/standard/extractMdConfig.test */
import { describe, it, expect } from "bun:test";
import { DEFAULT_CONFIG } from "../../../../src/infrastructure/config/defaults.js";
import { extractMdConfig } from "../../../../src/infrastructure/rules/standard/StandardRuleAdapter.js";
import { OFM_MD_CONFLICTS } from "../../../../src/infrastructure/rules/standard/OFM_MD_CONFLICTS.js";

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
