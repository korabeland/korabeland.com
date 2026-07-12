---
date: 2026-07-12
topic: portrait-gaze-v2
---

# Portrait Gaze v2 — Anatomical Eye Movement

## Summary

Rebuild the hero portrait's eyes as three tiny gated layers cut from the painting's own pixels — painted lid as occluder, painted iris/pupil sprite as the moving element, blank-sclera underlay behind — driven by a cursor-fixation state machine that tracks saccadically everywhere (including inside the image) and returns to direct eye contact when the cursor pauses. Ballistic main-sequence motion, per-eye vergence, and an environment-fixed catchlight complete the upgrade; the visible static portrait stays byte-identical.

---

## Problem Frame

Gaze rig v1 (PR #33) shipped as an additive overlay: gradient pupil discs positioned over the painted eyes. The owner's verdict is that the on-top disc reads cheap and half baked — the disc sits on the painting instead of the eye moving within it. The flaw is structural and was documented at ship time: an overlay disc can never both stay natural-sized and travel visibly, because the painted pupil underneath is exposed as a trailing crescent the moment the disc moves. v1 compromised with near-invisible travel and a masking halo.

Two behavioral gaps compound the rendering flaw. Inside the image bounds — where a visitor's cursor actually spends time — v1 locks to eye contact instead of tracking, so the most engaged zone is inert. And the return to eye contact is a blunt 3-second idle timer, which reads as a screensaver timeout rather than being noticed.

This scope was selected from a 7-survivor ideation (docs/ideation/2026-07-12-portrait-gaze-v2-ideation.md) grounded in prior art: the bentasker cutout technique, Toon Boom's invert-cut occlusion convention, and oculomotor research on saccades and fixation classification.

---

## Requirements

**Rendering and occlusion**
- R1. The moving elements are the pupil and iris together, rendered as a sprite extracted from the portrait's own painted pixels — not a synthetic gradient or drawn disc.
- R2. The moving sprite is occluded behind the painted eyelid via a per-eye layer sandwich: a socket-cutout occluder patch (portrait pixels with the eye aperture punched to alpha) above the sprite, and a small underlay patch with the painted iris/pupil retouched out to plain sclera beneath it, so no reachable travel exposes a trailing crescent, double pupil, or sclera artifact.
- R3. Rest parity: with the rig live and at rest (direct eye contact), the layered composite is visually indistinguishable from the untouched portrait — both night and day variants, at all delivered widths — and this is proven mechanically by a pixel-diff against the original within an agreed tolerance.
- R4. All environment-fixed highlights — the corneal catchlight, the lens reflections from the glasses, and the painted sparkle highlights — are retouched out of the moving sprite and supplied by a static highlight layer pinned to the painted light-source positions (measured per variant); the iris slides beneath them.
- R5. The base portrait assets and their markup remain byte-identical. All rig layers are additive and hidden until the JS double gate (`pointer: fine` and no reduced motion) passes; no-JS, coarse-pointer, and reduced-motion visitors get today's portrait exactly.

**Behavior**
- R6. The gaze tracks the cursor saccadically everywhere in the engagement area, including inside the image bounds — superseding v1's inside-equals-locked-contact rule.
- R7. When cursor motion classifies as a fixation (dispersion/velocity below threshold for a short window, on the order of 300–900ms, tuned by feel), the eyes saccade back to direct eye contact. This replaces the v1 3-second idle timer entirely: pausing and idling are one behavior, and eye contact is the single resting pose.
- R8. Face zone exception: when the cursor is over the portrait's own face/eye region, gaze goes to direct eye contact rather than literal tracking — avoiding degenerate bearing math and cross-eye artifacts. Tracking runs everywhere else in the image (shoulders, hair, background). Transitions across the face-zone boundary are debounced by the same fixation classifier that governs R7, so a cursor grazing the edge cannot oscillate between contact and tracking.
- R9. The outer proximity band survives as distance attenuation only, not a distinct behavioral state. v1's reset conventions carry over: immediate rest on pointer-leave and window blur, re-evaluation on scroll and resize.
- R10. Per-eye targeting: each eye computes its bearing from its own center, producing subtle convergence on near targets, with a cap that keeps convergence well short of comedic cross-eye.
- R11. Shift temperament remains data-driven (day alert, night drowsy) keyed off the existing shift state, expressed as parameters of the new state machine and motion model rather than duplicated logic. A shift toggle while the rig is engaged first resets gaze to rest (the R9 reset convention), and both variants' rig layers are prefetched once the gate passes, so the toggle-time layer swap is instant and never exposes a partially loaded or mismatched-variant frame.

**Motion model**
- R12. Saccades are ballistic and main-sequence shaped: duration scales with amplitude, easing front-loads velocity, large jumps get a slight overshoot with a brief corrective settle. Held gaze carries sub-pixel fixational micro-drift so eye contact never reads frozen. No constant-duration eased glide.
- R13. Travel stays restrained: slightly more than v1's shipped travel, with an explicit ceiling well short of what the occlusion technically allows. The layers buy correctness (no crescent, real lid), not drama; final values are tuned by feel and judged by Korab at real render scale.

**Asset production and delivery**
- R14. Eye layers are produced programmatically by regenerable in-repo scripts, per variant — including the sprite's highlight retouch (R4) alongside the underlay's sclera retouch — and approved by Korab at real render scale before shipping. If programmatic retouch cannot match the brushwork, this escalates rather than shipping a visible quality drop.
- R15. All rig geometry (eye centers, lid apertures, sprite and patch crop boxes, travel envelope) lives in one annotated source per variant; a generation step emits the patch assets and typed constants, and the existing variant-coverage test extends so a portrait variant without matching rig assets fails CI.
- R16. Rig layers ship as small alpha-capable assets off the preload path, fetched only after the gate passes, under a CI-asserted byte budget. If layer fetch or decode fails, the rig stays dormant and the static portrait remains — never a partially composited face.

**Verification and governance**
- R17. Occlusion correctness is proven as pure math: unit-tested containment invariants assert the sprite stays inside the lid aperture (with margin) at every reachable pose across travel, temperament, vergence, and overshoot extremes. No live-motion e2e tests (established convention).
- R18. Pose-pinned visual checks: a PROD-guarded dev preview route pins the rig at named deterministic poses (rest, travel extremes, converged) for snapshot review under the existing visual-regression gate. Production page baselines remain unchanged (the screenshotted reduced-motion path never engages the rig).
- R19. The DESIGN.md motion-budget entry for the portrait gaze moment is amended for the new envelope (in-image tracking, pause-to-contact, layered occlusion) before implementation code, and the colophon attribution line is re-checked against the new behavior, updated only if its wording no longer holds.

---

## Acceptance Examples

- AE1. **Covers R6.** Given a fine-pointer visitor without reduced motion, when the cursor moves across the image interior (outside the face zone), the eyes saccade toward it rather than locking to eye contact.
- AE2. **Covers R7.** Given the eyes are tracking, when the cursor stops moving anywhere in the engagement area, the eyes saccade back to direct eye contact within the fixation window — and no separate multi-second idle behavior exists.
- AE3. **Covers R8.** Given the rig is engaged, when the cursor moves over the portrait's face region, the eyes hold direct eye contact until the cursor leaves the zone.
- AE4. **Covers R2, R17.** Given any reachable pose (max travel in every direction, both temperaments, capped convergence, overshoot), no trailing crescent or double pupil appears and the sprite never escapes the lid aperture — asserted by the containment invariants.
- AE5. **Covers R5, R16.** Given reduced motion, a coarse pointer, or JS disabled, when the page loads, the portrait renders exactly as today and no rig layer assets are fetched.
- AE6. **Covers R3.** Given the composited rig at rest, when the rest-parity check runs against the original portrait for both variants, the diff is within the agreed tolerance.
- AE7. **Covers R15.** Given a new portrait variant added without rig assets or geometry, when the test suite runs, it fails.
- AE8. **Covers R16.** Given a rig asset fails to load, when the gate has already passed, the visitor sees the static portrait with no partial compositing.

---

## Success Criteria

- The eye movement reads as the painted eye itself moving under its lid — no visible disc edge, dilation, or trailing crescent at any pose — judged by Korab at real render scale on both variants.
- The behavioral upgrade is felt: the portrait visibly notices a pause (sub-second return to eye contact) and tracks within the image, while total motion stays understated per the travel ceiling.
- Shipping cost is provably zero where it matters: base asset byte-identical, LCP unaffected, production visual baselines unchanged, reduced-motion/touch/no-JS experience identical to today.
- ce-plan can plan directly from R1–R19 without inventing product behavior; all open tuning is explicitly listed under Outstanding Questions.

---

## Scope Boundaries

- No blinks and no eyelid-follow (lid aperture reacting to vertical gaze) — the layer stack makes both nearly free later; deferred as the natural v3.
- No modification of the base portrait JPGs or the existing variant generation for the base images; the retouched pixels exist only in gated rig layers.
- No touch, scroll, or keyboard gaze; coarse pointers keep the static portrait (v1 boundary carried forward).
- No canvas/WebGL, mesh warping, or depth-map approaches — rejected in ideation as overkill that does not solve occlusion better.
- No change to the engagement area's outer extent; the band shrinks in role (attenuation only), not in size.
- Other renders of the Portrait component (e.g., /about) remain rig-free.

---

## Key Decisions

- Layered cutout occlusion over v1's overlay disc: reverses v1's "zero asset surgery" key decision, which the owner's verdict overturned — the disc architecture cannot deliver anatomical movement at any tuning.
- Sprite cut from the painting, not drawn: a synthetic iris against painted brushwork is the same "cheap" tell being fixed.
- Blank-sclera underlay patch instead of retouching the base JPG: eliminates the crescent problem class while keeping the visible static portrait untouched (no baseline reseed, no degraded no-JS state).
- Face zone = eye contact instead of literal or damped near-field tracking: chosen by the owner; sidesteps degenerate math and cross-eye risk while keeping "you look at me, I look at you" narrative.
- Pause-to-contact replaces the idle timer: eye contact and rest are the same pose, so one fixation classifier subsumes both v1 states.
- Travel restraint as an explicit requirement: the owner capped expressiveness — slightly above v1, never dramatic.
- AI-drafted eye art with owner review at real render scale; a one-eye proof escalation path if brushwork matching fails.
- Blinks deferred despite being the strongest liveness signal: outside the three asked behaviors; revisit once the layer stack exists.

---

## Dependencies / Assumptions

- v1's measured geometry is the starting point: pupil centers L (0.422, 0.404) / R (0.612, 0.399); painted iris ≈ 0.017w, painted pupil ≈ 0.009w at desktop render. Lid apertures are not yet measured and must be traced during planning (measure at real render scale, never from browser zoom — documented v1 lesson).
- The source portraits are 1254×1254 (night) and 1040×1040 (day) in src/assets/ — at or above the largest delivered width (1040px) — so sprite/patch extraction needs no upscaling. The two variants differ in source resolution, so per-variant patch extraction is not symmetric; eye-region sharpness is still confirmed at real render scale during the one-eye proof.
- Playwright emulates reduced motion globally, so production baselines capture the non-engaged state (verified v1 convention); Chromatic remains the blocking visual gate.
- v1's rig conventions carry forward: double gate, display-none-until-JS, hoisted-script null guard, rAF-coalesced pointer handling, reset on leave/blur/scroll/resize.
- The existing math SSOT (src/lib/portrait-gaze.ts) and its unit suite are extended/rewritten, not bypassed; day/night variants share the state machine with parameter-only differences.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R14][User decision] Korab approves the drafted eye layers (sprite, occluder, underlay) against the painting at real render scale before the rig wires up — planning must schedule a one-eye proof as the first implementation checkpoint, with escalation if brushwork matching fails. The proof uses the reflection-heavy right eye so the hardest retouch case (R4's highlight separation) is exercised first, and it demonstrates live tracking at the candidate travel values so motion perceptibility is judged before full build-out, not only brushwork match.

- [Affects R7][Technical] Fixation window value and classifier shape (dispersion vs velocity threshold; the 300–900ms range narrows by feel, per temperament).
- [Affects R8][Technical] Face-zone boundary definition (measured face region vs simple radius around the eye midpoint).
- [Affects R13][Technical] Travel value and ceiling (start marginally above v1's 0.005w; owner judges at real spec before lock).
- [Affects R10][Technical] Convergence cap value and whether vergence uses the sine-projection elliptical envelope or a simpler per-eye clamp.
- [Affects R4][Needs research] Catchlight position/size measurement per variant (day/night lighting differs).
- [Affects R3][Technical] Rest-parity check placement (build-time script vs test-time assertion), comparison space, and diff tolerance. The check design must account for the lossy delivered encodes: patches cut from the pristine source can never bit-match the AVIF/WebP-encoded base around them, so the comparison space (source-composite vs browser-rendered) is decided at the one-eye proof using real seam data, and the tolerance is derived empirically there rather than pre-declared.
- [Affects R12][Technical] Main-sequence constants (duration-per-amplitude slope, floor, overshoot fraction, micro-drift amplitude) mapped onto day/night temperament gains.
- [Affects R15][Technical] Annotation format for lid apertures and crop boxes (SVG over source vs typed constants), and where generated outputs live.
- [Affects R18][Technical] Final pose list for the pinned-pose preview route.
