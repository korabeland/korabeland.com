// @vitest-environment node
import Markdoc from "@markdoc/markdoc";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseStudyDiagram } from "@/components/CaseStudyDiagram/CaseStudyDiagram";
import {
  CASE_STUDY_DIAGRAMS,
  diagramAccessibleSummary,
  getCaseStudyDiagram,
} from "@/components/CaseStudyDiagram/diagrams";
import { PostContent } from "@/components/PostContent";

const DIAGRAM_IDS = [
  "ai-crew-topology",
  "ai-crew-pipeline",
  "ai-crew-october-merges",
] as const;

describe("CaseStudyDiagram specs and helpers", () => {
  it("resolves all registered diagram specs and rejects unknown ids", () => {
    for (const id of DIAGRAM_IDS) {
      const spec = getCaseStudyDiagram(id);
      expect(spec.id).toBe(id);
      expect(spec.title.length).toBeGreaterThan(10);
      expect(spec.description.length).toBeGreaterThan(20);
      expect(spec.caption.length).toBeGreaterThan(20);
      expect(diagramAccessibleSummary(spec)).toContain(spec.title);
      expect(diagramAccessibleSummary(spec)).toContain(spec.description);
    }
    expect(() => getCaseStudyDiagram("not-a-diagram")).toThrow(
      /Unknown case-study diagram "not-a-diagram"/,
    );
  });

  it("contains zero em dashes across all diagram metadata and rendered SVG markup", () => {
    for (const id of DIAGRAM_IDS) {
      const spec = CASE_STUDY_DIAGRAMS[id];
      expect(JSON.stringify(spec)).not.toContain("—");
      const html = renderToStaticMarkup(
        React.createElement(CaseStudyDiagram, { id }),
      );
      expect(html).not.toContain("—");
    }
  });
});

describe("CaseStudyDiagram rendering & accessibility", () => {
  it.each(
    DIAGRAM_IDS,
  )("renders %s with accessible <title>, <desc>, <figcaption>, and desktop/mobile SVGs", (id) => {
    const spec = getCaseStudyDiagram(id);
    const html = renderToStaticMarkup(
      React.createElement(CaseStudyDiagram, { id }),
    );

    expect(html).toContain(`data-diagram-id="${id}"`);
    expect(html).toContain(`id="cs-diagram-${id}-title"`);
    expect(html).toContain(`id="cs-diagram-${id}-d-title"`);
    expect(html).toContain(`id="cs-diagram-${id}-d-desc"`);
    expect(html).toContain(`id="cs-diagram-${id}-m-title"`);
    expect(html).toContain(`id="cs-diagram-${id}-m-desc"`);
    expect(html).toContain(`id="cs-diagram-${id}-caption"`);
    const unescapedHtml = html.replaceAll("&#x27;", "'");
    expect(unescapedHtml).toContain(spec.title);
    expect(unescapedHtml).toContain(spec.description);
    expect(unescapedHtml).toContain(spec.caption);
    expect(html).toContain('class="cs-diagram-svg cs-diagram-svg--desktop"');
    expect(html).toContain('class="cs-diagram-svg cs-diagram-svg--mobile"');
    expect(html).toContain('role="img"');
  });

  it("renders through PostContent when embedded via Markdoc {% diagram %} tag", () => {
    const ast = Markdoc.parse(
      'Intro paragraph.\n\n{% diagram id="ai-crew-topology" /%}\n\nClosing paragraph.',
    );
    const html = renderToStaticMarkup(
      React.createElement(PostContent, { document: { node: ast } }),
    );
    expect(html).toContain("Intro paragraph.");
    expect(html).toContain('data-diagram-id="ai-crew-topology"');
    expect(html).toContain("fig 01 · crew command topology");
    expect(html).toContain("Closing paragraph.");
  });
});
