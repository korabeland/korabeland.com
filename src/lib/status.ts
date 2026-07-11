// SINGLE SOURCE OF TRUTH for Korab's location, relocation, citizenship, work
// authorization, and nationality.
//
// Every surface that states these facts derives from HERE:
//   - the home hero readout            (src/pages/index.astro)
//   - the JSON-LD Person node          (src/pages/index.astro)
//   - the about-page authorization line (src/pages/about.astro)
//   - public/llms.txt                  (hand-written; guarded by a test)
//
// When a fact changes, change it in THIS FILE ONLY. The pages and JSON-LD
// import these values, so they cannot drift. `public/llms.txt` is hand-written
// markdown and cannot import this module, so `tests/status-sync.test.ts`
// asserts it still contains these exact facts — if it drifts, CI goes red and
// the mismatch is impossible to miss. See AGENTS.md "Status facts".

// Atomic facts — the only things to edit when the situation changes.
const base = "Melbourne";
const target = "Washington, DC"; // title case for prose / JSON-LD / llms.txt
const targetConsole = "washington dc"; // lowercase for the console-styled UI
const citizenship = "US and Australian citizen";
const authorization = "no US visa sponsorship required";

export const STATUS = {
  base,
  target,
  /** Nationalities, in JSON-LD / prose casing. Order = primary first. */
  nationalities: ["United States", "Australia"] as const,
  /** Citizenship phrase used verbatim in llms.txt and the JSON-LD description. */
  citizenship,
  /** Work-authorization phrase used verbatim in llms.txt and JSON-LD. */
  authorization,

  // Derived display strings — composed from the atoms above, never duplicated.
  /** Home hero: the one visible relocation line. */
  heroReadout: `⌖ ${base.toLowerCase()} → ${targetConsole}`,
  /** About-page portrait caption: relocation target, console style. */
  targetReadout: `⌖ ${targetConsole}`,
  /** About page: relocation + citizenship, console style. */
  aboutLine: `relocating ${base.toLowerCase()} → ${targetConsole} · ${citizenship.toLowerCase()}`,
  /** JSON-LD Person description. */
  personDescription: `Operator with 13 years across marketing, CX and operations. Turns ambiguous problems into systems that ship, now building with AI. Relocating to ${target}; ${citizenship}, ${authorization}.`,
} as const;
