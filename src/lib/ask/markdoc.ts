// Reads the reader's Markdoc document into plain text blocks, keeping
// paragraph and heading boundaries. It walks the parsed tree the site's own
// renderer walks, so the indexed text is what the page prints; no markdown is
// re-parsed from source. A node type it has not been taught throws, so a new
// kind of content stops the build instead of silently dropping text.

export interface TextBlock {
  kind: "heading" | "paragraph";
  text: string;
}

interface MarkdocNodeLike {
  type?: unknown;
  attributes?: { content?: unknown };
  children?: unknown[];
}

const CONTAINERS = new Set(["document", "blockquote", "list", "item"]);
const INLINE_WRAPPERS = new Set(["inline", "strong", "em", "s", "link"]);
const BREAKS = new Set(["softbreak", "hardbreak"]);

function asNode(value: unknown): MarkdocNodeLike {
  if (!value || typeof value !== "object") {
    throw new Error("ask corpus: malformed Markdoc node");
  }
  return value as MarkdocNodeLike;
}

function inlineText(value: unknown): string {
  const node = asNode(value);
  const type = String(node.type);
  if (type === "text" || type === "code") {
    const content = node.attributes?.content;
    return typeof content === "string" ? content : "";
  }
  if (BREAKS.has(type)) return " ";
  if (type === "image") return "";
  if (INLINE_WRAPPERS.has(type)) {
    return (node.children ?? []).map(inlineText).join("");
  }
  throw new Error(`ask corpus: unsupported inline Markdoc node "${type}"`);
}

function collect(value: unknown, out: TextBlock[]): void {
  const node = asNode(value);
  const type = String(node.type);
  if (CONTAINERS.has(type)) {
    for (const child of node.children ?? []) collect(child, out);
    return;
  }
  if (type === "heading" || type === "paragraph" || type === "inline") {
    const text = (node.children ?? []).map(inlineText).join("");
    if (text.trim()) {
      out.push({
        kind: type === "heading" ? "heading" : "paragraph",
        text,
      });
    }
    return;
  }
  if (type === "fence") {
    const content = node.attributes?.content;
    if (typeof content === "string" && content.trim()) {
      out.push({ kind: "paragraph", text: content });
    }
    return;
  }
  if (type === "hr") return;
  throw new Error(`ask corpus: unsupported Markdoc block "${type}"`);
}

/** The reader returns `{ node }`; a bare node is accepted too. */
export function blocksFromMarkdoc(document: unknown): TextBlock[] {
  const root =
    document && typeof document === "object" && "node" in document
      ? (document as { node: unknown }).node
      : document;
  const out: TextBlock[] = [];
  collect(root, out);
  return out;
}
