/**
 * Purpose: Defines the value object representing an inline block-reference anchor (`^blockid`) found at the end of a line.
 *
 * Provides: {@link BlockRefNode}, {@link makeBlockRefNode}
 *
 * Role in system: One of the OFM-specific AST node types produced by the parser and stored on {@link ParseResult.blockRefs}; consumed by block-reference rules (OFM100–OFM104) and used to build the {@link BlockRefIndex} for cross-file lookups.
 *
 * @module domain/parsing/BlockRefNode
 */
import type { SourcePosition } from "./SourcePosition.js";

/**
 * An anchor block reference definition on a line: `Some content ^blockid`.
 * Obsidian allows one per line at the end of a block.
 */
export interface BlockRefNode {
  readonly blockId: string;
  readonly position: SourcePosition;
}

export function makeBlockRefNode(fields: BlockRefNode): BlockRefNode {
  if (fields.blockId.length === 0) {
    throw new Error("BlockRefNode.blockId must not be empty");
  }
  return Object.freeze({ ...fields });
}
