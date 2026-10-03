# Experience and skills publication review

The About page reads five approved experience entries, ordered newest first,
after how I operate and directly before skills. The homepage has no experience
section.
The About page reads five skill categories, four education entries and six
linked certifications. Education is optional and has its own list in the
existing section. Certificate years remain blank.

Each approved highlight is attached to its corresponding achievement. The three
public recommendations retain their approved names and titles, with attribution
links to the LinkedIn recommendations page. Attributions have no em dash prefix.
The most recent role ends on 1 August 2026; no authored role is current.
Dates use the first day of the approved month.

Washington, DC is the current base in the shared status source, visible readouts,
Person structured data and hand-written llms.txt. The approved About sentence
uses past tense. The demo tailored page and case studies are unchanged.

## Visual review

Used the staged reseed workflow and reviewed every differing render before
promotion, including the small differences outside the edited pages. The initial
76 captures included eight resized homepage/About renders and 65 differences
below the existing threshold. Those differences included removal of old dev
toolbar artifacts and older baseline copy. A second capture reviewed the role
locations added to the company line at all four widths, plus two tiny image
rendering differences. No baseline was deleted and no threshold was relaxed.

Reviewed the homepage and About at 375, 768, 1280 and 1920 pixels. The education
list and long certificate names/issuers wrap on narrow screens.

## Validation

- Biome, TypeScript and Astro checks passed.
- All 322 Vitest tests passed, including optional education and status sync.
- Full Playwright suite passed: 247 passed, 3 existing skips. Covers the new
  content, SEO, both accessibility palettes, responsive screenshots and links.
- Production build and all eight production SSR smoke checks passed.
- Desktop and mobile Lighthouse passed all configured assertions.
- Disclosure grep returned no restricted terms.

Earlier broad browser runs intermittently failed the existing About portrait
decode/toggle check. Compared with the unchanged origin/main source in this same
isolated worktree, then restored the task changes. Baseline checks passed 49
portrait cases and 167 broader browser cases. The changed pages passed ten
isolated repeats of the failing test. A full rerun without overlapping build or
Astro sync commands passed. Portrait code and portrait test assertions were not
changed.

Lighthouse uses temporary copies of the committed desktop/mobile configurations
with URLs changed to port 4417, as required for this shared machine. Assertions
and route coverage are unchanged.

## Unchanged text audit

No additional public copy explicitly describes a move under way or the Keypath
role as current. The dev-only experience preview retains a fictional current
role fixture. Public llms.txt directs readers to the career content rather than
duplicating the employment history.

The branch must be reviewed on its Vercel preview before production. This worker
does not merge the PR.

## About-only placement follow-up

The experience ledger now follows how I operate and directly precedes skills
on About. Home retains its existing bands without experience. Browser checks
assert that placement and retain the narrow-screen highlight regression added
by no-mistakes. The console location now derives from the same base atom used
by structured data, resolving Devin's duplication finding without a copy change.
The approved biography wording is retained exactly; Devin flagged its inclusion
of media buyer in the Keypath arc, while the earliest collection entry correctly
names Plattform Education.

Reviewed all eight resized Home/About captures at 375, 768, 1280 and 1920 pixels
against the committed baselines. The first capture caught missing space before
the experience heading; adding the usual section gap resolved it. Reviewed the
three remaining Pascal's Nebula image differences as tiny star rendering noise.
Promoted with the staged reseed command; no baselines or checks were removed.

Static checks, all 322 unit tests, the full browser suite (248 passed, 3 existing
skips), production build and all eight SSR smoke checks passed. Disclosure grep
found no restricted terms. Desktop and mobile Lighthouse passed all configured
assertions on port 4417.

The first no-mistakes run completed with two approved exceptions: hosted-preview
review follows PR publication, and the pre-existing unpatched dependency audit
advisory is being handled separately on main. No audit exception, dependency
change or CI change was added on this branch.
