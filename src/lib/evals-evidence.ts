import type { TextBlock } from "./ask/markdoc";

export const evalsScorecard = {
  intro:
    "These playground-build results cover 2026-11-01 through 2026-11-14. Attempts count rows with a pass or fail outcome. Pass rate is passed attempts divided by scored attempts, rounded to the nearest whole percent. Each row uses Pi.",
  rows: [
    {
      model: "qwen3.8:27b-dflash2-nvfp4-64k",
      setup: "Pi",
      taskGroup: "Software building",
      attempts: 259,
      passRate: "76%",
    },
    {
      model: "qwen3.8:27b-mlx-64k",
      setup: "Pi",
      taskGroup: "Software building",
      attempts: 180,
      passRate: "78%",
    },
    {
      model: "qwen3.6-35b-a3b",
      setup: "Pi",
      taskGroup: "Software building",
      attempts: 255,
      passRate: "53%",
    },
  ],
  limit:
    "These are observed results, not a controlled head-to-head experiment. Runs span different dates and conditions.",
} as const;

export const evalsDefects = [
  {
    title: "A model reply limit was dropped",
    summary:
      "One agent setup ignored the configured reply limit. The integration was changed to pass the limit through and save it with the run settings.",
    source:
      "evals-README.md records the correction but does not identify the changed implementation file.",
  },
  {
    title: "An agent wrote outside its workspace",
    summary:
      "Agents attempted writes beyond the task workspace. The suite added macOS write confinement, and result notes retain denied paths.",
    source:
      "local-model-eval-suite-requirements.md describes the isolation boundary; playground-results.csv records denied-write notes.",
  },
  {
    title: "A timed-out request could be retried",
    summary:
      "A request that timed out could be retried after cancellation. The suite now scores the timeout as a failure and refuses replacement requests for that run.",
    source:
      "ladder-build.md describes the timeout behavior; evals-README.md identifies the fix record.",
  },
] as const;

export function evalsEvidenceBlocks(): TextBlock[] {
  const scoreRows = evalsScorecard.rows
    .map(
      (row) =>
        `${row.model}: ${row.setup}, ${row.taskGroup}, ${row.attempts} attempts, ${row.passRate} pass rate.`,
    )
    .join(" ");
  return [
    { kind: "heading", text: "Sample scorecard" },
    {
      kind: "paragraph",
      text: `${evalsScorecard.intro} ${scoreRows} ${evalsScorecard.limit}`,
    },
    { kind: "heading", text: "Defects the suite exposed" },
    ...evalsDefects.flatMap((defect) => [
      { kind: "heading" as const, text: defect.title },
      {
        kind: "paragraph" as const,
        text: `${defect.summary} Source: ${defect.source}`,
      },
    ]),
  ];
}
