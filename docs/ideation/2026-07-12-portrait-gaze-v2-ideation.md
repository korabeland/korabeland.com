---
date: 2026-07-12
topic: portrait-gaze-v2-anatomical
focus: pupil+iris shift behind the painted eyelid (no on-top disc); in-image saccadic tracking; settle-to-eye-contact on pause; does the image need layers?
mode: repo-grounded
---

# Ideation: Portrait Gaze v2 — Anatomical Eye Movement

Follow-on to the shipped gaze rig (PR #33). The owner's verdict on v1: the on-top overlay disc reads "cheap and half baked". Three constraints for v2, in the owner's words: (1) the pupil AND iris should be what actually shifts, staying occluded behind the painted eyelid; (2) gaze should track the cursor inside the image bounds too (saccadic, like preview #3), not just the outer proximity band; (3) the eyes return to direct eye contact when the cursor pauses (like preview #1). Open question answered here: does the image need layers?

**Answer: yes — postage-stamp eye-region layers, not a layered portrait.** Per eye: a socket-cutout occluder patch (painted lid punched to alpha), a moving iris/pupil sprite cut from the painted eye, and a blank-sclera underlay with the painted pupil retouched out. Base hero JPG stays byte-identical; patches load behind the existing JS gate.

## Grounding Context

**Codebase context.** Astro 6 static; hero = painted portrait, two JPG variants (night/day), delivered AVIF/WebP/JPEG at 360/720/1040w by `scripts/gen-hero-variants.ts`; ADR: delivered images ≤200KB, never astro:assets; hero is LCP with fetchpriority=high. Rig v1: gradient pupil discs over the painted eyes, clipped to iris circles; math SSOT `src/lib/portrait-gaze.ts` (eye centers L 0.422,0.404 / R 0.612,0.399; pupilR 0.012w; irisR 0.018w; travel 0.005w; band = half-diagonal+78px; idle 3s; temperament day 1.0/90ms, night 0.65/170ms; saccade threshold 0.55). Double gate pointer:fine && !reduced-motion; display:none until gate passes → proven zero baseline churn (60 baselines unchanged; Chromatic blocking). 33 unit tests; motion e2e deliberately rejected as rAF-flaky. v1's documented core flaw: an on-top disc can't both stay natural-sized and travel visibly (dilated eye vs trailing crescent); compromise was tiny travel + halo.

**Past learnings.** Measure eye geometry at real render scale, never from a zoom (canvas dark-centroid workflow, scripts inside the worktree). Keep: double gate, display:none-until-JS, hoisted-script null-guard, manifest-coverage CI test, reset on mouseleave/blur/scroll/resize. Zero-baseline-churn is the acceptance bar iff the static render is unchanged; otherwise reviewed reseed only. New raster layers go through `gen-hero-variants.ts`, stay off the preload path, load behind the gate. Content-gated components test via PROD-guarded /dev preview routes.

**External context.** bentasker.co.uk cutout technique (foreground portrait with transparent eye sockets over a moving iris layer — pixel-perfect occlusion for free). Toon Boom "invert-cut" (trace the lid edge once as a static mask on the layer beneath ≈ CSS clip-path/mask). SVG clipPath rigs (atan2 + bounded translate). Live2D/depth-map WebGL judged overkill — doesn't even solve occlusion better. Biology: saccades ballistic 20–30ms, 1–2/sec (main sequence: duration ∝ amplitude — Bahill/Clark/Stark 1975); blinks 100–400ms, 16–20/min; Salvucci & Goldberg fixation/saccade identification. Asset prep: manual cutout beats auto-segmentation for one painted portrait; crop tight; AVIF/WebP alpha ~50–70% smaller than PNG.

## Topic Axes

- A. Occlusion & rendering — how the moving iris/pupil is drawn and clipped behind the lid
- B. Asset production & delivery — making/measuring/generating/budgeting/loading layers and masks
- C. Behavior state machine — in-image tracking, pause→eye-contact, idle, band, temperament
- D. Motion realism — saccade dynamics, micro-motion, overshoot: alive vs servo
- E. Safety & verification — baselines, tests, LCP, gates, failure modes

## Ranked Ideas

### 1. Three-layer eye sandwich from the painting's own pixels
**Description:** Per eye region, three tiny gated layers: (top) a tight cutout patch of the portrait with the eye aperture punched to alpha — the painted lid is the occluder; (middle) a moving iris+pupil sprite cut from the painted eye, not a gradient; (bottom) a small underlay patch with the iris/pupil retouched out to plain sclera, so no travel distance ever exposes a trailing crescent. Base JPG untouched (LCP, no-JS, reduced-motion, baselines all unchanged); patches are single-digit-KB AVIF/WebP alpha fetched post-gate.
**Axis:** A
**Basis:** external: bentasker.co.uk cutout technique + Toon Boom invert-cut; direct: v1's documented flaw — "an on-top disc can never both stay natural-sized and travel visibly."
**Rationale:** The only architecture that gets pixel-perfect eyelid occlusion with real painted pixels moving — it deletes the crescent/dilation problem class instead of masking it, unlocking 3–5× travel.
**Downsides:** A retouch/cutout art session on brand-critical pixels (both variants); patch alignment across three responsive widths; new asset class to maintain.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Explored

### 2. Cursor-fixation state machine
**Description:** Replace band-lock + 3s idle with a Salvucci-Goldberg-style classifier over the cursor stream: eyes saccade toward a moving cursor everywhere (inside the image included); cursor dispersion below threshold for ~300–900ms = fixation → eyes saccade back to direct eye contact. Band demoted to attenuation. States DISENGAGED → TRACKING → CONTACT as a pure reducer in `portrait-gaze.ts`, unit-tested with synthetic cursor traces.
**Axis:** C
**Basis:** external: Salvucci & Goldberg fixation/saccade identification (I-DT/I-VT); direct: constraints 2 and 3 are a fixation classifier specified in plain English — they cannot be met by tuning the current band constants.
**Rationale:** In-image tracking and pause→contact are one behavior question ("when is the cursor interesting?"); a classifier answers it in under a second, which is what makes the return feel like being noticed rather than a timeout.
**Downsides:** Replaces shipped, tuned behavior; the pause threshold is the most feel-defining parameter and needs calibration; large rewrite of the 33-test suite.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Explored

### 3. Main-sequence ballistic motion
**Description:** Saccade duration scales with amplitude (ballistic fast-out easing, ~5–8% overshoot, short corrective settle); sub-pixel fixational drift during holds so eye contact never freezes. Temperament becomes a gain on the curve rather than two magic timings.
**Axis:** D
**Basis:** external: oculomotor main sequence (Bahill, Clark & Stark 1975); saccades are ballistic 20–30ms — v1's 90/170ms eased glide is 3–8× slower than biology and reads as servo motion.
**Downsides:** Uncanny-valley tuning; depends on the occlusion work for larger travel to matter.
**Rationale:** Occlusion fixes "cheap"; motion shape fixes "half baked" — anatomically layered eyes that glide like a CSS transition still read fake.
**Confidence:** 80%
**Complexity:** Low-Medium
**Status:** Explored

### 4. Rest-parity + pose-pinned verification harness
**Description:** Build-time assertion compositing the layer stack at rest and pixel-diffing against the original JPG (mechanically proves the zero-churn branch). Pure-math aperture-containment invariants (iris disc inside the lid aperture at every travel/temperament extreme). PROD-guarded /dev route with query-pinned poses (rest, max-left, converged, ...) snapshotted by Chromatic.
**Axis:** E
**Basis:** direct: "zero-baseline-churn IF the static render stays unchanged" acceptance bar; motion e2es deliberately rejected; existing /dev preview-route pattern.
**Rationale:** v2's new failure mode is static compositing drift (a patch 1px off, a sprite hue shift) — invisible to every current gate because baselines never see the live rig. This makes it CI-visible with zero flaky tests.
**Downsides:** Harness cost lands before feature code; the pose list needs agreement up front.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Explored

### 5. Annotation-driven layer factory
**Description:** One annotated geometry source per variant (eye centers, radii, lid-aperture path, punch mask, crop boxes). A `gen-eye-rig.ts` sibling of `gen-hero-variants.ts` emits the patches, masks, and generated TS constants; `PORTRAIT_VARIANTS` grows into a layered-asset schema; manifest-coverage and a rig byte-budget assertion extend the existing CI test.
**Axis:** B
**Basis:** direct: `PORTRAIT_VARIANTS` is already the SSOT both the image pipeline and the manifest-coverage test derive from.
**Rationale:** v2 multiplies geometric surface ~6× per eye per variant; derived geometry keeps day/night in lockstep and makes a future portrait repaint a one-file change instead of an afternoon of pixel-nudging.
**Downsides:** Pipeline work before visible payoff; where the SSOT lives (annotation vs TS module) must be decided.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Explored

### 6. Per-eye vergence targeting
**Description:** Each eye computes its gaze from its own center; a cursor between the eyes produces subtle convergence (capped so it never goes comedic). Optional sine-projection elliptical envelope (vertical travel < horizontal, matching anatomy) replaces the hard circular clamp.
**Axis:** C
**Basis:** external: puppetry focus doctrine (both eyes must triangulate on a real point or the character reads dead); reasoned: a shared gaze vector is geometrically correct only at infinity — at cursor distances the per-eye vectors measurably diverge, and that divergence is the "watching you up close" signal.
**Rationale:** Convergence is the tell that the portrait is looking at something in the viewer's plane — strongest exactly inside the image, where constraint 2 lives.
**Downsides:** Cross-eye taste risk on an illustration; two more tunables.
**Confidence:** 70%
**Complexity:** Low
**Status:** Explored

### 7. Environment-fixed catchlight
**Description:** Split the specular highlight out as a static element pinned to the painted light source (sampled per variant); the iris slides beneath it. At rest the composite is indistinguishable from the painting.
**Axis:** A
**Basis:** reasoned: a specular reflection follows light-source/viewer geometry, not eyeball rotation — a highlight that travels with the pupil is physically a decal (same trick as animatronic/taxidermy gloss-dome eyes); v1's disc carried its shading with it, part of why it read as a sticker.
**Rationale:** Highest realism-per-byte move available: one tiny positioned element turns "disc sliding on a picture" into "eye rotating in a socket".
**Downsides:** Per-variant highlight measurement (day/night lighting differs); interacts with the sprite art.
**Confidence:** 75%
**Complexity:** Low
**Status:** Explored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Same-image aperture shift (second `<img>`, same URL, translated under a lid clip) | Only works at v1-scale travel — the trailing edge reveals shifted lid/sclera paint as a smear; the travel ceiling is the thing being escaped |
| 2 | Full-portrait cutout duplicate (bentasker verbatim) | Doubles hero-scale bytes on an LCP-critical page; dominated by tight eye-region patches |
| 3 | Blank-sclera repaint of the base JPG | Forces reviewed reseed of 60 baselines and gives no-JS visitors empty eyes; dominated by the gated underlay patch |
| 4 | Procedural gradient iris (zero-new-bytes) | A synthetic gradient against painted brushwork is the same "cheap" tell being fixed; dominated by the painted sprite |
| 5 | Inline SVG viewBox rig / vector lid trace as sole occluder | A hard vector edge against a soft painterly lid is a fidelity risk; raster patch occlusion dominates (clip-path remains the fallback) |
| 6 | Repaint-for-riggability vector eye group | High art cost and style-match risk for no capability the sprite lacks |
| 7 | Automated dark-centroid geometry harvester in the build | Automates a twice-a-year measurement; the annotation file covers the need with less machinery |
| 8 | Blink layer / blink-masked returns | Strong but outside the three asked behaviors; new art-asset class + reduced-motion policy questions — the natural v3 once the layer stack exists (blinks can mask the return-to-contact snap) |
| 9 | Eyelid-follow (lid aperture tracks vertical gaze) | Scope creep past the asked behaviors; requires lid art; follow-up alongside blinks |
| 10 | Kill-the-band / five-state machine variants | Folded into survivor 2 (band demoted to attenuation) |
| 11 | Spherical sine-projection mapping | Folded into survivor 6 as the mapping option |
| 12 | Delivery contract / flatten-back guarantee | Folded into survivors 1 and 5 as their loading rule |
| 13 | Layer-alignment canvas probe / geometry-contract tests | Folded into survivor 4 |
| 14 | Click-to-calibrate measurement bench | Folded into survivor 5 (the annotation is the bench output) |

Axis spread across survivors: A(1,7) B(5) C(2,6) D(3) E(4) — no axis gaps.
