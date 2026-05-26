/**
 * Unit tests for {@link fix} engine entry-point.
 *
 * @module tests/unit/engine/fix.test
 */
import { describe, it, expect } from "bun:test";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import { fix } from "../../../src/engine/index.js";

/** Create a temp dir with a .obsidian/ marker so vault detection succeeds. */
async function makeTmpVault(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ofm-engine-fix-test-"));
  await fs.mkdir(path.join(dir, ".obsidian"), { recursive: true });
  return dir;
}

describe("engine.fix()", () => {
  it("returns FixOutcome with firstPass and finalPass arrays", async () => {
    const tmpDir = await makeTmpVault();
    try {
      await fs.writeFile(path.join(tmpDir, "file.md"), "# Hello\n\nContent.\n");
      const outcome = await fix({ globs: ["**/*.md"], cwd: tmpDir });
      expect("firstPass" in outcome).toBe(true);
      expect("finalPass" in outcome).toBe(true);
      expect("filesFixed" in outcome).toBe(true);
      expect("conflicts" in outcome).toBe(true);
      expect(Array.isArray(outcome.firstPass)).toBe(true);
      expect(Array.isArray(outcome.finalPass)).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not write files when check=true", async () => {
    const tmpDir = await makeTmpVault();
    try {
      const content = "# Hello\n\nContent.\n";
      const filePath = path.join(tmpDir, "file.md");
      await fs.writeFile(filePath, content);
      await fix({ globs: ["**/*.md"], cwd: tmpDir, check: true });
      const afterContent = await fs.readFile(filePath, "utf8");
      expect(afterContent).toBe(content);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("reports the final pass from hypothetical check=true fixes", async () => {
    const tmpDir = await makeTmpVault();
    try {
      const original = "#project/\n";
      const filePath = path.join(tmpDir, "file.md");
      await fs.writeFile(filePath, original);

      const outcome = await fix({ globs: ["**/*.md"], cwd: tmpDir, check: true });

      expect(outcome.filesFixed).toContain(filePath);
      expect(outcome.firstPass[0]!.errors.some((error) => error.ruleCode === "OFM063")).toBe(true);
      expect(outcome.finalPass[0]!.errors.some((error) => error.ruleCode === "OFM063")).toBe(false);
      expect(await fs.readFile(filePath, "utf8")).toBe(original);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("applies MD029 ordered-list fixes after fenced code without corrupting the fence", async () => {
    const tmpDir = await makeTmpVault();
    try {
      const original = [
        "---",
        "title: test",
        "---",
        "",
        "## Setup",
        "",
        "1. Initialize project",
        "",
        "```bash",
        "git init",
        "```",
        "",
        "3. Connect remote",
        "",
        "Connect commands below.",
        "",
      ].join("\n");
      const expected = original.replace("3. Connect remote", "1. Connect remote");
      const filePath = path.join(tmpDir, "test.md");
      await fs.writeFile(filePath, original);
      await fs.writeFile(
        path.join(tmpDir, ".obsidian-linter.jsonc"),
        JSON.stringify({
          rules: {
            MD029: { enabled: true },
            MD031: { enabled: false },
            MD032: { enabled: false },
          },
        }),
      );

      await fix({ globs: ["test.md"], cwd: tmpDir });

      expect(await fs.readFile(filePath, "utf8")).toBe(expected);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns an empty firstPass when no files match", async () => {
    const tmpDir = await makeTmpVault();
    try {
      const outcome = await fix({ globs: ["**/*.md"], cwd: tmpDir });
      expect(outcome.firstPass).toHaveLength(0);
      expect(outcome.finalPass).toHaveLength(0);
      expect(outcome.filesFixed).toHaveLength(0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
