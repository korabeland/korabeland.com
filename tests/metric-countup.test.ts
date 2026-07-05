import { describe, expect, it } from "vitest";
import { parseCountUp } from "@/lib/metric-countup";

describe("parseCountUp — animatable clean numerics", () => {
  it("accepts a bare integer", () => {
    expect(parseCountUp("42")).toEqual({
      animatable: true,
      target: 42,
      suffix: "",
    });
  });

  it("accepts a percentage", () => {
    expect(parseCountUp("90%")).toEqual({
      animatable: true,
      target: 90,
      suffix: "%",
    });
  });

  it("accepts a multiplier", () => {
    expect(parseCountUp("3x")).toEqual({
      animatable: true,
      target: 3,
      suffix: "x",
    });
  });

  it("accepts a single-digit value like a real ledger metric", () => {
    expect(parseCountUp("6")).toEqual({
      animatable: true,
      target: 6,
      suffix: "",
    });
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseCountUp("  6  ")).toEqual({
      animatable: true,
      target: 6,
      suffix: "",
    });
  });

  it("accepts zero", () => {
    expect(parseCountUp("0")).toEqual({
      animatable: true,
      target: 0,
      suffix: "",
    });
  });
});

describe("parseCountUp — static (non-animatable)", () => {
  it.each([
    ["a range", "30–50%"],
    ["a word", "hundreds"],
    ["an empty string", ""],
    ["an arrow expression", "hundreds → 0"],
    ["a prefixed value with words", "~600k leads"],
    ["a thousands suffix", "600k"],
    ["a decimal", "2.5x"],
    ["a comma-grouped number", "1,200"],
    ["the phrase none measured", "none measured"],
  ])("classifies %s as static", (_desc, input) => {
    expect(parseCountUp(input)).toEqual({
      animatable: false,
      target: 0,
      suffix: "",
    });
  });
});
