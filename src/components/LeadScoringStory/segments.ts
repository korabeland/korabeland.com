import Markdoc, { type Node } from "@markdoc/markdoc";

export interface StoryChapter {
  /** The chapter's h2 text. */
  title: string;
  /** The heading plus the blocks that set the figure up. */
  before: Node;
  /** The blocks that follow the figure. */
  after: Node;
}

export interface StoryParts {
  /** Blocks before the first h2. */
  intro: Node;
  /** One entry per figure-bearing chapter, in story order. */
  chapters: StoryChapter[];
  /** The closing section: the last h2 and everything under it. */
  closing: Node;
}

function extractNode(doc: unknown): Node {
  if (doc && typeof doc === "object" && "node" in doc) {
    return (doc as { node: Node }).node;
  }
  return doc as Node;
}

function isChapterHeading(node: Node): boolean {
  return node.type === "heading" && node.attributes.level === 2;
}

function headingText(node: Node): string {
  let text = "";
  for (const child of node.walk()) {
    if (child.type === "text") text += child.attributes.content ?? "";
  }
  return text.trim();
}

/**
 * Splits the flagship case study's Markdoc body at its h2 headings so each
 * chapter's figure can sit between the setup and the finding. The body is
 * expected to be: intro blocks, then `figureAfter.length` chapters, then one
 * closing section. `figureAfter[i]` is how many blocks of chapter i (heading
 * included) come before its figure.
 *
 * Throws when the body does not have that shape, so an edit that drops a
 * heading fails the build instead of silently misplacing a figure.
 */
export function buildStoryParts(
  document: unknown,
  figureAfter: readonly number[],
): StoryParts {
  const root = extractNode(document);
  const children = root.children ?? [];
  const slice = (blocks: Node[]) =>
    new Markdoc.Ast.Node("document", root.attributes, blocks);

  const starts = children.flatMap((child, i) =>
    isChapterHeading(child) ? [i] : [],
  );
  const expected = figureAfter.length + 1;
  if (starts.length !== expected) {
    throw new Error(
      `case-study story: expected ${expected} h2 sections (${figureAfter.length} figure chapters and a closing section), got ${starts.length}.`,
    );
  }

  const sections = starts.map((start, i) =>
    children.slice(start, starts[i + 1] ?? children.length),
  );
  const chapters = figureAfter.map((count, i) => {
    const blocks = sections[i];
    if (count < 2 || count >= blocks.length) {
      throw new Error(
        `case-study story: figure chapter ${i + 1} has ${blocks.length} blocks, so its figure cannot sit after block ${count} with prose on both sides.`,
      );
    }
    return {
      title: headingText(blocks[0]),
      before: slice(blocks.slice(0, count)),
      after: slice(blocks.slice(count)),
    };
  });

  return {
    intro: slice(children.slice(0, starts[0])),
    chapters,
    closing: slice(sections[sections.length - 1]),
  };
}
