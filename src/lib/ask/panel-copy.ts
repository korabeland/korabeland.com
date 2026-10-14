// Words and links the Ask panel shows. Plain data so tests can hold them to
// the index (every example must find something) and to the site's contact
// details.

export const EXAMPLE_QUESTIONS = [
  "Where are you based?",
  "What results did the lead scoring project get?",
  "Which tools and skills do you use?",
  "Tell me about your time at Keypath",
  "What is Perian?",
] as const;

export const READING_LINKS = [
  { label: "Work", href: "/work" },
  { label: "Lab", href: "/lab" },
  { label: "Notes", href: "/notes" },
  { label: "About", href: "/about" },
] as const;

export const CONTACT_LINKS = [
  { label: "Email", href: "mailto:hello@korabeland.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/korabeland" },
] as const;

export const PANEL_NOTE =
  "Searches the pages published on this site, on your device. It finds passages and links to them; it does not write answers. Your questions stay in this tab until you clear them or close the tab.";

export const FALLBACK_MESSAGE =
  "Nothing on this site answers that. You can read through the pages below or ask Korab directly.";

export const ERROR_MESSAGE =
  "Search could not load. You can read through the pages below or ask Korab directly.";
