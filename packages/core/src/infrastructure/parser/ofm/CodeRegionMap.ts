/**
 * Purpose: Precomputes which line/column positions fall inside fenced code blocks or inline code spans, providing O(1) suppression lookups for all OFM extractors.
 *
 * Provides: {@link buildCodeRegionMap}, {@link CodeRegionMap}
 *
 * Role in system: Shared prerequisite consumed by every OFM extractor; by centralising
 * code-region detection here, individual extractors stay simple and avoid accidentally
 * extracting OFM syntax from within code literals.
 *
 * @module infrastructure/parser/ofm/CodeRegionMap
 */

/**
 * Precomputes positions covered by fenced code blocks and inline code spans
 * so OFM extractors can skip them in O(1) lookups.
 *
 * The map is permissive: if any heuristic flags a position as code, every
 * extractor treats it as code.
 */
export interface CodeRegionMap {
  isInCode(line: number, column: number): boolean;
}

const FENCE_PATTERN = /^(\s*)(`{3,}|~{3,})/;

export interface InlineCodeSpan {
  readonly start: number;
  readonly end: number;
}

interface InlineRegionSpan extends InlineCodeSpan {
  readonly line: number;
}

interface ScanState {
  readonly blockLines: Set<number>;
  readonly inline: InlineRegionSpan[];
  fence: string | null;
}

export function buildCodeRegionMap(lines: readonly string[]): CodeRegionMap {
  const state: ScanState = {
    blockLines: new Set<number>(),
    inline: [],
    fence: null,
  };

  for (let i = 0; i < lines.length; i += 1) {
    scanLine(lines[i] ?? "", i + 1, state);
  }

  return {
    isInCode(line, column): boolean {
      if (state.blockLines.has(line)) return true;
      return state.inline.some(
        (span) => span.line === line && column >= span.start && column <= span.end,
      );
    },
  };
}

function scanLine(line: string, lineNumber: number, state: ScanState): void {
  const match = line.match(FENCE_PATTERN);
  if (state.fence !== null) {
    state.blockLines.add(lineNumber);
    if (match !== null && line.trim().startsWith(state.fence)) {
      state.fence = null;
    }
    return;
  }
  if (match !== null) {
    state.fence = match[2] ?? null;
    state.blockLines.add(lineNumber);
    return;
  }
  collectInlineSpans(line, lineNumber, state.inline);
}

function collectInlineSpans(line: string, lineNumber: number, out: InlineRegionSpan[]): void {
  for (const span of collectInlineCodeSpans(line)) {
    out.push({ ...span, line: lineNumber });
  }
}

export function collectInlineCodeSpans(line: string): readonly InlineCodeSpan[] {
  const spans: InlineCodeSpan[] = [];
  let pos = 0;
  while (pos < line.length) {
    const open = nextBacktickRun(line, pos);
    if (open === null) break;
    const close = findClosingBacktickRun(line, open.end, open.length);
    if (close === null) break;
    spans.push({ start: open.start + 1, end: close.end });
    pos = close.end;
  }
  return spans;
}

function nextBacktickRun(
  line: string,
  from: number,
): { start: number; end: number; length: number } | null {
  const start = line.indexOf("`", from);
  if (start === -1) return null;
  let end = start;
  while (end < line.length && line.charAt(end) === "`") end += 1;
  return { start, end, length: end - start };
}

function findClosingBacktickRun(
  line: string,
  from: number,
  length: number,
): { start: number; end: number } | null {
  let pos = from;
  while (pos < line.length) {
    const run = nextBacktickRun(line, pos);
    if (run === null) return null;
    if (run.length === length) return { start: run.start, end: run.end };
    pos = run.end;
  }
  return null;
}
