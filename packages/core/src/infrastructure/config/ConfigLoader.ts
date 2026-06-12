/**
 * Purpose: Walks the directory tree upward from a start path, reads and merges every discovered config file into a single validated {@link LinterConfig}.
 *
 * Provides: {@link loadConfig}
 *
 * Role in system: Infrastructure adapter that bridges the filesystem and the domain config
 * model; it reads JSONC/YAML config files, applies precedence-ordered layer merging on top
 * of {@link DEFAULT_CONFIG}, and delegates shape validation to {@link validateConfig} before
 * returning a fully-typed config to the application layer.
 *
 * @module infrastructure/config/ConfigLoader
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import yaml from "js-yaml";
import { parse as parseJsonc, printParseErrorCode, type ParseError } from "jsonc-parser";
import { DEFAULT_CONFIG } from "./defaults.js";
import { validateConfig } from "./ConfigValidator.js";
import type { LinterConfig } from "../../domain/config/LinterConfig.js";

const CONFIG_FILES: readonly string[] = [
  ".markdownlint-cli2.jsonc",
  ".markdownlint-cli2.yaml",
  ".markdownlint-cli2.yml",
  ".obsidian-linter.jsonc",
  ".obsidian-linter.yaml",
  ".obsidian-linter.yml",
  ".markdownlint.jsonc",
  ".markdownlint.yaml",
  ".markdownlint.yml",
];

const DEEP_MERGE_KEYS = new Set([
  "rules",
  "wikilinks",
  "callouts",
  "embeds",
  "frontmatter",
  "tags",
  "blockRefs",
  "highlights",
  "comments",
]);

/** Load, merge, and validate config layers discovered from `startDir`. */
export async function loadConfig(startDir: string, configPointer?: string): Promise<LinterConfig> {
  const layers = await collectConfigLayers(startDir, configPointer);
  const merged = layers.reduce<Record<string, unknown>>((acc, layer) => mergeLayer(acc, layer), {
    ...DEFAULT_CONFIG,
  } as Record<string, unknown>);
  validateConfig(merged);
  return merged as LinterConfig;
}

function mergeLayer(
  acc: Record<string, unknown>,
  layer: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...acc, ...layer };
  for (const key of DEEP_MERGE_KEYS) {
    const value = layer[key];
    if (isPlainObject(value)) {
      out[key] = { ...asRecord(acc[key]), ...value };
    }
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

async function collectConfigLayers(
  startDir: string,
  configPointer?: string,
): Promise<Record<string, unknown>[]> {
  const explicit = await tryReadExplicitConfig(startDir, configPointer);
  if (explicit !== null) return [explicit];

  const layers: Record<string, unknown>[] = [];
  let dir = path.resolve(startDir);

  for (;;) {
    for (const name of CONFIG_FILES) {
      const filePath = path.join(dir, name);
      const layer = await tryReadConfig(filePath, configPointer);
      if (layer !== null) layers.unshift(layer);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return layers;
}

async function tryReadExplicitConfig(
  startPath: string,
  configPointer?: string,
): Promise<Record<string, unknown> | null> {
  const resolved = path.resolve(startPath);
  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return null;
    return readConfigFile(resolved, configPointer);
  } catch (err) {
    if (isNotFoundLike(err)) return null;
    throw err;
  }
}

async function tryReadConfig(
  filePath: string,
  configPointer?: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await readConfigFile(filePath, configPointer);
  } catch (err) {
    if (isNotFoundLike(err)) return null;
    throw err;
  }
}

async function readConfigFile(
  filePath: string,
  configPointer?: string,
): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parseConfig(raw, filePath);
  const selected = selectConfig(parsed, configPointer, filePath);
  if (!isPlainObject(selected))
    throw new Error(`OFM901: config file ${filePath} must contain an object`);
  return selected;
}

function selectConfig(
  parsed: unknown,
  configPointer: string | undefined,
  filePath: string,
): unknown {
  return configPointer === undefined
    ? parsed
    : selectConfigPointer(parsed, configPointer, filePath);
}

function parseConfig(raw: string, filePath: string): unknown {
  try {
    if (/\.ya?ml$/i.test(filePath)) return yaml.load(raw) ?? {};
    const errors: ParseError[] = [];
    const parsed = parseJsonc(raw, errors, { allowTrailingComma: true });
    if (errors.length > 0) {
      const first = errors[0]!;
      throw new Error(`${printParseErrorCode(first.error)} at offset ${first.offset}`);
    }
    return parsed ?? {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OFM901: failed to parse config file ${filePath}: ${message}`);
  }
}

function selectConfigPointer(raw: unknown, pointer: string, filePath: string): unknown {
  const segments = parseJsonPointer(pointer);
  let current = raw;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current))
      throw new Error(`OFM901: config pointer ${pointer} not found in ${filePath}`);
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function parseJsonPointer(pointer: string): string[] {
  const body = pointer.startsWith("#") ? pointer.slice(1) : pointer;
  if (body === "") return [];
  if (!body.startsWith("/")) {
    throw new Error(`OFM901: config pointer must be a JSON Pointer, got ${pointer}`);
  }
  return body
    .slice(1)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function isNotFoundLike(err: unknown): boolean {
  const code = (err as { code?: unknown }).code;
  return code === "ENOENT" || code === "ENOTDIR";
}
