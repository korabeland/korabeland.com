import { describe, expect, it } from "vitest";
import {
  assertMatrix,
  bucketFor,
  cutoffGeometry,
  noteFor,
  resolveShares,
} from "@/lib/explorable";

// The pure logic behind the Explorable figures. Each case states a reader-
// visible behaviour: where a bar segment ends, which tier a pairing lands in,
// where the cutoff band sits, which note the reader sees.

describe("resolveShares: a ShareShift state becomes bar widths", () => {
  it("gives the 'rest' segment whatever the named shares leave", () => {
    expect(resolveShares(["rest", 27.8])).toEqual([72.2, 27.8]);
    expect(resolveShares(["rest", 0.7])).toEqual([99.3, 0.7]);
  });

  it("accepts shares that already total 100 with no rest segment", () => {
    expect(resolveShares([60, 40])).toEqual([60, 40]);
  });

  it("refuses shares that cannot describe one whole", () => {
    expect(() => resolveShares([60, 30])).toThrow(/add a 'rest' segment/);
    expect(() => resolveShares([80, 30, "rest"])).toThrow(/more than 100/);
    expect(() => resolveShares(["rest", "rest"])).toThrow(/at most one/);
    expect(() => resolveShares([-5, "rest"])).toThrow(/non-negative/);
  });
});

describe("bucketFor and assertMatrix: a pairing lands in one tier", () => {
  const cells = [
    [0, 1],
    [1, 2],
  ];

  it("returns the bucket at a row and column", () => {
    expect(bucketFor(cells, 0, 0)).toBe(0);
    expect(bucketFor(cells, 1, 1)).toBe(2);
  });

  it("refuses a pairing the matrix does not define", () => {
    expect(() => bucketFor(cells, 2, 0)).toThrow(/no cell/);
  });

  it("accepts a rectangular matrix whose buckets are in range", () => {
    expect(() => assertMatrix(cells, 2, 2, 3)).not.toThrow();
  });

  it("refuses a ragged matrix or an unknown bucket", () => {
    expect(() => assertMatrix(cells, 3, 2, 3)).toThrow(/rows of cells/);
    expect(() => assertMatrix([[0], [1, 2]], 2, 2, 3)).toThrow(/row 0/);
    expect(() => assertMatrix(cells, 2, 2, 2)).toThrow(/out of range/);
  });
});

describe("cutoffGeometry: the kept and cut shares", () => {
  it("cuts nothing when every step is kept", () => {
    const g = cutoffGeometry(10, 10);
    expect(g).toMatchObject({ cut: 0, keptPercent: 100, cutPercent: 0 });
  });

  it("reports the share cut by a fine cutoff", () => {
    const g = cutoffGeometry(8, 10);
    expect(g.cutPercent).toBe(20);
  });

  it("reports the shares for a midpoint cutoff", () => {
    const g = cutoffGeometry(5, 10);
    expect(g).toMatchObject({ cut: 5, keptPercent: 50, cutPercent: 50 });
  });

  it("clamps a cutoff outside the scale", () => {
    expect(cutoffGeometry(14, 10).cut).toBe(0);
    expect(cutoffGeometry(-3, 10).cut).toBe(10);
  });

  it("refuses a scale with no steps", () => {
    expect(() => cutoffGeometry(1, 0)).toThrow(/positive whole number/);
  });
});

describe("noteFor: the plain-language note for a cut share", () => {
  const notes = [
    { upTo: 50, text: "half" },
    { upTo: 0, text: "none" },
    { upTo: 30, text: "tiers" },
  ];

  it("picks the first note whose ceiling covers the cut, in any order", () => {
    expect(noteFor(notes, 0)).toBe("none");
    expect(noteFor(notes, 30)).toBe("tiers");
    expect(noteFor(notes, 40)).toBe("half");
  });

  it("falls back to the last note past every ceiling", () => {
    expect(noteFor(notes, 90)).toBe("half");
  });
});
