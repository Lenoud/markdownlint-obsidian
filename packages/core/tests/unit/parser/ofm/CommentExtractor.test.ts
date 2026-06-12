/**
 * Unit tests for {@link extractComments}.
 *
 * @module tests/unit/parser/ofm/CommentExtractor.test
 */
import { describe, it, expect } from "bun:test";
import { extractComments } from "../../../../src/infrastructure/parser/ofm/CommentExtractor.js";
import { buildCodeRegionMap } from "../../../../src/infrastructure/parser/ofm/CodeRegionMap.js";

function run(src: string): ReturnType<typeof extractComments> {
  const lines = src.split("\n");
  return extractComments(lines, buildCodeRegionMap(lines));
}

describe("CommentExtractor", () => {
  it("extracts a single-line comment", () => {
    const out = run("before %%todo%% after");
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe("todo");
  });

  it("extracts a multi-line comment", () => {
    const out = run("start %%line1\nline2%% end");
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe("line1\nline2");
    expect(out[0]?.position.line).toBe(1);
    expect(out[0]?.endPosition.line).toBe(2);
  });

  it("skips unclosed comments", () => {
    const out = run("start %%never closes");
    expect(out).toHaveLength(0);
  });

  it("skips comments inside code fences", () => {
    const out = run("```\n%%ignored%%\n```\n%%real%%");
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe("real");
  });

  it("skips comments inside inline code", () => {
    const out = run("`%%ignored%%` then %%real%%");
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe("real");
  });
});
