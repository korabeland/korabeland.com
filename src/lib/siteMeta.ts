import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export interface SiteMeta {
  tagline: string;
  slotsAvailable: number;
  todaysEntry: {
    date: string;
    body: string;
    signoff: string;
  };
}

const FALLBACK: SiteMeta = {
  tagline: "independent design & research for the unusually curious.",
  slotsAvailable: 2,
  todaysEntry: {
    date: "thu · apr 18 · 9:42am",
    body: [
      "reworking heron's onboarding.",
      "the real problem isn't",
      "the learning curve — it's",
      "that nobody knows where",
      "the curve ends.",
      "",
      "drafted a piece on",
      "permission structures.",
      "maybe a footnote to",
      '"borrowed maps."',
    ].join("\n"),
    signoff: "— k.e.",
  },
};

const reader = createReader(process.cwd(), keystaticConfig);

export async function getSiteMeta(): Promise<SiteMeta> {
  const data = await reader.singletons.siteMeta.read();
  if (!data) return FALLBACK;
  return {
    tagline: data.tagline,
    slotsAvailable: data.slotsAvailable ?? FALLBACK.slotsAvailable,
    todaysEntry: {
      date: data.todaysEntry.date,
      body: data.todaysEntry.body,
      signoff: data.todaysEntry.signoff,
    },
  };
}
