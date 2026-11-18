// Pure model for the one-page /resume. Identity location derives from
// src/lib/status.ts (the single source of truth for base/citizenship), and the
// resume content follows the owner's 2026-11-15 Drive resume with the site's
// public contact line and two-part-tiers corrections. Pure builders remain here
// so Vitest and /dev/resume-preview exercise section gating with fixtures.

import type { ExperienceAchievement, ExperienceSummary } from "./experience";
import type { Education, SkillCategory, SkillsData } from "./skills";
import { STATUS } from "./status";

export const RESUME_IDENTITY = {
  name: "Korab Eland",
  headline: "Customer Experience · Marketing · Product · AI · Operations",
  location: STATUS.base,
} as const;

export const RESUME_TARGETING =
  "Open to customer experience, marketing, product, AI and operations roles.";

export const RESUME_SUMMARY =
  "Customer Experience and Product Marketing leader with 13+ years in EdTech and a track record of taking ideas from 0 to 1. Built new capabilities from scratch, including a voice-of-customer program across 10 university partners, an AI chatbot that increased conversions 30%, and an intent-based lead tiering system, carrying each from concept to execution. A generalist with hands-on depth across CX strategy, operations, product, marketing, analytics, decision modeling, and AI engineering, moving between them as the problem requires. Highly adaptable, having grown through five roles across two countries and a company's startup phase. Skilled at leading cross-functional teams and turning customer insight into measurable business impact.";

export interface ResumeContactLink {
  label: string;
  /** Address as printed. Always visible text, so paper keeps the URL. */
  display: string;
  href: string;
}

export const RESUME_CONTACT: readonly ResumeContactLink[] = [
  {
    label: "Email",
    display: "hello@korabeland.com",
    href: "mailto:hello@korabeland.com",
  },
  {
    label: "Website",
    display: "korabeland.com",
    href: "https://korabeland.com",
  },
  {
    label: "LinkedIn",
    display: "linkedin.com/in/korabeland",
    href: "https://www.linkedin.com/in/korabeland",
  },
  {
    label: "GitHub",
    display: "github.com/korabeland",
    href: "https://github.com/korabeland",
  },
  {
    label: "X",
    display: "x.com/korabeland",
    href: "https://x.com/korabeland",
  },
];

export interface ResumeAchievement {
  text: string;
  /** "value · label" (or just the value), null when the bullet has no metric. */
  metric: string | null;
}

export interface ResumeRole {
  slug: string;
  role: string;
  /** Company and location, joined for one line. */
  organisation: string;
  period: string;
  /** Optional one-line role scope shown above achievements. */
  summary: string | null;
  achievements: ResumeAchievement[];
}

export interface ResumeCertification {
  name: string;
  institution: string;
  year: string;
}

export interface ResumeSkills {
  categories: SkillCategory[];
  education: Education[];
  certifications: ResumeCertification[];
}

export interface ResumeModel {
  summary: string | null;
  experience: ResumeRole[];
  /** Null when no skills, education, or certifications remain to display. */
  skills: ResumeSkills | null;
}

export function formatResumeMetric(
  metric: ExperienceAchievement["metric"],
): string | null {
  if (!metric) return null;
  return metric.label ? `${metric.value} · ${metric.label}` : metric.value;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatResumeDate(date: string | null): string {
  if (!date) return "";
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  return month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${year}` : year;
}

function formatResumePeriod(role: ExperienceSummary): string {
  const start = formatResumeDate(role.startDate);
  const end = role.current ? "present" : formatResumeDate(role.endDate);
  if (start && end) return `${start} to ${end}`;
  return start || end;
}

/**
 * Resume view of one role. Testimonials and tags are dropped on purpose: the
 * page has to fit one printed sheet.
 */
export function toResumeRole(role: ExperienceSummary): ResumeRole {
  return {
    slug: role.slug,
    role: role.role,
    organisation: [role.company, role.location].filter(Boolean).join(" · "),
    period: formatResumePeriod(role),
    summary: null,
    achievements: role.achievements.map((a) => ({
      text: a.text,
      metric: formatResumeMetric(a.metric),
    })),
  };
}

/**
 * Skills the resume shows: categories and education, plus optional concise
 * certifications. Long-URL Keystatic certifications are left out by default so
 * fixture-backed previews match the one-sheet contract. Null when nothing
 * remains, so the section is skipped instead of rendered empty.
 */
export function toResumeSkills(
  data: SkillsData | null,
  certifications: ResumeCertification[] = [],
): ResumeSkills | null {
  if (!data && certifications.length === 0) return null;
  const categories = (data?.categories ?? []).filter(
    (c) => c.skills.length > 0,
  );
  const education = data?.education ?? [];
  if (
    categories.length === 0 &&
    education.length === 0 &&
    certifications.length === 0
  ) {
    return null;
  }
  return { categories, education, certifications };
}

/** Experience arrives already sorted by the caller; order is preserved. */
export function buildResume(
  roles: ExperienceSummary[],
  skills: SkillsData | null,
  options: {
    summary?: string | null;
    certifications?: ResumeCertification[];
  } = {},
): ResumeModel {
  return {
    summary: options.summary ?? null,
    experience: roles.map(toResumeRole),
    skills: toResumeSkills(skills, options.certifications ?? []),
  };
}

/** Canonical one-page resume model rebuilt from the 2026-11-15 Drive resume. */
export const RESUME_MODEL: ResumeModel = {
  summary: RESUME_SUMMARY,
  experience: [
    {
      slug: "keypath-cx-manager",
      role: "Customer Experience Manager",
      organisation: "Keypath Education APAC · Melbourne, Australia",
      period: "Mar 2021 to Aug 2026",
      summary:
        "Led customer experience strategy across 10 university partners, owning voice-of-customer research, AI pilots, and lead prioritization.",
      achievements: [
        {
          text: "Championed the voice of the customer in collaboration with Product, Marketing, and Operations teams to translate customer insights into service and operational requirements.",
          metric: null,
        },
        {
          text: "Launched Voice of Customer (VOC) program across 10 university partners, establishing feedback loops that informed product strategy and optimized the student lifecycle.",
          metric: null,
        },
        {
          text: "Partnered with an AI customer research vendor, completing 200+ customer interviews in less than 30 days that informed annual strategies and the CX transformation program.",
          metric: null,
        },
        {
          text: "Developed an AI-powered chatbot using natural language processing that improved lead conversion rates by 30% through personalized experiences and intelligent lead qualification.",
          metric: null,
        },
        {
          text: "Initiated prototypes and cross-functional pilot programs, including an automated AI SMS outreach strategy to complement and reduce reliance on outbound dialing campaigns.",
          metric: null,
        },
        {
          text: "Designed intent tiers from two lead-form questions scored on historical conversion rates with a staggered call strategy, cutting call effort on the lowest-intent tier from about 30% to less than 1% with no added headcount; then designed a decile lead-scoring model, handed over unlaunched in August 2026.",
          metric: null,
        },
        {
          text: "Found that about 98% of chat leads never reached the CRM, and designed the integration to route them in.",
          metric: null,
        },
      ],
    },
    {
      slug: "keypath-marketing-cx-manager",
      role: "Marketing and CX Manager",
      organisation: "Keypath Education APAC · Melbourne, Australia",
      period: "Feb 2019 to Mar 2021",
      summary:
        "Combined marketing and customer experience ownership for multiple university partners, spanning acquisition, automation, and student retention.",
      achievements: [
        {
          text: "Directed integrated marketing strategy for multiple university partners, consistently exceeding student enrollment and retention performance targets through deep product knowledge, market research, and continuous optimization.",
          metric: null,
        },
        {
          text: "Built Marketing Automation strategy using Salesforce Marketing Cloud, launching integrated campaigns that increased engagement and lead nurturing efficiency across email, SMS, and digital channels.",
          metric: null,
        },
        {
          text: "Designed an onboarding webinar program that identified disengaged and at-risk students in advance, informing proactive outreach campaigns that reduced attrition rate by 5 to 10%.",
          metric: null,
        },
      ],
    },
    {
      slug: "keypath-marketing-manager",
      role: "Marketing Manager",
      organisation: "Keypath Education APAC · Melbourne, Australia",
      period: "May 2017 to Feb 2019",
      summary:
        "Managed a team of 4 running multichannel student recruitment campaigns for partner universities.",
      achievements: [
        {
          text: "Built and led team of 4 marketing specialists to plan, execute, analyze, and optimize multichannel campaigns that attracted and retained prospective students for partner universities.",
          metric: null,
        },
        {
          text: "Drove partner performance beyond enrollment targets multiple times while achieving top retention rates through campaign optimization and resource allocation.",
          metric: null,
        },
        {
          text: "Created onboarding webinar program that became company-wide standard, identifying a key gap with lasting organizational impact.",
          metric: null,
        },
      ],
    },
    {
      slug: "keypath-digital-media-specialist",
      role: "Digital Media Specialist",
      organisation: "Keypath Education APAC · Melbourne, Australia",
      period: "Aug 2015 to Apr 2017",
      summary:
        "Owned regional paid media strategy and budget during Keypath's startup phase in APAC.",
      achievements: [
        {
          text: "Led Paid Media strategy during Keypath's startup phase, managing the regional digital marketing budget that fueled its early growth.",
          metric: null,
        },
        {
          text: "Established in-house digital media budget management and reporting infrastructure, removing dependency on external media partners.",
          metric: null,
        },
        {
          text: "Reduced cost per lead by 50% through optimization of paid search and paid social campaigns, doubling lead volume and delivering significant ROI improvement.",
          metric: null,
        },
      ],
    },
    {
      slug: "plattform-digital-media-buyer",
      role: "Digital Media Buyer",
      organisation: "Plattform Education · Kansas City, KS",
      period: "Sep 2013 to Jul 2015",
      summary:
        "Ran digital campaigns for a major client with a $12M+ annual paid media budget.",
      achievements: [
        {
          text: "Managed all digital campaigns for major client with $12M+ annual paid media budget within first year, rapidly scaling responsibility early in career.",
          metric: null,
        },
        {
          text: "Increased lead-to-application conversion rate by 10% through continuous A/B testing and data-driven optimization.",
          metric: null,
        },
        {
          text: "Planned and executed digital strategies across pay-per-click, display, and paid social, including campaign and landing page optimization, vendor analysis, and performance reporting.",
          metric: null,
        },
      ],
    },
  ],
  skills: {
    categories: [
      {
        name: "Professional skills",
        skills: [
          "Customer Experience Strategy",
          "Voice of Customer (VOC) Programs",
          "Customer Journey Mapping",
          "Service Design",
          "Retention Strategy",
          "Process Optimization",
          "Cross-Functional Leadership",
          "Stakeholder Management",
          "Change Management",
          "Market Research",
        ],
      },
      {
        name: "Technical skills",
        skills: [
          "Gen AI Tools (Claude Code, Codex)",
          "Predictive Modeling",
          "Decision Modeling",
          "Marketing Automation (Salesforce Marketing Cloud)",
          "A/B Testing",
          "Conversion Rate Optimization",
          "Data Visualisation (PowerBI, Looker)",
          "Google Ads Manager",
          "Meta Business Manager",
          "SEO/AEO",
        ],
      },
    ],
    education: [
      {
        name: "Bachelor of Science in Journalism, Strategic Communications",
        institution: "University of Kansas",
        year: "2013",
      },
      {
        name: "Bachelor of Arts in Communication Studies",
        institution: "University of Kansas",
        year: "2013",
      },
    ],
    certifications: [
      {
        name: "Data Analysis and Decision Modelling",
        institution: "James Cook University",
        year: "2018",
      },
      {
        name: "Data Visualisation Short Course",
        institution: "University of Melbourne",
        year: "2023",
      },
    ],
  },
};
