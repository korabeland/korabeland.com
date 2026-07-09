# Codex Review Loop — {{branch}}

- **Date:** {{date}}
- **Base:** {{base}}
- **Head at completion:** {{head_sha}}
- **Passes run:** {{passes}}
- **Outcome:** clean | stopped: iteration cap | stopped: stall | stopped: verify red

## Applied by the loop

Findings codex raised that Claude applied and that survived `verify`.

- [simplification] `src/…`:{{line}} — {{what changed}}
- [bug] `src/…`:{{line}} — {{what changed}}

## Escalated to Korab (NOT applied)

Findings the loop refused to auto-apply (protected/SSOT path, behaviour-changing, or repeatedly un-resolvable). These need a human decision.

- [{{category}}/{{severity}}] `path`:{{line}} — codex suggested: {{suggestion}} — escalated because: {{reason}}

## Reverted

Findings applied then rolled back because a verify check went red.

- `path`:{{line}} — {{finding}} — failed: {{check}}

## Verify

- Final `pnpm verify:all`: pass | fail (details)
