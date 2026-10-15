// Words and links the Ask section shows. Plain data so tests can hold them to
// the index (every example must find a page that really answers it) and to the
// site's contact details. Voice follows DESIGN.md §10: first person, short
// sentences, no hype, no em dashes.

export const INVITATION =
  "The story above is the short version. Ask for a specific and I will point you to the page that answers it.";

export const SECTION_NOTE =
  "Search runs on your device across everything published on this site. It finds passages and links to the page they come from. It does not write answers, and your questions stay in this tab until you clear them or close it.";

/** Four questions the About page and the case studies actually answer, so one
 *  tap shows a useful result. */
export const EXAMPLE_QUESTIONS = [
  "What results did the lead scoring project get?",
  "What did you do at Keypath?",
  "How was the AI SMS pilot measured?",
  "Which tools and skills do you use?",
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

export const FALLBACK_MESSAGE =
  "Nothing on this site answers that. You can read through the pages below or ask me directly.";

export const ERROR_MESSAGE =
  "Search could not load. You can read through the pages below or ask me directly.";
