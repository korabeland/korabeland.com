export interface CountUp {
  /** Whether this value is a clean numeric that may animate from zero. */
  animatable: boolean;
  /** The final integer to count up to. Zero when not animatable. */
  target: number;
  /** A trailing unit character (`%` or `x`), or "" when there is none. */
  suffix: string;
}

/**
 * Decide whether a metric readout may run a count-up. Strict by design: only a
 * bare leading integer with an optional single unit suffix (`%` or `x`)
 * animates. Ranges ("30–50%"), words ("hundreds"), prefixes ("~600k"),
 * decimals and empty strings all render static — the server-rendered final
 * value is always shown regardless.
 */
export function parseCountUp(raw: string): CountUp {
  const value = raw.trim();
  const match = /^(\d+)(%|x)?$/.exec(value);
  if (!match) return { animatable: false, target: 0, suffix: "" };
  return { animatable: true, target: Number(match[1]), suffix: match[2] ?? "" };
}
