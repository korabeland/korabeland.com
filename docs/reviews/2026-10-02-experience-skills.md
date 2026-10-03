# Experience and skills publication review

The homepage now reads five approved experience entries, ordered newest first.
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
role fixture. Public llms.txt still attributes the whole 13-year career to
Keypath Education, including media buying; the approved earliest role is at
Plattform Education. That pre-existing sentence was left unchanged per scope.

The branch must be reviewed on its Vercel preview before production. This worker
does not merge the PR.
