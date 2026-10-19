import Markdoc, { type Config, type Node } from "@markdoc/markdoc";
import * as React from "react";
import { CaseStudyDiagram } from "./CaseStudyDiagram/CaseStudyDiagram";

interface Props {
  /** Keystatic's `fields.markdoc()` reader returns `{ node }` where `node`
   *  is the Markdoc AST. We transform it here and render through React. */
  document: { node: Node } | Node;
}

const MARKDOC_CONFIG: Config = {
  tags: {
    diagram: {
      render: "CaseStudyDiagram",
      selfClosing: true,
      attributes: {
        id: {
          type: String,
          required: true,
        },
      },
    },
  },
};

const MARKDOC_COMPONENTS = {
  CaseStudyDiagram,
};

function extractNode(doc: Props["document"]): Node {
  if (doc && typeof doc === "object" && "node" in doc) return doc.node;
  return doc;
}

export function PostContent({ document }: Props) {
  const node = extractNode(document);
  const tree = Markdoc.transform(node, MARKDOC_CONFIG);
  return React.createElement(
    React.Fragment,
    null,
    Markdoc.renderers.react(tree, React, { components: MARKDOC_COMPONENTS }),
  );
}
