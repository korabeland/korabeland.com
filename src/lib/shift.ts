// shift.ts — pure resolution logic for the night/day shift toggle (R7).
//
// No DOM access here by design: the head script in BaseLayout.astro runs as
// `is:inline` and can't import this module at runtime (it must stay
// render-blocking and dependency-free), so its small resolution logic is
// duplicated inline there. This module is the source Vitest exercises for
// every precedence/boundary scenario. The two copies are kept in lockstep by
// tests/shift-parity.test.ts, which evaluates the inline script in a
// node:vm sandbox and asserts it matches resolveShift() below across the
// full precedence truth table — edit either copy without updating the other
// and that test fails.
//
// Precedence, highest to lowest:
//   1. `?shift=` query override (never persisted)
//   2. explicit localStorage choice (`korab-shift`)
//   3. session-cached default (`korab-shift-session`)
//   4. computed from local hour — cached to session by the caller

export type Shift = "day" | "night";

export const SHIFT_KEY = "korab-shift";
export const SHIFT_SESSION_KEY = "korab-shift-session";

/** Day is 07:00–18:59 local; everything else is night. */
export function shiftFromHour(hour: number): Shift {
  return hour >= 7 && hour <= 18 ? "day" : "night";
}

export function isValidShift(v: unknown): v is Shift {
  return v === "day" || v === "night";
}

export interface ResolveShiftInput {
  query?: string | null;
  stored?: string | null;
  sessionDefault?: string | null;
  hour: number;
}

export interface ResolveShiftResult {
  shift: Shift;
  /** Non-null only when the shift was freshly computed from the hour — the
   *  caller writes this to sessionStorage exactly once per session. */
  sessionToPersist: Shift | null;
}

export function resolveShift({
  query,
  stored,
  sessionDefault,
  hour,
}: ResolveShiftInput): ResolveShiftResult {
  if (isValidShift(query)) {
    return { shift: query, sessionToPersist: null };
  }
  if (isValidShift(stored)) {
    return { shift: stored, sessionToPersist: null };
  }
  if (isValidShift(sessionDefault)) {
    return { shift: sessionDefault, sessionToPersist: null };
  }
  const computed = shiftFromHour(hour);
  return { shift: computed, sessionToPersist: computed };
}
