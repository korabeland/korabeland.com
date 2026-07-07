import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS } from "@/lib/status";

// public/llms.txt is hand-written markdown — it cannot import STATUS the way the
// pages and JSON-LD do, so it is the one surface that can drift from the source
// of truth. This guard fails CI the moment it does. If you change a fact in
// src/lib/status.ts, update llms.txt until these pass. See AGENTS.md "Status facts".
const llms = readFileSync(resolve(process.cwd(), "public/llms.txt"), "utf8");

describe("llms.txt stays in sync with src/lib/status.ts", () => {
  it("names the current base", () => {
    expect(llms).toContain(STATUS.base);
  });

  it("names the relocation target", () => {
    expect(llms).toContain(STATUS.target);
  });

  it("states citizenship verbatim", () => {
    expect(llms).toContain(STATUS.citizenship);
  });

  it("states work authorization verbatim", () => {
    expect(llms).toContain(STATUS.authorization);
  });
});
