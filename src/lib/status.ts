// SINGLE SOURCE OF TRUTH for Korab's location, citizenship, work
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
const base = "Washington, DC";
const baseCountryCode = "US"; // ISO 3166-1 alpha-2 country of `base`, for JSON-LD
const baseConsole = "washington dc"; // lowercase for the console-styled UI
const citizenship = "US and Australian citizen";
const authorization = "no US visa sponsorship required";

export const STATUS = {
  base,
  /** ISO 3166-1 alpha-2 country of the base, for the JSON-LD PostalAddress. */
  baseCountryCode,
  /** Nationalities, in JSON-LD / prose casing. Order = primary first. */
  nationalities: ["United States", "Australia"] as const,
  /** Citizenship phrase used verbatim in llms.txt and the JSON-LD description. */
  citizenship,
  /** Work-authorization phrase used verbatim in llms.txt and JSON-LD. */
  authorization,

  // Derived display strings — composed from the atoms above, never duplicated.
  /** Home hero: current base, console style. */
  heroReadout: `⌖ ${baseConsole}`,
  /** About-page portrait caption: current base, console style. */
  baseReadout: `⌖ ${baseConsole}`,
  /** About page: current base + citizenship, console style. */
  aboutLine: `${baseConsole} · ${citizenship.toLowerCase()}`,
  /** JSON-LD Person description. */
  personDescription: `Operator with 13 years across marketing, CX and operations. Turns ambiguous problems into systems that ship, now building with AI. Based in ${base}; ${citizenship}, ${authorization}.`,
} as const;
