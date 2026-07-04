---
date: 2026-07-04
topic: experience-ledger-and-tailored-pages
---

# Experience Ledger, Skills Section, and Tailored Landing Pages

## Summary

korabeland.com becomes the application-facing professional site: a work-experience ledger with quantified achievements, a scannable skills/certifications section, an animated hero headline, and console-native flare (status badges, monospace metric readouts). The same tagged content pool powers a reusable template for per-application landing pages at unlisted `/for/<company>` paths, generated on demand by an agent from a small config entry.

---

## Problem Frame

Korab is preparing for a job search. The site that shipped today (Operator's Console MVP) presents projects and identity well, but carries no employment history, no skills section, and no way to speak directly to a specific role. When an application goes out, the link on the résumé points at a general-purpose site that makes the hiring manager do the work of connecting Korab's experience to their opening.

The reference point is santifer.io, whose effectiveness comes from receipts: quantified achievement bullets, real testimonials, and visible production status on everything. Adopting those frames only works where equivalent substance exists; copying the structure without the receipts reads as an empty trophy case.

A second, standing division of labour was settled during this brainstorm: korabeland.com is the professional front door used in applications; korabeland.github.io becomes an exploratory, experimental playground (not built here).

---

## Actors

- A1. Korab: owns all content, voice, and claims; approves each tailored page before it is sent.
- A2. Agent (Claude): generates tailored-page config entries on request; can only select and order content from the tagged pool, plus a short bespoke intro.
- A3. Hiring manager / recruiter: arrives via the link in an application or résumé; needs role-relevant evidence within the first screen.

---

## Key Flows

- F1. Tailored page creation
  - **Trigger:** Korab is applying for a specific role and asks for a page.
  - **Actors:** A1, A2
  - **Steps:** Korab shares the role/company context; the agent creates a config entry (bespoke intro line + a selection and ordering of tagged pool content); Korab reviews; the page goes live at an unlisted `/for/<company>` path; Korab puts the link in the application.
  - **Outcome:** A role-specific landing page exists, reachable only via the sent link.
  - **Covered by:** R10, R11, R12, R13

- F2. Visitor journey
  - **Trigger:** A hiring manager opens the tailored link.
  - **Actors:** A3
  - **Steps:** Sees a tailored intro and role-relevant experience/skills; follows exits into the relevant case studies or the contact CTA; can reach the main site via the slim header.
  - **Outcome:** The visitor gets curated, role-relevant evidence and a path deeper into the site. Navigation is one-way: nothing on the main site leads back to the tailored page.
  - **Covered by:** R13, R14

- F3. Cleanup
  - **Trigger:** An application concludes.
  - **Actors:** A1 (optionally via A2)
  - **Steps:** Delete the config entry.
  - **Outcome:** The page is gone; the main site is unaffected.
  - **Covered by:** R15

---

## Requirements

**Experience ledger**
- R1. The site presents work history as an experience ledger: reverse-chronological roles with company, title, period, and achievement bullets, rendered in the existing console design language.
- R2. Achievement bullets are quantified wherever a real metric exists; no invented or extrapolated numbers.
- R3. If a real LinkedIn recommendation exists for a role, it may appear as a quoted testimonial alongside that role; when none exists, no testimonial block or placeholder renders.
- R4. The ledger and skills section live within the existing homepage/about flow as new sections, not a separate CV-style page.

**Skills and certifications**
- R5. A scannable skills/education/certifications section, organised by category, written to survive recruiter keyword-matching without reading as a keyword dump.

**Hero animation**
- R6. The hero headline rotates its main subject while the supporting copy stays fixed (santifer-style swap, adapted to the console aesthetic, not a copy).
- R7. When the visitor prefers reduced motion, the headline renders static with a single default subject.

**Console flare**
- R8. Key metrics render as monospace readouts with tabular numerals; a subtle count-up on scroll into view is optional, and when reduced motion is preferred the final value renders immediately with no animation.
- R9. Ledger entries and case studies carry small status badges from a fixed vocabulary (e.g. "in production", "shipped", "ongoing"), extending the existing status-dot motif.

**Shared content pool**
- R10. Roles, achievement bullets, skills, and certifications are stored as structured content with tags, forming a single source of truth for both the base site and tailored pages.
- R11. Tags support selection by theme/competency so a tailored page can pull the subset relevant to a given role.

**Tailored landing pages**
- R12. A tailored page is produced from a small config entry: one bespoke intro plus a selection and ordering of pool content. The intro is the only free-form copy; all other claims come from the pool.
- R13. Tailored pages are unlisted: excluded from site navigation, excluded from the sitemap, and marked noindex. The sent link is the only way in.
- R14. Tailored page anatomy: slim header linking home, tailored content, then deliberate exits — deep links to relevant case studies and a contact CTA.
- R15. Deleting a tailored page's config entry removes the page with no side effects on the main site.

---

## Acceptance Examples

- AE1. **Covers R3.** Given a role with no real LinkedIn recommendation, when the ledger renders, no testimonial block or empty placeholder appears for that role.
- AE2. **Covers R7.** Given a visitor with `prefers-reduced-motion`, when the hero loads, the headline shows one static subject and never cycles.
- AE3. **Covers R8.** Given a visitor with `prefers-reduced-motion`, when a metric readout scrolls into view, it displays its final value immediately with no count-up.
- AE4. **Covers R12.** Given a tailored page for a data-platform role, when the agent generates it, every experience and skill item on the page traces to a tagged pool entry; only the intro line is bespoke.
- AE5. **Covers R13.** Given a visitor browsing korabeland.com without the sent link, there is no path to any `/for/<company>` page via navigation, sitemap, or search engines.

---

## Success Criteria

- Korab can attach korabeland.com (or a tailored link) to an application and the page presents role-relevant, quantified experience with no further editing.
- Creating a tailored page is one short agent task — a config entry — not a design or writing exercise; it stays a "temporary exercise" as intended.
- A hiring manager landing on the site sees professional, work-experience-focused evidence within the first screen.
- Downstream handoff: `ce-plan` can plan implementation without inventing product behaviour — content model intent, page anatomy, privacy rules, and animation behaviour are all specified here.

---

## Scope Boundaries

- korabeland.github.io playground: direction recorded (exploratory/experimental/fun), but building it is a separate later effort; nothing here depends on it.
- Santifer's chatbot ("Ask me") and press-logo strip: skipped until there are receipts to justify them.
- Scroll-triggered section reveals: considered and declined.
- Subdomains for tailored pages: rejected in favour of the landing-page approach.
- Automated lifecycle/cleanup of tailored pages: manual deletion is sufficient.
- Repo cards / GitHub activity on korabeland.com: belongs to the github.io playground, not the professional site.
- No changes to existing case-study content.

---

## Key Decisions

- Config-driven template (Approach A) over free-form one-off pages or a personalised homepage: one source of truth, consistent voice, and tailoring bounded to real content by construction.
- One-way navigation door: the main site never links to tailored pages; the sent link is the only entrance.
- Additive to the just-shipped console MVP, not a redesign; every new element uses the existing design language and tokens.
- Receipts-first adoption rule: santifer.io frames are adopted only where Korab has equivalent substance (quantified metrics, real recommendations, real production status).
- Testimonials are conditional content, not a required section.

---

## Dependencies / Assumptions

- Content dependency: Korab must supply the raw work history — roles, dates, real metrics, certifications, and any LinkedIn recommendations. This is the largest single input and gates implementation (not planning).
- All new site copy follows the established writing-voice rules (no em dashes, Australian spelling, insight-first).
- Assumes the console MVP on `main` (merged 2026-07-04) as the base.
- Follow-up outside this repo: update the parent `STRATEGY.md` to record the new site division (korabeland.com = application-facing professional site; github.io = experimental playground), superseding the "github.io deferred until volume" framing.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R4][Design] Exact placement and ordering of the ledger and skills sections within the homepage/about flow.
- [Affects R6][Design] The rotating-subject phrase list and rotation timing for the hero headline.
- [Affects R10, R11][Technical] Tag taxonomy and content-model shape for the pool.
- [Affects R13][Technical] Verify noindex + sitemap exclusion against the site's existing SEO setup (canonical URLs, `trailingSlash: never`).
