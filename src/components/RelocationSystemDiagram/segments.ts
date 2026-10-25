import Markdoc, { type Node } from "@markdoc/markdoc";

export type RelocationDiagramVariant =
  | "system-overview"
  | "ripple-effects"
  | "first-system"
  | "weekly-agenda"
  | "redesigned-system";

export interface RelocationStoryPart {
  diagram: RelocationDiagramVariant;
  document: Node;
}

const SLICE_RANGES: readonly {
  diagram: RelocationDiagramVariant;
  start: number;
  end?: number;
}[] = [
  { diagram: "system-overview", start: 0, end: 1 },
  { diagram: "ripple-effects", start: 1, end: 3 },
  { diagram: "first-system", start: 3, end: 5 },
  { diagram: "weekly-agenda", start: 5, end: 8 },
  { diagram: "redesigned-system", start: 8 },
];

function extractNode(doc: unknown): Node {
  if (doc && typeof doc === "object" && "node" in doc) {
    return (doc as { node: Node }).node;
  }
  return doc as Node;
}

/**
 * Splits the relocation-playbook Markdoc AST into the five segments that
 * follow each inline diagram in the approved story order.
 */
export function buildRelocationStoryParts(
  document: unknown,
): RelocationStoryPart[] {
  const root = extractNode(document);
  const children = root.children ?? [];
  if (children.length < 9) {
    throw new Error(
      `relocation-playbook: expected at least 9 top-level Markdoc blocks for inline diagram placement, got ${children.length}.`,
    );
  }
  return SLICE_RANGES.map(({ diagram, start, end }) => ({
    diagram,
    document: new Markdoc.Ast.Node(
      "document",
      root.attributes,
      children.slice(start, end),
    ),
  }));
}
