import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawnCli } from "../helpers/spawnCli.js";

// Increase timeout for integration tests that spawn real processes
describe("--fix and --fix-check round-trip", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ofm-fix-test-"));
    // Mark temp dir as vault root so vault detection succeeds
    await fs.mkdir(path.join(tmp, ".obsidian"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("--fix rewrites a trailing-slash tag in-place and exits 0", async () => {
    const filePath = path.join(tmp, "test.md");
    await fs.writeFile(filePath, "# Test\n\n#project/\n");

    const result = await spawnCli(["--fix", "**/*.md"], tmp);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Fixed 1 file(s)");
    const content = await fs.readFile(filePath, "utf8");
    expect(content).toBe("# Test\n\n#project\n");
  });

  it("--fix-check reports what would be fixed without touching disk, exits 1", async () => {
    const filePath = path.join(tmp, "test.md");
    const original = "# Test\n\n#project/\n";
    await fs.writeFile(filePath, original);

    const result = await spawnCli(["--fix-check", "**/*.md"], tmp);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Would fix 1 file(s)");
    expect(result.stdout).toBe("");
    const content = await fs.readFile(filePath, "utf8");
    expect(content).toBe(original); // file must be unchanged on disk
  });

  it("--fix reports [fix-conflict] when two fixable rules overlap on the same line", async () => {
    const filePath = path.join(tmp, "test-conflict.md");
    // Line 1: #area/ — OFM063 fires (trailing slash)
    // Line 3: #Area/ — both OFM063 and OFM065 fire (trailing slash + wrong case);
    //          their fixes overlap, so OFM063 wins and OFM065 is recorded as a conflict.
    await fs.writeFile(filePath, "#area/\n\n#Area/\n");

    const result = await spawnCli(["--fix", "**/*.md"], tmp);

    expect(result.stderr).toContain("[fix-conflict]");
    expect(result.stderr).toContain("Fixed 1 file(s)");
    // OFM065 is severity "warning", so the final pass exits 0 even though the
    // case mismatch on #Area remains unfixed.
    expect(result.exitCode).toBe(0);
    const content = await fs.readFile(filePath, "utf8");
    // Both trailing slashes must have been removed by OFM063
    expect(content).not.toContain("/");
  });

  it("--fix uses --vault-root as the default glob base when globs are omitted", async () => {
    const caller = path.join(tmp, "caller");
    const vault = path.join(caller, "vault");
    await fs.mkdir(path.join(caller, ".git"), { recursive: true });
    await fs.mkdir(path.join(vault, ".obsidian"), { recursive: true });
    const outsidePath = path.join(caller, "outside.md");
    const targetPath = path.join(vault, "target.md");
    const configPath = path.join(vault, ".obsidian-linter.jsonc");
    await fs.writeFile(outsidePath, "# Outside\n\n#outside/\n");
    await fs.writeFile(targetPath, "# Target\n\n#target/\n");
    await fs.writeFile(configPath, JSON.stringify({ globs: ["**/*.md"] }));

    const result = await spawnCli(
      ["--config", configPath, "--vault-root", "vault", "--fix"],
      caller,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Fixed 1 file(s)");
    expect(await fs.readFile(outsidePath, "utf8")).toBe("# Outside\n\n#outside/\n");
    expect(await fs.readFile(targetPath, "utf8")).toBe("# Target\n\n#target\n");
  });

  it("--fix resolves config vaultRoot relative to the explicit config path", async () => {
    const caller = path.join(tmp, "caller");
    const vault = path.join(tmp, "vault");
    await fs.mkdir(path.join(caller, ".git"), { recursive: true });
    await fs.mkdir(path.join(vault, ".obsidian"), { recursive: true });
    const outsidePath = path.join(caller, "outside.md");
    const targetPath = path.join(vault, "target.md");
    const configPath = path.join(vault, ".obsidian-linter.jsonc");
    await fs.writeFile(outsidePath, "# Outside\n\n#outside/\n");
    await fs.writeFile(targetPath, "# Target\n\n#target/\n");
    await fs.writeFile(configPath, JSON.stringify({ vaultRoot: "./", globs: ["**/*.md"] }));

    const result = await spawnCli(["--config", configPath, "--fix"], caller);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Fixed 1 file(s)");
    expect(await fs.readFile(outsidePath, "utf8")).toBe("# Outside\n\n#outside/\n");
    expect(await fs.readFile(targetPath, "utf8")).toBe("# Target\n\n#target\n");
  });
});
