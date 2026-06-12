import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as core from "@actions/core";
import { main as runLinter } from "markdownlint-obsidian-cli";

interface ActionInputs {
  readonly globs: readonly string[];
  readonly vaultRoot: string;
  readonly config: string;
  readonly format: string;
  readonly failOnWarnings: boolean;
}

interface CliRun {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

interface Counts {
  readonly errors: number;
  readonly warnings: number;
}

/** Collect and normalise every action input up-front. */
function readInputs(): ActionInputs {
  const rawFailOnWarnings = core.getInput("fail-on-warnings") || "false";
  return {
    globs: core.getInput("globs").split(/\s+/).filter(Boolean),
    vaultRoot: core.getInput("vault-root"),
    config: core.getInput("config"),
    format: core.getInput("format") || "default",
    // `getBooleanInput` throws when the input is missing entirely
    // (e.g. during a local smoke test). We accept the documented
    // defaults without invoking it so the action stays runnable.
    failOnWarnings: /^(true|True|TRUE)$/.test(rawFailOnWarnings),
  };
}

/** Build the argv vector the CLI expects from parsed action inputs. */
function buildArgv(inputs: ActionInputs, format: string): string[] {
  const argv = ["node", "markdownlint-obsidian"];
  if (inputs.vaultRoot) argv.push("--vault-root", inputs.vaultRoot);
  if (inputs.config) argv.push("--config", inputs.config);
  argv.push("--output-formatter", format);
  argv.push(...inputs.globs);
  return argv;
}

async function captureCli(argv: string[]): Promise<CliRun> {
  let stdout = "";
  let stderr = "";
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    const exitCode = await runLinter(argv);
    return { exitCode, stdout, stderr };
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }
}

function emitCaptured(run: CliRun): void {
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
}

function countResults(jsonOutput: string): Counts {
  const parsed = JSON.parse(jsonOutput || "[]") as Array<{
    errors?: Array<{ severity?: string }>;
  }>;
  let errors = 0;
  let warnings = 0;
  for (const result of parsed) {
    for (const error of result.errors ?? []) {
      if (error.severity === "error") errors += 1;
      if (error.severity === "warning") warnings += 1;
    }
  }
  return { errors, warnings };
}

async function writeSarifOutput(sarif: string): Promise<string> {
  const outDir = process.env["RUNNER_TEMP"] || os.tmpdir();
  const filePath = path.join(outDir, "markdownlint-obsidian.sarif");
  await fs.writeFile(filePath, sarif, "utf8");
  return filePath;
}

/**
 * Entry point for the GitHub Action.
 *
 * Reads action inputs, invokes the existing CLI entrypoint, sets documented
 * outputs, and surfaces the severity-aware action failure policy.
 */
async function run(): Promise<void> {
  const inputs = readInputs();
  const countingRun = await captureCli(buildArgv(inputs, "json"));
  if (failOnToolError(countingRun, "markdownlint-obsidian failed while collecting lint results")) {
    return;
  }

  const counts = countResults(countingRun.stdout.trim());
  setCountOutputs(counts);

  const formattedRun = await formatRun(inputs, countingRun);
  await setSarifOutput(inputs, formattedRun);
  emitCaptured(formattedRun);

  if (failOnToolError(formattedRun, "markdownlint-obsidian failed")) return;
  failOnLintPolicy(inputs, counts);
}

function failOnToolError(runResult: CliRun, message: string): boolean {
  if (runResult.exitCode !== 2) return false;
  emitCaptured(runResult);
  core.setFailed(message);
  return true;
}

function setCountOutputs(counts: Counts): void {
  core.setOutput("error-count", String(counts.errors));
  core.setOutput("warning-count", String(counts.warnings));
}

async function formatRun(inputs: ActionInputs, countingRun: CliRun): Promise<CliRun> {
  return inputs.format === "json" ? countingRun : captureCli(buildArgv(inputs, inputs.format));
}

async function setSarifOutput(inputs: ActionInputs, runResult: CliRun): Promise<void> {
  if (inputs.format === "sarif" && runResult.stdout) {
    core.setOutput("sarif-path", await writeSarifOutput(runResult.stdout));
  }
}

function failOnLintPolicy(inputs: ActionInputs, counts: Counts): void {
  if (counts.errors === 0 && (!inputs.failOnWarnings || counts.warnings === 0)) return;
  core.setFailed(
    `markdownlint-obsidian found ${counts.errors} error(s) and ${counts.warnings} warning(s)`,
  );
}

run().catch((err: unknown) => core.setFailed(err instanceof Error ? err.message : String(err)));
