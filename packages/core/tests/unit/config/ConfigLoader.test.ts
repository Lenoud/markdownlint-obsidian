/**
 * Unit tests for {@link loadConfig}.
 *
 * @module tests/unit/config/ConfigLoader.test
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../../../src/infrastructure/config/ConfigLoader.js";
import { DEFAULT_CONFIG } from "../../../src/infrastructure/config/defaults.js";
import type { LinterConfig } from "../../../src/domain/config/LinterConfig.js";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ofm-config-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function expectRuleDisabled(config: LinterConfig, code: string): void {
  expect(config.rules[code]).toEqual({ enabled: false });
}

describe("ConfigLoader", () => {
  it("returns default config when no config file present", async () => {
    const config = await loadConfig(tmpDir);
    expect(config.resolve).toBe(DEFAULT_CONFIG.resolve);
    expect(config.fix).toBe(false);
  });

  it("merges .obsidian-linter.jsonc when present", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".obsidian-linter.jsonc"),
      JSON.stringify({ resolve: false }),
    );
    const config = await loadConfig(tmpDir);
    expect(config.resolve).toBe(false);
  });

  it("deep-merges the rules block so a user override does not drop defaults", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".obsidian-linter.jsonc"),
      JSON.stringify({
        rules: { MD031: { enabled: false } },
      }),
    );
    const config = await loadConfig(tmpDir);
    // User override applied
    expectRuleDisabled(config, "MD031");
    // Phase 7 default disables preserved
    expectRuleDisabled(config, "MD013");
    expectRuleDisabled(config, "MD028");
    expectRuleDisabled(config, "MD033");
    expectRuleDisabled(config, "MD042");
    // Phase 2-6 OFM disables preserved
    expectRuleDisabled(config, "OFM003");
    expectRuleDisabled(config, "OFM062");
  });

  it("lets a user override replace an individual rule's config without wiping siblings", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".obsidian-linter.jsonc"),
      JSON.stringify({
        rules: {
          MD013: { enabled: true, options: { line_length: 120 } },
        },
      }),
    );
    const config = await loadConfig(tmpDir);
    expect(config.rules.MD013).toEqual({
      enabled: true,
      options: { line_length: 120 },
    });
    // Other conflict disables survive.
    expectRuleDisabled(config, "MD028");
    expectRuleDisabled(config, "MD042");
  });
});
