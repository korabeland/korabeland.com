import Markdoc, { type Node } from "@markdoc/markdoc";
import * as React from "react";

interface Props {
  /** Keystatic's `fields.markdoc()` reader returns `{ node }` where `node`
   *  is the Markdoc AST. We transform it here and render through React. */
  document: { node: Node } | Node;
}

function extractNode(doc: Props["document"]): Node {
  if (doc && typeof doc === "object" && "node" in doc) return doc.node;
  return doc;
}

export function PostContent({ document }: Props) {
  const node = extractNode(document);
  const tree = Markdoc.transform(node);
  return <>{Markdoc.renderers.react(tree, React)}</>;
}
