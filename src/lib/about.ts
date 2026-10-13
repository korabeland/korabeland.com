// The About page's own prose, kept as data so one source feeds both the page
// (src/pages/about.astro) and the Ask the Operator corpus
// (scripts/gen-corpus-index.ts). The corpus used to scrape this copy back out
// of the page source; reading it from here means the indexed text is exactly
// the text the page renders, and an edit cannot desynchronise the two.

/** Heading ids the About page renders. Corpus citations use these verbatim. */
export const ABOUT_ANCHORS = {
  narrative: "narrative",
  operate: "operate",
  close: "close",
} as const;

/** Career narrative: one entry per rendered paragraph. */
export const ABOUT_NARRATIVE: readonly string[] = [
  "The thread across thirteen years is the same one every time: find the structure inside a problem nobody has fully framed yet, then build something that keeps running after I step back. The titles changed a lot more than the underlying work did.",
  "I started in digital media buying, running paid search and paid social campaigns and learning to read a dashboard for the decision hiding inside it. That pulled me into marketing, then into leading a marketing team, then into customer experience. Each move widened the aperture, from a channel to a funnel to the whole business. At Keypath Education I spent over a decade moving through that arc: media buyer, digital media specialist, marketing manager, marketing and CX manager, and finally CX manager for the Australian portfolio. Every step added a layer of the business I had to understand well enough to explain simply to the people making decisions in it.",
  "The constant underneath the titles is the same instinct: simplify complex strategy so people can actually act on it, and back decisions with evidence instead of hearsay. That instinct is what's pulling me toward AI now. I've led the evidence work behind a lead-scoring model that replaces fixed tiers with a proper probability score, and I aligned stakeholders across four functions before anyone touched a line of the build. I've also run an end-to-end pilot on AI-driven SMS engagement, built on a randomised holdout so the result means something rather than something that just feels right.",
  "None of that is a pivot away from what came before. It's the same operating system, aimed at harder problems: frame it properly and find the evidence, so what I build holds up once I'm not the one holding it together.",
];

/** "How I operate": one paragraph with an inline link to the field note. */
export const ABOUT_OPERATE = {
  before:
    "I run my own work the same way I'd want a good system run: a backlog tied to actual goals, AI doing the first pass of triage, everything written down as plain markdown instead of trapped in someone's head. I wrote up",
  link: { text: "the full system", href: "/notes/system-designer-personal-os" },
  after: "as a field note.",
} as const;

/** The operate paragraph as the reader sees it, link text inline. */
export function aboutOperateText(): string {
  return `${ABOUT_OPERATE.before} ${ABOUT_OPERATE.link.text} ${ABOUT_OPERATE.after}`;
}
