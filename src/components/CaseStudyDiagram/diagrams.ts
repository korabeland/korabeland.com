// Reusable diagram specifications and validated data for CaseStudyDiagram.
// Kept pure (no DOM or React imports) so both the Markdoc React renderer
// (src/components/PostContent.tsx) and the Ask corpus extractor
// (src/lib/ask/markdoc.ts) read from a single source of truth.

export interface TopologyWorkerLane {
  slot: string;
  family: string;
  models: string;
  duty: string;
  guardrail: string;
}

export interface TopologyDiagramSpec {
  id: string;
  variant: "topology";
  eyebrow: string;
  meta: string;
  title: string;
  description: string;
  caption: string;
  director: {
    badge: string;
    title: string;
    detail: string;
  };
  liveGate: {
    badge: string;
    title: string;
    detail: string;
  };
  supervisor: {
    badge: string;
    title: string;
    detail: string;
  };
  sideDomain: {
    badge: string;
    title: string;
    detail: string;
  };
  dispatchLabel: string;
  workers: readonly [
    TopologyWorkerLane,
    TopologyWorkerLane,
    TopologyWorkerLane,
  ];
  pipeline: {
    badge: string;
    title: string;
    detail: string;
  };
}

export interface PipelineStageSpec {
  step: string;
  actor: string;
  title: string;
  line1: string;
  line2: string;
  tone: "neutral" | "signal" | "moss";
}

export interface PipelineDiagramSpec {
  id: string;
  variant: "pipeline";
  eyebrow: string;
  meta: string;
  title: string;
  description: string;
  caption: string;
  topStages: readonly [PipelineStageSpec, PipelineStageSpec, PipelineStageSpec];
  triageGate: {
    step: string;
    title: string;
    clearBranch: {
      badge: string;
      line1: string;
      line2: string;
    };
    ambiguousBranch: {
      badge: string;
      line1: string;
      line2: string;
    };
  };
  verifyStage: {
    step: string;
    title: string;
    checks: readonly [string, string, string, string, string, string];
  };
  deployStage: {
    step: string;
    title: string;
    bullets: readonly [string, string, string];
    badge: string;
  };
}

export interface TelemetryDayDatum {
  day: string;
  dateISO: string;
  total: number;
  agentBuilt?: number;
  automatedDeps?: number;
  tone: "audit" | "burst" | "wave" | "quiet";
}

export interface TelemetryBreakdownItem {
  tag: string;
  summary: string;
}

export interface TelemetryDiagramSpec {
  id: string;
  variant: "telemetry";
  eyebrow: string;
  meta: string;
  title: string;
  description: string;
  caption: string;
  kpis: readonly [
    {
      label: string;
      value: string;
      sub: string;
      tone: "neutral" | "signal" | "moss";
    },
    {
      label: string;
      value: string;
      sub: string;
      tone: "neutral" | "signal" | "moss";
    },
    {
      label: string;
      value: string;
      sub: string;
      tone: "neutral" | "signal" | "moss";
    },
  ];
  days: readonly TelemetryDayDatum[];
  breakdownTitle: string;
  breakdownItems: readonly [
    TelemetryBreakdownItem,
    TelemetryBreakdownItem,
    TelemetryBreakdownItem,
    TelemetryBreakdownItem,
    TelemetryBreakdownItem,
    TelemetryBreakdownItem,
  ];
}

export type CaseStudyDiagramSpec =
  | TopologyDiagramSpec
  | PipelineDiagramSpec
  | TelemetryDiagramSpec;

export const CASE_STUDY_DIAGRAMS: Readonly<
  Record<string, CaseStudyDiagramSpec>
> = {
  "ai-crew-topology": {
    id: "ai-crew-topology",
    variant: "topology",
    eyebrow: "fig 01 · crew command topology",
    meta: "1 human director · 1 supervisor · isolated repo copies",
    title: "Who does what across the site crew",
    description:
      "Command diagram showing Korab as director and final merge gate at the top, the first mate supervisor as single point of contact in the middle with a separate second mate for the local-model lab, three isolated worker copies running Anthropic Claude, Google Gemini Argon, and OpenAI Codex with their own ports, and the no-mistakes and verify-all review pipeline feeding back to Korab for merge approval.",
    caption:
      "Korab directs in plain English and approves every merge. The first mate routes work across isolated repository copies by task type and model strengths, while a separate second mate runs the local-model lab queue.",
    director: {
      badge: "KORAB · DIRECTOR + MERGE GATE",
      title: "Plain-English direction, product calls, merge sign-off",
      detail: "Does not hand-write code · no agent merges to the site alone",
    },
    liveGate: {
      badge: "LIVE SITE GATE",
      title: "korabeland.com",
      detail: "1-by-1 merge → Vercel",
    },
    supervisor: {
      badge: "FIRST MATE · SINGLE POINT OF CONTACT",
      title: "Scopes tasks, writes briefs, picks models, supervises",
      detail: "Built on open-source firstmate · never edits site code itself",
    },
    sideDomain: {
      badge: "SECOND MATE · SEPARATE",
      title: "Local-model lab crew",
      detail: "Own queue · never shares",
    },
    dispatchLabel: "ISOLATED REPO COPIES · OWN GIT WORKTREE + OWN PORT EACH",
    workers: [
      {
        slot: "COPY 01 · WORKTREE + PORT",
        family: "Anthropic Claude",
        models: "Sonnet · Haiku · Opus",
        duty: "UI, components, refactors",
        guardrail: "Own copy + port",
      },
      {
        slot: "COPY 02 · WORKTREE + PORT",
        family: "Google Gemini",
        models: "Gemini Argon",
        duty: "Prose & case study drafts",
        guardrail: "Drafted this page",
      },
      {
        slot: "COPY 03 · WORKTREE + PORT",
        family: "OpenAI Codex",
        models: "Codex models",
        duty: "Tooling, tests & review",
        guardrail: "Cross-family review",
      },
    ],
    pipeline: {
      badge: "AUTOMATED PIPELINE · NO-MISTAKES + VERIFY-ALL",
      title:
        "Cross-family code review (Codex checks Claude/Gemini) + full site test suite",
      detail:
        "Clear findings: first mate decides · Ambiguous calls: asked to Korab · Merge: Korab approves",
    },
  },
  "ai-crew-pipeline": {
    id: "ai-crew-pipeline",
    variant: "pipeline",
    eyebrow: "fig 02 · request-to-deploy flow",
    meta: "6 stages · cross-family review · ~10m serial ci",
    title: "How one request travels from plain-English ask to live deploy",
    description:
      "Six-stage flow diagram tracing a change from Korab's plain-English request, to the first mate writing instructions and starting an isolated worker, to the worker building and running no-mistakes with cross-family code review, through the review triage gate where clear findings are handled by the first mate and ambiguous questions go to Korab, through the six verify-all checks, to Korab's merge approval and one-at-a-time deployment on Vercel.",
    caption:
      "Every change passes two independent gates before Korab approves the merge: cross-family review in no-mistakes (where a Codex model reviews Claude or Gemini work) and the six-part verify-all suite.",
    topStages: [
      {
        step: "01 · KORAB ASK",
        actor: "Human direction",
        title: "Plain-English request",
        line1: 'e.g. "printable resume"',
        line2: "sets product & design",
        tone: "signal",
      },
      {
        step: "02 · FIRSTMATE BRIEF",
        actor: "Supervisor routing",
        title: "Written brief + model pick",
        line1: "Routes by task + model",
        line2: "starts fresh repo copy",
        tone: "neutral",
      },
      {
        step: "03 · BUILD + REVIEW",
        actor: "Worker + no-mistakes",
        title: "Isolated build + review",
        line1: "Codex reviews Claude/Gemini",
        line2: "tests, lint, PR & CI",
        tone: "neutral",
      },
    ],
    triageGate: {
      step: "04 · REVIEW FINDINGS TRIAGE GATE (NO SELF-CERTIFICATION)",
      title: "How review findings are resolved before merge",
      clearBranch: {
        badge: "PATH A · CLEAR TECHNICAL FINDINGS",
        line1: "First mate decides directly; worker fixes",
        line2: "inside its isolated copy and re-runs checks",
      },
      ambiguousBranch: {
        badge: "PATH B · AMBIGUOUS PRODUCT OR DESIGN CALLS",
        line1: "Worker pauses; first mate asks Korab a",
        line2: "plain-English question and waits for his call",
      },
    },
    verifyStage: {
      step: "05 · VERIFY-ALL REQUIRED CHECK SUITE",
      title: "All six site checks must pass on the pull request",
      checks: [
        "DEP SECURITY AUDIT",
        "TYPE + CONTENT CHECK",
        "VITEST UNIT SUITE",
        "PLAYWRIGHT BROWSER",
        "LIGHTHOUSE BUDGETS",
        "BUILT-SITE SMOKE",
      ],
    },
    deployStage: {
      step: "06 · APPROVAL + SERIAL MERGE",
      title: "Korab approves the merge",
      bullets: [
        "1. File list checked for scratch",
        "2. Merged 1 at a time (~10m CI)",
        "3. Re-checked on main each merge",
      ],
      badge: "VERCEL DEPLOYS LIVE",
    },
  },
  "ai-crew-october-merges": {
    id: "ai-crew-october-merges",
    variant: "telemetry",
    eyebrow: "fig 03 · merge cadence · 1 to 17 oct 2026 (utc)",
    meta: "27 prs merged · 12 on 2 oct",
    title: "The 1 October audit and the 12-merge burst the next day",
    description:
      "Bar chart of daily merged pull requests on korabeland/korabeland.com from 1 to 17 October 2026 (UTC), totaling 27 pull requests: 3 merges on 1 October alongside the site audit, a burst of 12 merges on 2 October (11 built by agents from the audit plus 1 automated dependency update), 2 merges on 3 October, a pause from 4 to 12 October, and 10 merges from 13 to 17 October shipping About page experience and skills, local Ask search, anonymous visit counts, Dependabot fixes, hiring details, and emitted-site build checks.",
    caption:
      "Public merge history on korabeland/korabeland.com (1 to 17 October 2026, UTC). The 1 October audit produced 11 agent-built fixes that merged alongside 1 automated dependency update on 2 October. Two more merges landed on 3 October, followed by 10 feature and hardening merges from 13 to 17 October.",
    kpis: [
      {
        label: "1 OCT 2026 · TRIGGER",
        value: "Audit + 3 PRs",
        sub: "First mate audited live site",
        tone: "neutral",
      },
      {
        label: "2 OCT 2026 · NEXT-DAY BURST",
        value: "12 merges",
        sub: "11 agent-built · 1 dep update",
        tone: "signal",
      },
      {
        label: "1–17 OCT 2026 · TOTAL",
        value: "27 PRs merged",
        sub: "1 at a time · ~10m CI each",
        tone: "moss",
      },
    ],
    days: [
      { day: "01", dateISO: "2026-10-01", total: 3, tone: "audit" },
      {
        day: "02",
        dateISO: "2026-10-02",
        total: 12,
        agentBuilt: 11,
        automatedDeps: 1,
        tone: "burst",
      },
      { day: "03", dateISO: "2026-10-03", total: 2, tone: "wave" },
      { day: "04", dateISO: "2026-10-04", total: 0, tone: "quiet" },
      { day: "05", dateISO: "2026-10-05", total: 0, tone: "quiet" },
      { day: "06", dateISO: "2026-10-06", total: 0, tone: "quiet" },
      { day: "07", dateISO: "2026-10-07", total: 0, tone: "quiet" },
      { day: "08", dateISO: "2026-10-08", total: 0, tone: "quiet" },
      { day: "09", dateISO: "2026-10-09", total: 0, tone: "quiet" },
      { day: "10", dateISO: "2026-10-10", total: 0, tone: "quiet" },
      { day: "11", dateISO: "2026-10-11", total: 0, tone: "quiet" },
      { day: "12", dateISO: "2026-10-12", total: 0, tone: "quiet" },
      { day: "13", dateISO: "2026-10-13", total: 3, tone: "wave" },
      { day: "14", dateISO: "2026-10-14", total: 1, tone: "wave" },
      { day: "15", dateISO: "2026-10-15", total: 1, tone: "wave" },
      { day: "16", dateISO: "2026-10-16", total: 2, tone: "wave" },
      { day: "17", dateISO: "2026-10-17", total: 3, tone: "wave" },
    ],
    breakdownTitle:
      "WHAT THE 12 MERGES ON 2 OCTOBER SHIPPED (11 AGENT-BUILT FROM AUDIT + 1 DEP UPDATE)",
    breakdownItems: [
      {
        tag: "SECURITY & CSP",
        summary: "Security headers & hash-based CSP",
      },
      {
        tag: "SHARE & INDEXING",
        summary: "OG share images & indexing fixes",
      },
      {
        tag: "SCHEMA & WWW",
        summary: "Structured data & www redirect",
      },
      {
        tag: "IMAGE & MEDIA",
        summary: "Smaller portraits & WebP posters",
      },
      {
        tag: "TEST & SMOKE",
        summary: "Browser startup & built-site smoke",
      },
      {
        tag: "CI & DEP TOOLING",
        summary: "CI bounds & Dependabot age gate",
      },
    ],
  },
};

export function getCaseStudyDiagram(id: string): CaseStudyDiagramSpec {
  const spec = CASE_STUDY_DIAGRAMS[id];
  if (!spec) {
    throw new Error(
      `Unknown case-study diagram "${id}". Registered ids: ${Object.keys(CASE_STUDY_DIAGRAMS).join(", ")}.`,
    );
  }
  return spec;
}

/**
 * Plain-text representation of a diagram for the Ask the Operator corpus
 * (src/lib/ask/markdoc.ts), so every diagram's title, description, and caption
 * are searchable alongside the surrounding prose.
 */
export function diagramAccessibleSummary(spec: CaseStudyDiagramSpec): string {
  return `${spec.eyebrow}: ${spec.title}. ${spec.description} ${spec.caption}`;
}
