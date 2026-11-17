import type { CutoffNote } from "../../lib/explorable";

export const STORY_SLUG = "lead-scoring";

// Relative bar heights are a drawn shape, not model output.
export const DECILE_HEIGHTS = [100, 72, 58, 45, 35, 27, 20, 15, 10, 6];

export const DECILE_NOTES: CutoffNote[] = [
  { upTo: 0, text: "All ten deciles remain in the call queue." },
  {
    upTo: 90,
    text: "This illustrative position explains the method. It does not predict how many calls can safely stop.",
  },
  {
    upTo: 100,
    text: "At this boundary, none of the deciles gets a call. This is not a recommendation.",
  },
];

export function decileReadout(cut: number, steps: number): string {
  if (cut === 0) return `All ${steps} deciles remain in the call queue.`;
  if (cut === steps) return `No calls go to any of the ${steps} deciles.`;
  if (cut === 1) return "The bottom decile sits below the cutoff.";
  const noun = cut === 1 ? "decile" : "deciles";
  return `Bottom ${cut} ${noun} sit below the cutoff.`;
}
