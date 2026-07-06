import { describe, expect, it } from "vitest";
import { resolveShift, shiftFromHour } from "@/lib/shift";

describe("shiftFromHour — boundary hours", () => {
  it.each([
    [7, "day"],
    [12, "day"],
    [18, "day"],
    [19, "night"],
    [6, "night"],
    [0, "night"],
    [23, "night"],
  ])("hour %i resolves to %s", (hour, expected) => {
    expect(shiftFromHour(hour)).toBe(expected);
  });
});

describe("resolveShift — precedence", () => {
  it("stored day wins over any hour", () => {
    expect(resolveShift({ stored: "day", hour: 2 })).toEqual({
      shift: "day",
      sessionToPersist: null,
    });
  });

  it("stored night wins over any hour", () => {
    expect(resolveShift({ stored: "night", hour: 14 })).toEqual({
      shift: "night",
      sessionToPersist: null,
    });
  });

  it("no stored, no session, hour 14 resolves to day and persists the session default", () => {
    expect(resolveShift({ hour: 14 })).toEqual({
      shift: "day",
      sessionToPersist: "day",
    });
  });

  it("no stored, no session, hour 22 resolves to night and persists the session default", () => {
    expect(resolveShift({ hour: 22 })).toEqual({
      shift: "night",
      sessionToPersist: "night",
    });
  });

  it("boundary hour 7 resolves to day", () => {
    expect(resolveShift({ hour: 7 })).toEqual({
      shift: "day",
      sessionToPersist: "day",
    });
  });

  it("boundary hour 18 resolves to day", () => {
    expect(resolveShift({ hour: 18 })).toEqual({
      shift: "day",
      sessionToPersist: "day",
    });
  });

  it("boundary hour 19 resolves to night", () => {
    expect(resolveShift({ hour: 19 })).toEqual({
      shift: "night",
      sessionToPersist: "night",
    });
  });

  it("boundary hour 6 resolves to night", () => {
    expect(resolveShift({ hour: 6 })).toEqual({
      shift: "night",
      sessionToPersist: "night",
    });
  });

  it("query day overrides stored night and hour, and does not persist", () => {
    expect(resolveShift({ query: "day", stored: "night", hour: 22 })).toEqual({
      shift: "day",
      sessionToPersist: null,
    });
  });

  it("query night overrides stored day and hour, and does not persist", () => {
    expect(resolveShift({ query: "night", stored: "day", hour: 10 })).toEqual({
      shift: "night",
      sessionToPersist: null,
    });
  });

  it("invalid query is ignored and falls through to stored", () => {
    expect(resolveShift({ query: "dusk", stored: "day", hour: 22 })).toEqual({
      shift: "day",
      sessionToPersist: null,
    });
  });

  it("invalid stored value is ignored and falls through to session default", () => {
    expect(
      resolveShift({ stored: "bogus", sessionDefault: "night", hour: 10 }),
    ).toEqual({ shift: "night", sessionToPersist: null });
  });

  it("invalid stored and invalid session fall through to computing from hour", () => {
    expect(
      resolveShift({ stored: "bogus", sessionDefault: "also-bogus", hour: 10 }),
    ).toEqual({ shift: "day", sessionToPersist: "day" });
  });

  it("valid session default wins over hour when no stored choice exists", () => {
    expect(resolveShift({ sessionDefault: "night", hour: 10 })).toEqual({
      shift: "night",
      sessionToPersist: null,
    });
  });
});
