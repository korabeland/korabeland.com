// The About page's own prose, kept as data so one source feeds both the page
// (src/pages/about.astro) and the Ask the Operator corpus
// (scripts/gen-corpus-index.ts). The corpus used to scrape this copy back out
// of the page source; reading it from here means the indexed text is exactly
// the text the page renders, and an edit cannot desynchronise the two.

import { STATUS } from "./status";

/** Heading ids the About page renders. Corpus citations use these verbatim. */
export const ABOUT_ANCHORS = {
  narrative: "narrative",
  operate: "operate",
  hiring: "hiring",
  close: "close",
} as const;

/** Career narrative: one entry per rendered paragraph. */
export const ABOUT_NARRATIVE: readonly string[] = [
  "The thread across thirteen years is the same one every time: find the structure inside a problem nobody has fully framed yet, then build something that keeps running after I step back. The titles changed a lot more than the underlying work did.",
  "I started in digital media buying, running paid search and paid social campaigns and learning to read a dashboard for the decision hiding inside it. That pulled me into marketing, then into leading a marketing team, then into customer experience. Each move widened the aperture, from a channel to a funnel to the whole business. I spent over a decade moving through that arc, first at Plattform Education, which became Keypath Education, and then at Keypath: media buyer, digital media specialist, marketing manager, marketing and CX manager, and finally CX manager for the Australian portfolio. Every step added a layer of the business I had to understand well enough to explain simply to the people making decisions in it.",
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

/** Hiring details: the practical answers a recruiter or hiring manager asks
 *  first. Kept as data for the same reason as the narrative: the page and the
 *  Ask corpus read this one source. Location and work authorization come from
 *  src/lib/status.ts so they cannot drift from the rest of the site. */
export const ABOUT_HIRING: readonly { label: string; value: string }[] = [
  {
    label: "Work authorization",
    value: `${STATUS.citizenship}. ${capitalize(STATUS.authorization)}.`,
  },
  {
    label: "Roles I am looking for",
    value:
      "Customer Experience Manager, Marketing Manager, Product Manager (non-technical), and Product Marketing Manager.",
  },
  {
    label: "Type of work",
    value: "Open to full-time roles, and to freelance and consulting work.",
  },
  {
    label: "Location",
    value: `Based in ${STATUS.base}. Open to US-remote roles and roles in the DC area. Not relocating.`,
  },
  {
    label: "Availability and pay",
    value:
      "Start date, notice period and salary expectations are discussed directly.",
  },
  {
    label: "Scope I have managed",
    value:
      "Largest team: 5 people. Largest budget: $1M to $5M a year. Most recent role: Customer Experience Manager at Keypath Education, 2021 to August 2026 (ended).",
  },
  { label: "Contact", value: "Email or LinkedIn, whichever is easier." },
];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
