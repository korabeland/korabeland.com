import * as React from "react";

const h = React.createElement;

import {
  type CaseStudyDiagramSpec,
  getCaseStudyDiagram,
  type PipelineDiagramSpec,
  type TelemetryDiagramSpec,
  type TopologyDiagramSpec,
} from "./diagrams";
export type CaseStudyDiagramProps =
  | {
      id: string;
      spec?: undefined;
    }
  | {
      id?: undefined;
      spec: CaseStudyDiagramSpec;
    };
function resolveSpec(props: CaseStudyDiagramProps): CaseStudyDiagramSpec {
  if (props.spec) return props.spec;
  return getCaseStudyDiagram(props.id);
}
function TopologyDesktopSvg({
  spec,
  titleId,
  descId,
}: {
  spec: TopologyDiagramSpec;
  titleId: string;
  descId: string;
}): React.ReactElement {
  const bayXs = [16, 224, 432] as const;
  return h(
    "svg",
    {
      className: "cs-diagram-svg cs-diagram-svg--desktop",
      viewBox: "0 0 640 436",
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
    },
    h(
      "title",
      {
        id: titleId,
      },
      spec.title,
    ),
    h(
      "desc",
      {
        id: descId,
      },
      spec.description,
    ),
    h("rect", {
      x: 16,
      y: 12,
      width: 404,
      height: 66,
      fill: "var(--paper)",
      stroke: "var(--ink)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 16,
      y: 12,
      width: 404,
      height: 2.5,
      fill: "var(--signal)",
    }),
    h("circle", {
      cx: 32,
      cy: 31,
      r: 3.5,
      fill: "var(--signal)",
    }),
    h(
      "text",
      {
        x: 44,
        y: 35,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
      },
      spec.director.badge,
    ),
    h(
      "text",
      {
        x: 32,
        y: 54,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 13.5,
        fontWeight: 600,
      },
      spec.director.title,
    ),
    h(
      "text",
      {
        x: 32,
        y: 70,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.director.detail,
    ),
    h("rect", {
      x: 436,
      y: 12,
      width: 188,
      height: 66,
      fill: "var(--paper)",
      stroke: "var(--moss)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 436,
      y: 12,
      width: 188,
      height: 2.5,
      fill: "var(--moss)",
    }),
    h("circle", {
      cx: 452,
      cy: 31,
      r: 3.5,
      fill: "var(--moss)",
    }),
    h(
      "text",
      {
        x: 464,
        y: 35,
        fill: "var(--moss)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
      },
      spec.liveGate.badge,
    ),
    h(
      "text",
      {
        x: 452,
        y: 54,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 13.5,
        fontWeight: 600,
      },
      spec.liveGate.title,
    ),
    h(
      "text",
      {
        x: 452,
        y: 70,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.liveGate.detail,
    ),
    h("line", {
      x1: 420,
      y1: 45,
      x2: 436,
      y2: 45,
      stroke: "var(--moss)",
      strokeWidth: 1.5,
    }),
    h("polygon", {
      points: "436,45 430,41.5 430,48.5",
      fill: "var(--moss)",
    }),
    h("line", {
      x1: 210,
      y1: 78,
      x2: 210,
      y2: 112,
      stroke: "var(--signal)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "210,112 206.5,105.5 213.5,105.5",
      fill: "var(--signal)",
    }),
    h("line", {
      x1: 226,
      y1: 112,
      x2: 226,
      y2: 78,
      stroke: "var(--ink-soft)",
      strokeWidth: 1,
      strokeDasharray: "3 2",
    }),
    h("polygon", {
      points: "226,78 222.5,84.5 229.5,84.5",
      fill: "var(--ink-soft)",
    }),
    h(
      "text",
      {
        x: 198,
        y: 99,
        textAnchor: "end",
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      "plain-English ask \u2193",
    ),
    h(
      "text",
      {
        x: 238,
        y: 99,
        textAnchor: "start",
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      "\u2191 status + ambiguous calls",
    ),
    h("rect", {
      x: 16,
      y: 112,
      width: 404,
      height: 72,
      fill: "var(--paper)",
      stroke: "var(--signal)",
      strokeWidth: 1,
    }),
    h("circle", {
      cx: 32,
      cy: 131,
      r: 3.5,
      fill: "var(--signal)",
    }),
    h(
      "text",
      {
        x: 44,
        y: 135,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
      },
      spec.supervisor.badge,
    ),
    h(
      "text",
      {
        x: 32,
        y: 154,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 13.5,
        fontWeight: 600,
      },
      spec.supervisor.title,
    ),
    h(
      "text",
      {
        x: 32,
        y: 172,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.supervisor.detail,
    ),
    h("line", {
      x1: 420,
      y1: 148,
      x2: 436,
      y2: 148,
      stroke: "var(--rule)",
      strokeWidth: 1,
      strokeDasharray: "3 3",
    }),
    h("rect", {
      x: 436,
      y: 112,
      width: 188,
      height: 72,
      fill: "var(--paper-2)",
      stroke: "var(--rule)",
      strokeWidth: 1,
      strokeDasharray: "4 3",
    }),
    h(
      "text",
      {
        x: 448,
        y: 135,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      spec.sideDomain.badge,
    ),
    h(
      "text",
      {
        x: 448,
        y: 154,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 13,
        fontWeight: 500,
      },
      spec.sideDomain.title,
    ),
    h(
      "text",
      {
        x: 448,
        y: 172,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.sideDomain.detail,
    ),
    h("line", {
      x1: 218,
      y1: 184,
      x2: 218,
      y2: 200,
      stroke: "var(--signal)",
      strokeWidth: 1.25,
    }),
    h("line", {
      x1: 112,
      y1: 200,
      x2: 528,
      y2: 200,
      stroke: "var(--rule)",
      strokeWidth: 1.25,
    }),
    [112, 320, 528].map((cx) =>
      h(
        "g",
        {
          key: cx,
        },
        h("line", {
          x1: cx,
          y1: 200,
          x2: cx,
          y2: 222,
          stroke: "var(--signal)",
          strokeWidth: 1.25,
        }),
        h("polygon", {
          points: `${cx},222 ${cx - 3.5},215.5 ${cx + 3.5},215.5`,
          fill: "var(--signal)",
        }),
      ),
    ),
    h("rect", {
      x: 140,
      y: 191,
      width: 360,
      height: 18,
      fill: "var(--paper-2)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 320,
        y: 203.5,
        textAnchor: "middle",
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.06em",
      },
      spec.dispatchLabel,
    ),
    spec.workers.map((worker, idx) => {
      const bx = bayXs[idx];
      return h(
        "g",
        {
          key: worker.slot,
        },
        h("rect", {
          x: bx,
          y: 222,
          width: 192,
          height: 108,
          fill: "var(--paper)",
          stroke: "var(--rule)",
          strokeWidth: 1,
          strokeDasharray: "5 3",
        }),
        h("rect", {
          x: bx,
          y: 222,
          width: 192,
          height: 24,
          fill: "var(--paper-2)",
          stroke: "var(--rule)",
          strokeWidth: 1,
        }),
        h(
          "text",
          {
            x: bx + 10,
            y: 238,
            fill: "var(--signal)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            fontWeight: 500,
            letterSpacing: "0.05em",
          },
          worker.slot,
        ),
        h(
          "text",
          {
            x: bx + 12,
            y: 264,
            fill: "var(--ink)",
            fontFamily: "var(--font-display)",
            fontSize: 13.5,
            fontWeight: 600,
          },
          worker.family,
        ),
        h(
          "text",
          {
            x: bx + 12,
            y: 282,
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          },
          worker.models,
        ),
        h(
          "text",
          {
            x: bx + 12,
            y: 301,
            fill: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
          },
          worker.duty,
        ),
        h(
          "text",
          {
            x: bx + 12,
            y: 318,
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
          },
          worker.guardrail,
        ),
      );
    }),
    [112, 320, 528].map((cx) =>
      h("line", {
        key: cx,
        x1: cx,
        y1: 330,
        x2: cx,
        y2: 342,
        stroke: "var(--rule)",
        strokeWidth: 1.25,
      }),
    ),
    h("line", {
      x1: 112,
      y1: 342,
      x2: 528,
      y2: 342,
      stroke: "var(--rule)",
      strokeWidth: 1.25,
    }),
    h("line", {
      x1: 320,
      y1: 342,
      x2: 320,
      y2: 356,
      stroke: "var(--moss)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "320,356 316.5,349.5 323.5,349.5",
      fill: "var(--moss)",
    }),
    h("rect", {
      x: 16,
      y: 356,
      width: 608,
      height: 68,
      fill: "var(--paper)",
      stroke: "var(--ink)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 16,
      y: 356,
      width: 3,
      height: 68,
      fill: "var(--moss)",
    }),
    h("circle", {
      cx: 32,
      cy: 375,
      r: 3.5,
      fill: "var(--moss)",
    }),
    h(
      "text",
      {
        x: 44,
        y: 379,
        fill: "var(--moss)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
      },
      spec.pipeline.badge,
    ),
    h(
      "text",
      {
        x: 32,
        y: 398,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 13,
        fontWeight: 600,
      },
      spec.pipeline.title,
    ),
    h(
      "text",
      {
        x: 32,
        y: 415,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.pipeline.detail,
    ),
  );
}
function TopologyMobileSvg({
  spec,
  titleId,
  descId,
}: {
  spec: TopologyDiagramSpec;
  titleId: string;
  descId: string;
}): React.ReactElement {
  return h(
    "svg",
    {
      className: "cs-diagram-svg cs-diagram-svg--mobile",
      viewBox: "0 0 320 538",
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
    },
    h(
      "title",
      {
        id: titleId,
      },
      spec.title,
    ),
    h(
      "desc",
      {
        id: descId,
      },
      spec.description,
    ),
    h("rect", {
      x: 10,
      y: 10,
      width: 300,
      height: 70,
      fill: "var(--paper)",
      stroke: "var(--ink)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 10,
      y: 10,
      width: 300,
      height: 2.5,
      fill: "var(--signal)",
    }),
    h("circle", {
      cx: 24,
      cy: 28,
      r: 3.5,
      fill: "var(--signal)",
    }),
    h(
      "text",
      {
        x: 34,
        y: 32,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      spec.director.badge,
    ),
    h(
      "text",
      {
        x: 22,
        y: 51,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 12.5,
        fontWeight: 600,
      },
      "Plain-English direction + merge gate",
    ),
    h(
      "text",
      {
        x: 22,
        y: 68,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      "No agent can merge to live site alone",
    ),
    h("line", {
      x1: 160,
      y1: 80,
      x2: 160,
      y2: 104,
      stroke: "var(--signal)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "160,104 156.5,97.5 163.5,97.5",
      fill: "var(--signal)",
    }),
    h(
      "text",
      {
        x: 150,
        y: 96,
        textAnchor: "end",
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
      },
      "ask \u2193",
    ),
    h(
      "text",
      {
        x: 170,
        y: 96,
        textAnchor: "start",
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
      },
      "\u2191 report + questions",
    ),
    h("rect", {
      x: 10,
      y: 104,
      width: 300,
      height: 72,
      fill: "var(--paper)",
      stroke: "var(--signal)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 22,
        y: 124,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      "FIRST MATE \u00B7 SINGLE CONTACT",
    ),
    h(
      "text",
      {
        x: 22,
        y: 143,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 12.5,
        fontWeight: 600,
      },
      "Scopes job, writes brief, picks model",
    ),
    h(
      "text",
      {
        x: 22,
        y: 161,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      "Open-source firstmate \u00B7 never edits site",
    ),
    h("rect", {
      x: 10,
      y: 184,
      width: 300,
      height: 44,
      fill: "var(--paper-2)",
      stroke: "var(--rule)",
      strokeWidth: 1,
      strokeDasharray: "4 3",
    }),
    h(
      "text",
      {
        x: 22,
        y: 202,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
      },
      "SECOND MATE \u00B7 LOCAL-MODEL LAB DOMAIN",
    ),
    h(
      "text",
      {
        x: 22,
        y: 218,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      "Separate crew & queue \u00B7 never shares site queue",
    ),
    h("line", {
      x1: 160,
      y1: 228,
      x2: 160,
      y2: 250,
      stroke: "var(--signal)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "160,250 156.5,243.5 163.5,243.5",
      fill: "var(--signal)",
    }),
    h("rect", {
      x: 10,
      y: 250,
      width: 300,
      height: 186,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
      strokeDasharray: "5 3",
    }),
    h("rect", {
      x: 10,
      y: 250,
      width: 300,
      height: 24,
      fill: "var(--paper-2)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 22,
        y: 266,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.05em",
      },
      "ISOLATED REPO COPIES (OWN PORT EACH)",
    ),
    spec.workers.map((worker, idx) => {
      const wy = 282 + idx * 50;
      return h(
        "g",
        {
          key: worker.slot,
        },
        h("rect", {
          x: 20,
          y: wy,
          width: 280,
          height: 44,
          fill: "var(--paper-2)",
          stroke: "var(--rule)",
          strokeWidth: 1,
        }),
        h(
          "text",
          {
            x: 30,
            y: wy + 18,
            fill: "var(--ink)",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
          },
          worker.family,
          " \u00B7 ",
          worker.models,
        ),
        h(
          "text",
          {
            x: 30,
            y: wy + 34,
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
          },
          worker.duty,
          " (",
          worker.guardrail,
          ")",
        ),
      );
    }),
    h("line", {
      x1: 160,
      y1: 436,
      x2: 160,
      y2: 456,
      stroke: "var(--moss)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "160,456 156.5,449.5 163.5,449.5",
      fill: "var(--moss)",
    }),
    h("rect", {
      x: 10,
      y: 456,
      width: 300,
      height: 72,
      fill: "var(--paper)",
      stroke: "var(--moss)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 10,
      y: 456,
      width: 3,
      height: 72,
      fill: "var(--moss)",
    }),
    h(
      "text",
      {
        x: 22,
        y: 476,
        fill: "var(--moss)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      "NO-MISTAKES + VERIFY-ALL \u2192 MERGE GATE",
    ),
    h(
      "text",
      {
        x: 22,
        y: 495,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 12,
        fontWeight: 600,
      },
      "Codex reviews Claude/Gemini + 6 checks",
    ),
    h(
      "text",
      {
        x: 22,
        y: 513,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      "Korab approves \u2192 1-by-1 merge \u2192 Vercel",
    ),
  );
}
function PipelineDesktopSvg({
  spec,
  titleId,
  descId,
}: {
  spec: PipelineDiagramSpec;
  titleId: string;
  descId: string;
}): React.ReactElement {
  const stageXs = [16, 226, 436] as const;
  return h(
    "svg",
    {
      className: "cs-diagram-svg cs-diagram-svg--desktop",
      viewBox: "0 0 640 426",
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
    },
    h(
      "title",
      {
        id: titleId,
      },
      spec.title,
    ),
    h(
      "desc",
      {
        id: descId,
      },
      spec.description,
    ),
    spec.topStages.map((stage, idx) => {
      const sx = stageXs[idx];
      const borderStroke =
        stage.tone === "signal" ? "var(--signal)" : "var(--rule)";
      return h(
        "g",
        {
          key: stage.step,
        },
        h("rect", {
          x: sx,
          y: 12,
          width: 188,
          height: 96,
          fill: "var(--paper)",
          stroke: borderStroke,
          strokeWidth: 1,
        }),
        stage.tone === "signal" &&
          h("rect", {
            x: sx,
            y: 12,
            width: 188,
            height: 2.5,
            fill: "var(--signal)",
          }),
        h(
          "text",
          {
            x: sx + 12,
            y: 32,
            fill: "var(--signal)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.06em",
          },
          stage.step,
        ),
        h(
          "text",
          {
            x: sx + 12,
            y: 52,
            fill: "var(--ink)",
            fontFamily: "var(--font-display)",
            fontSize: 13.5,
            fontWeight: 600,
          },
          stage.title,
        ),
        h(
          "text",
          {
            x: sx + 12,
            y: 72,
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
          },
          stage.line1,
        ),
        h(
          "text",
          {
            x: sx + 12,
            y: 88,
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
          },
          stage.line2,
        ),
      );
    }),
    [204, 414].map((ax) =>
      h(
        "g",
        {
          key: ax,
        },
        h("line", {
          x1: ax,
          y1: 60,
          x2: ax + 22,
          y2: 60,
          stroke: "var(--signal)",
          strokeWidth: 1.25,
        }),
        h("polygon", {
          points: `${ax + 22},60 ${ax + 15.5},56.5 ${ax + 15.5},63.5`,
          fill: "var(--signal)",
        }),
      ),
    ),
    h("line", {
      x1: 530,
      y1: 108,
      x2: 530,
      y2: 132,
      stroke: "var(--signal)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "530,132 526.5,125.5 533.5,125.5",
      fill: "var(--signal)",
    }),
    h("rect", {
      x: 16,
      y: 132,
      width: 608,
      height: 108,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 30,
        y: 152,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      spec.triageGate.step,
    ),
    h("rect", {
      x: 30,
      y: 164,
      width: 282,
      height: 62,
      fill: "var(--paper-2)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 42,
        y: 182,
        fill: "var(--ink)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
      },
      spec.triageGate.clearBranch.badge,
    ),
    h(
      "text",
      {
        x: 42,
        y: 200,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.triageGate.clearBranch.line1,
    ),
    h(
      "text",
      {
        x: 42,
        y: 215,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.triageGate.clearBranch.line2,
    ),
    h("rect", {
      x: 328,
      y: 164,
      width: 282,
      height: 62,
      fill: "var(--paper-2)",
      stroke: "var(--signal)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 340,
        y: 182,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
      },
      spec.triageGate.ambiguousBranch.badge,
    ),
    h(
      "text",
      {
        x: 340,
        y: 200,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.triageGate.ambiguousBranch.line1,
    ),
    h(
      "text",
      {
        x: 340,
        y: 215,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
      },
      spec.triageGate.ambiguousBranch.line2,
    ),
    h("line", {
      x1: 196,
      y1: 240,
      x2: 196,
      y2: 262,
      stroke: "var(--signal)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "196,262 192.5,255.5 199.5,255.5",
      fill: "var(--signal)",
    }),
    h("rect", {
      x: 16,
      y: 262,
      width: 364,
      height: 152,
      fill: "var(--paper)",
      stroke: "var(--ink)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 30,
        y: 282,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      spec.verifyStage.step,
    ),
    h(
      "text",
      {
        x: 30,
        y: 301,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 13,
        fontWeight: 600,
      },
      spec.verifyStage.title,
    ),
    spec.verifyStage.checks.map((check, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 30 + col * 170;
      const cy = 313 + row * 30;
      return h(
        "g",
        {
          key: check,
        },
        h("rect", {
          x: cx,
          y: cy,
          width: 162,
          height: 24,
          fill: "var(--paper-2)",
          stroke: "var(--rule)",
          strokeWidth: 1,
        }),
        h("circle", {
          cx: cx + 11,
          cy: cy + 12,
          r: 2.5,
          fill: "var(--moss)",
        }),
        h(
          "text",
          {
            x: cx + 20,
            y: cy + 15.5,
            fill: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 500,
          },
          check,
        ),
      );
    }),
    h("line", {
      x1: 380,
      y1: 338,
      x2: 402,
      y2: 338,
      stroke: "var(--moss)",
      strokeWidth: 1.5,
    }),
    h("polygon", {
      points: "402,338 395.5,334.5 395.5,341.5",
      fill: "var(--moss)",
    }),
    h("rect", {
      x: 402,
      y: 262,
      width: 222,
      height: 152,
      fill: "var(--paper)",
      stroke: "var(--moss)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 402,
      y: 262,
      width: 222,
      height: 2.5,
      fill: "var(--moss)",
    }),
    h(
      "text",
      {
        x: 416,
        y: 282,
        fill: "var(--moss)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      spec.deployStage.step,
    ),
    h(
      "text",
      {
        x: 416,
        y: 301,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 13.5,
        fontWeight: 600,
      },
      spec.deployStage.title,
    ),
    spec.deployStage.bullets.map((bullet, idx) =>
      h(
        "text",
        {
          key: bullet,
          x: 416,
          y: 324 + idx * 19,
          fill: "var(--ink-soft)",
          fontFamily: "var(--font-mono)",
          fontSize: 9.2,
        },
        bullet,
      ),
    ),
    h("rect", {
      x: 416,
      y: 376,
      width: 194,
      height: 24,
      fill: "var(--paper-2)",
      stroke: "var(--moss)",
      strokeWidth: 1,
    }),
    h("circle", {
      cx: 430,
      cy: 388,
      r: 3.5,
      fill: "var(--moss)",
    }),
    h(
      "text",
      {
        x: 442,
        y: 391.5,
        fill: "var(--moss)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      spec.deployStage.badge,
    ),
  );
}
function PipelineMobileSvg({
  spec,
  titleId,
  descId,
}: {
  spec: PipelineDiagramSpec;
  titleId: string;
  descId: string;
}): React.ReactElement {
  return h(
    "svg",
    {
      className: "cs-diagram-svg cs-diagram-svg--mobile",
      viewBox: "0 0 320 564",
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
    },
    h(
      "title",
      {
        id: titleId,
      },
      spec.title,
    ),
    h(
      "desc",
      {
        id: descId,
      },
      spec.description,
    ),
    spec.topStages.map((stage, idx) => {
      const sy = 10 + idx * 74;
      return h(
        "g",
        {
          key: stage.step,
        },
        h("rect", {
          x: 10,
          y: sy,
          width: 300,
          height: 58,
          fill: "var(--paper)",
          stroke: stage.tone === "signal" ? "var(--signal)" : "var(--rule)",
          strokeWidth: 1,
        }),
        h(
          "text",
          {
            x: 22,
            y: sy + 18,
            fill: "var(--signal)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            fontWeight: 500,
          },
          stage.step,
          " \u00B7 ",
          stage.actor.toUpperCase(),
        ),
        h(
          "text",
          {
            x: 22,
            y: sy + 36,
            fill: "var(--ink)",
            fontFamily: "var(--font-display)",
            fontSize: 12.5,
            fontWeight: 600,
          },
          stage.title,
        ),
        h(
          "text",
          {
            x: 22,
            y: sy + 50,
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9.2,
          },
          stage.line1,
          " \u00B7 ",
          stage.line2,
        ),
        h("line", {
          x1: 160,
          y1: sy + 58,
          x2: 160,
          y2: sy + 74,
          stroke: "var(--signal)",
          strokeWidth: 1.25,
        }),
        h("polygon", {
          points: `160,${sy + 74} 156.5,${sy + 67.5} 163.5,${sy + 67.5}`,
          fill: "var(--signal)",
        }),
      );
    }),
    h("rect", {
      x: 10,
      y: 232,
      width: 300,
      height: 102,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 22,
        y: 250,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
      },
      "04 \u00B7 REVIEW FINDINGS TRIAGE GATE",
    ),
    h("rect", {
      x: 20,
      y: 258,
      width: 280,
      height: 32,
      fill: "var(--paper-2)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 28,
        y: 272,
        fill: "var(--ink)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 500,
      },
      "CLEAR FINDINGS \u2192 First mate decides",
    ),
    h(
      "text",
      {
        x: 28,
        y: 285,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.8,
      },
      "Worker fixes in isolated copy & re-runs review",
    ),
    h("rect", {
      x: 20,
      y: 294,
      width: 280,
      height: 32,
      fill: "var(--paper-2)",
      stroke: "var(--signal)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 28,
        y: 308,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 500,
      },
      "AMBIGUOUS CALLS \u2192 Escalated to Korab",
    ),
    h(
      "text",
      {
        x: 28,
        y: 321,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.8,
      },
      "Asked in plain English; waits for Korab's decision",
    ),
    h("line", {
      x1: 160,
      y1: 334,
      x2: 160,
      y2: 350,
      stroke: "var(--signal)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "160,350 156.5,343.5 163.5,343.5",
      fill: "var(--signal)",
    }),
    h("rect", {
      x: 10,
      y: 350,
      width: 300,
      height: 118,
      fill: "var(--paper)",
      stroke: "var(--ink)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 22,
        y: 368,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
      },
      "05 \u00B7 VERIFY-ALL REQUIRED SITE SUITE",
    ),
    spec.verifyStage.checks.map((check, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 20 + col * 142;
      const cy = 378 + row * 27;
      return h(
        "g",
        {
          key: check,
        },
        h("rect", {
          x: cx,
          y: cy,
          width: 136,
          height: 22,
          fill: "var(--paper-2)",
          stroke: "var(--rule)",
          strokeWidth: 1,
        }),
        h("circle", {
          cx: cx + 9,
          cy: cy + 11,
          r: 2.2,
          fill: "var(--moss)",
        }),
        h(
          "text",
          {
            x: cx + 16,
            y: cy + 14.5,
            fill: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 8.2,
            fontWeight: 500,
          },
          check,
        ),
      );
    }),
    h("line", {
      x1: 160,
      y1: 468,
      x2: 160,
      y2: 484,
      stroke: "var(--moss)",
      strokeWidth: 1.25,
    }),
    h("polygon", {
      points: "160,484 156.5,477.5 163.5,477.5",
      fill: "var(--moss)",
    }),
    h("rect", {
      x: 10,
      y: 484,
      width: 300,
      height: 70,
      fill: "var(--paper)",
      stroke: "var(--moss)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 10,
      y: 484,
      width: 300,
      height: 2.5,
      fill: "var(--moss)",
    }),
    h("circle", {
      cx: 24,
      cy: 502,
      r: 3.5,
      fill: "var(--moss)",
    }),
    h(
      "text",
      {
        x: 34,
        y: 506,
        fill: "var(--moss)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
      },
      "06 \u00B7 KORAB APPROVAL \u2192 VERCEL DEPLOY",
    ),
    h(
      "text",
      {
        x: 22,
        y: 525,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 12,
        fontWeight: 600,
      },
      "Merged 1 at a time onto main (~10m CI each)",
    ),
    h(
      "text",
      {
        x: 22,
        y: 542,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.2,
      },
      "File list checked \u2192 re-verified \u2192 live on Vercel",
    ),
  );
}
function TelemetryDesktopSvg({
  spec,
  titleId,
  descId,
}: {
  spec: TelemetryDiagramSpec;
  titleId: string;
  descId: string;
}): React.ReactElement {
  const kpiXs = [16, 223, 430] as const;
  const chartBottom = 250;
  const pxPerMerge = 9.5;
  return h(
    "svg",
    {
      className: "cs-diagram-svg cs-diagram-svg--desktop",
      viewBox: "0 0 640 432",
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
    },
    h(
      "title",
      {
        id: titleId,
      },
      spec.title,
    ),
    h(
      "desc",
      {
        id: descId,
      },
      spec.description,
    ),
    spec.kpis.map((kpi, idx) => {
      const kx = kpiXs[idx];
      const strokeColor =
        kpi.tone === "signal"
          ? "var(--signal)"
          : kpi.tone === "moss"
            ? "var(--moss)"
            : "var(--rule)";
      const labelColor =
        kpi.tone === "signal"
          ? "var(--signal)"
          : kpi.tone === "moss"
            ? "var(--moss)"
            : "var(--ink-soft)";
      return h(
        "g",
        {
          key: kpi.label,
        },
        h("rect", {
          x: kx,
          y: 12,
          width: 194,
          height: 62,
          fill: "var(--paper)",
          stroke: strokeColor,
          strokeWidth: 1,
        }),
        h(
          "text",
          {
            x: kx + 12,
            y: 30,
            fill: labelColor,
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            fontWeight: 500,
            letterSpacing: "0.06em",
          },
          kpi.label,
        ),
        h(
          "text",
          {
            x: kx + 12,
            y: 51,
            fill: kpi.tone === "signal" ? "var(--signal)" : "var(--ink)",
            fontFamily: "var(--font-display)",
            fontSize: 16.5,
            fontWeight: 700,
          },
          kpi.value,
        ),
        h(
          "text",
          {
            x: kx + 12,
            y: 66,
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
          },
          kpi.sub,
        ),
      );
    }),
    h("rect", {
      x: 16,
      y: 86,
      width: 608,
      height: 196,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 30,
        y: 106,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.06em",
      },
      "DAILY MERGED PULL REQUESTS \u00B7 OCT 01 TO OCT 17",
    ),
    h("rect", {
      x: 372,
      y: 98,
      width: 8,
      height: 8,
      fill: "var(--signal)",
    }),
    h(
      "text",
      {
        x: 384,
        y: 105.5,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
      },
      "2 Oct burst (11+1)",
    ),
    h("rect", {
      x: 494,
      y: 98,
      width: 8,
      height: 8,
      fill: "var(--moss)",
    }),
    h(
      "text",
      {
        x: 506,
        y: 105.5,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
      },
      "Shipped waves",
    ),
    [0, 4, 8, 12].map((tick) => {
      const gy = chartBottom - tick * pxPerMerge;
      return h(
        "g",
        {
          key: tick,
        },
        h("line", {
          x1: 48,
          y1: gy,
          x2: 606,
          y2: gy,
          stroke: "var(--rule)",
          strokeWidth: 1,
          strokeDasharray: tick === 0 ? undefined : "2 3",
        }),
        h(
          "text",
          {
            x: 40,
            y: gy + 3.5,
            textAnchor: "end",
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
          },
          tick,
        ),
      );
    }),
    spec.days.map((d, idx) => {
      const bx = 58 + idx * 32;
      const barW = 20;
      const barH = d.total * pxPerMerge;
      const by = chartBottom - barH;
      const barFill =
        d.tone === "burst"
          ? "var(--signal)"
          : d.tone === "audit"
            ? "var(--ink-soft)"
            : "var(--moss)";
      return h(
        "g",
        {
          key: d.dateISO,
        },
        d.total > 0
          ? h(
              React.Fragment,
              null,
              h("rect", {
                x: bx,
                y: by,
                width: barW,
                height: barH,
                fill: barFill,
              }),
              d.automatedDeps &&
                d.automatedDeps > 0 &&
                h("rect", {
                  x: bx,
                  y: by,
                  width: barW,
                  height: d.automatedDeps * pxPerMerge,
                  fill: "var(--paper-2)",
                  stroke: "var(--signal)",
                  strokeWidth: 1.25,
                }),
              h(
                "text",
                {
                  x: bx + barW / 2,
                  y: by - 5,
                  textAnchor: "middle",
                  fill: d.tone === "burst" ? "var(--signal)" : "var(--ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  fontWeight: 600,
                },
                d.total,
              ),
            )
          : h("rect", {
              x: bx + 4,
              y: chartBottom - 2,
              width: barW - 8,
              height: 2,
              fill: "var(--rule)",
            }),
        h(
          "text",
          {
            x: bx + barW / 2,
            y: chartBottom + 16,
            textAnchor: "middle",
            fill: d.tone === "burst" ? "var(--signal)" : "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: d.tone === "burst" ? 600 : 400,
          },
          d.day,
        ),
      );
    }),
    h("line", {
      x1: 116,
      y1: 142,
      x2: 156,
      y2: 142,
      stroke: "var(--signal)",
      strokeWidth: 1,
    }),
    h("rect", {
      x: 156,
      y: 128,
      width: 236,
      height: 28,
      fill: "var(--paper-2)",
      stroke: "var(--signal)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 166,
        y: 145.5,
        fill: "var(--ink)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.2,
      },
      "2 Oct: 11 agent fixes + 1 dep update",
    ),
    h("rect", {
      x: 16,
      y: 294,
      width: 608,
      height: 126,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 30,
        y: 314,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 500,
        letterSpacing: "0.05em",
      },
      spec.breakdownTitle,
    ),
    spec.breakdownItems.map((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ix = 30 + col * 296;
      const iy = 324 + row * 29;
      return h(
        "g",
        {
          key: item.tag,
        },
        h("rect", {
          x: ix,
          y: iy,
          width: 284,
          height: 24,
          fill: "var(--paper-2)",
          stroke: "var(--rule)",
          strokeWidth: 1,
        }),
        h(
          "text",
          {
            x: ix + 8,
            y: iy + 15.5,
            fill: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 8.8,
          },
          h(
            "tspan",
            {
              fill: "var(--signal)",
              fontWeight: 500,
            },
            item.tag,
            ":",
          ),
          " ",
          item.summary,
        ),
      );
    }),
  );
}
function TelemetryMobileSvg({
  spec,
  titleId,
  descId,
}: {
  spec: TelemetryDiagramSpec;
  titleId: string;
  descId: string;
}): React.ReactElement {
  const chartBottom = 270;
  const pxPerMerge = 8.5;
  return h(
    "svg",
    {
      className: "cs-diagram-svg cs-diagram-svg--mobile",
      viewBox: "0 0 320 518",
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
    },
    h(
      "title",
      {
        id: titleId,
      },
      spec.title,
    ),
    h(
      "desc",
      {
        id: descId,
      },
      spec.description,
    ),
    h("rect", {
      x: 10,
      y: 10,
      width: 146,
      height: 54,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 20,
        y: 26,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.8,
        fontWeight: 500,
      },
      "1 OCT \u00B7 TRIGGER",
    ),
    h(
      "text",
      {
        x: 20,
        y: 44,
        fill: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 700,
      },
      "Audit + 3 PRs",
    ),
    h(
      "text",
      {
        x: 20,
        y: 57,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.2,
      },
      "Site audit by first mate",
    ),
    h("rect", {
      x: 164,
      y: 10,
      width: 146,
      height: 54,
      fill: "var(--paper)",
      stroke: "var(--signal)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 174,
        y: 26,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.8,
        fontWeight: 500,
      },
      "2 OCT \u00B7 BURST",
    ),
    h(
      "text",
      {
        x: 174,
        y: 44,
        fill: "var(--signal)",
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 700,
      },
      "12 merges",
    ),
    h(
      "text",
      {
        x: 174,
        y: 57,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.2,
      },
      "11 agent + 1 dep update",
    ),
    h("rect", {
      x: 10,
      y: 70,
      width: 300,
      height: 40,
      fill: "var(--paper)",
      stroke: "var(--moss)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 20,
        y: 86,
        fill: "var(--moss)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.8,
        fontWeight: 500,
      },
      "1\u201317 OCT TOTAL: 27 PRS MERGED",
    ),
    h(
      "text",
      {
        x: 20,
        y: 101,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 8.8,
      },
      "Merged 1 at a time onto main (~10m CI each)",
    ),
    h("rect", {
      x: 10,
      y: 118,
      width: 300,
      height: 178,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 20,
        y: 136,
        fill: "var(--ink-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 500,
      },
      "MERGES PER DAY \u00B7 1 TO 17 OCT 2026 (UTC)",
    ),
    [0, 4, 8, 12].map((tick) => {
      const gy = chartBottom - tick * pxPerMerge;
      return h(
        "g",
        {
          key: tick,
        },
        h("line", {
          x1: 34,
          y1: gy,
          x2: 300,
          y2: gy,
          stroke: "var(--rule)",
          strokeWidth: 1,
          strokeDasharray: tick === 0 ? undefined : "2 3",
        }),
        h(
          "text",
          {
            x: 28,
            y: gy + 3,
            textAnchor: "end",
            fill: "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 8.5,
          },
          tick,
        ),
      );
    }),
    spec.days.map((d, idx) => {
      const bx = 38 + idx * 15.2;
      const barW = 10;
      const barH = d.total * pxPerMerge;
      const by = chartBottom - barH;
      const barFill =
        d.tone === "burst"
          ? "var(--signal)"
          : d.tone === "audit"
            ? "var(--ink-soft)"
            : "var(--moss)";
      const showDayLabel = idx === 0 || idx === 1 || idx === 2 || idx % 2 === 0;
      return h(
        "g",
        {
          key: d.dateISO,
        },
        d.total > 0
          ? h(
              React.Fragment,
              null,
              h("rect", {
                x: bx,
                y: by,
                width: barW,
                height: barH,
                fill: barFill,
              }),
              h(
                "text",
                {
                  x: bx + barW / 2,
                  y: by - 4,
                  textAnchor: "middle",
                  fill: d.tone === "burst" ? "var(--signal)" : "var(--ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 8.5,
                  fontWeight: 600,
                },
                d.total,
              ),
            )
          : h("rect", {
              x: bx + 2,
              y: chartBottom - 2,
              width: barW - 4,
              height: 2,
              fill: "var(--rule)",
            }),
        showDayLabel &&
          h(
            "text",
            {
              x: bx + barW / 2,
              y: chartBottom + 14,
              textAnchor: "middle",
              fill: d.tone === "burst" ? "var(--signal)" : "var(--ink-soft)",
              fontFamily: "var(--font-mono)",
              fontSize: 8,
            },
            d.day,
          ),
      );
    }),
    h("rect", {
      x: 10,
      y: 304,
      width: 300,
      height: 204,
      fill: "var(--paper)",
      stroke: "var(--rule)",
      strokeWidth: 1,
    }),
    h(
      "text",
      {
        x: 20,
        y: 322,
        fill: "var(--signal)",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 500,
      },
      "2 OCT BURST: 11 AGENT FIXES + 1 DEP UPDATE",
    ),
    spec.breakdownItems.map((item, idx) => {
      const iy = 330 + idx * 28;
      return h(
        "g",
        {
          key: item.tag,
        },
        h("rect", {
          x: 20,
          y: iy,
          width: 280,
          height: 23,
          fill: "var(--paper-2)",
          stroke: "var(--rule)",
          strokeWidth: 1,
        }),
        h(
          "text",
          {
            x: 28,
            y: iy + 14.5,
            fill: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 8.3,
          },
          h(
            "tspan",
            {
              fill: "var(--signal)",
              fontWeight: 500,
            },
            item.tag,
            ":",
          ),
          " ",
          item.summary,
        ),
      );
    }),
  );
}
export function CaseStudyDiagram(
  props: CaseStudyDiagramProps,
): React.ReactElement {
  const spec = resolveSpec(props);
  const baseId = `cs-diagram-${spec.id}`;
  const titleId = `${baseId}-title`;
  const captionId = `${baseId}-caption`;
  const desktopTitleId = `${baseId}-d-title`;
  const desktopDescId = `${baseId}-d-desc`;
  const mobileTitleId = `${baseId}-m-title`;
  const mobileDescId = `${baseId}-m-desc`;
  return h(
    "figure",
    {
      className: "cs-diagram",
      "data-diagram-id": spec.id,
      "data-diagram-variant": spec.variant,
      "aria-labelledby": titleId,
      "aria-describedby": captionId,
    },
    h(
      "div",
      {
        className: "cs-diagram-head",
      },
      h(
        "span",
        {
          className: "t-label cs-diagram-eyebrow",
        },
        spec.eyebrow,
      ),
      h(
        "span",
        {
          className: "t-mono small cs-diagram-meta",
        },
        spec.meta,
      ),
    ),
    h(
      "div",
      {
        className: "cs-diagram-title-bar",
      },
      h(
        "span",
        {
          id: titleId,
          className: "cs-diagram-title",
        },
        spec.title,
      ),
    ),
    h(
      "div",
      {
        className: "cs-diagram-canvas",
      },
      spec.variant === "topology" &&
        h(
          React.Fragment,
          null,
          h(TopologyDesktopSvg, {
            spec: spec,
            titleId: desktopTitleId,
            descId: desktopDescId,
          }),
          h(TopologyMobileSvg, {
            spec: spec,
            titleId: mobileTitleId,
            descId: mobileDescId,
          }),
        ),
      spec.variant === "pipeline" &&
        h(
          React.Fragment,
          null,
          h(PipelineDesktopSvg, {
            spec: spec,
            titleId: desktopTitleId,
            descId: desktopDescId,
          }),
          h(PipelineMobileSvg, {
            spec: spec,
            titleId: mobileTitleId,
            descId: mobileDescId,
          }),
        ),
      spec.variant === "telemetry" &&
        h(
          React.Fragment,
          null,
          h(TelemetryDesktopSvg, {
            spec: spec,
            titleId: desktopTitleId,
            descId: desktopDescId,
          }),
          h(TelemetryMobileSvg, {
            spec: spec,
            titleId: mobileTitleId,
            descId: mobileDescId,
          }),
        ),
    ),
    h(
      "figcaption",
      {
        id: captionId,
        className: "cs-diagram-caption",
      },
      spec.caption,
    ),
  );
}
