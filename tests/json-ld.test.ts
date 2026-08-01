import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("keeps content-backed values inside the script context", () => {
    const value = {
      headline: "</script><script>alert('xss')</script>",
      description: "5 < 6 & 7 > 4",
    };
    const serialized = serializeJsonLd(value);

    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized)).toEqual(value);
  });

  it("rejects values JSON cannot represent", () => {
    expect(() => serializeJsonLd(undefined)).toThrow(
      "JSON-LD value must be serializable",
    );
  });
});
