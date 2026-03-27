import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    status: z.enum(["draft", "published"]),
    pillar: z.enum(["building", "operator", "stories"]),
    tags: z.array(z.string()),
    project: z.string().optional(),
    socialPosted: z
      .object({
        linkedin: z.coerce.date().optional(),
        x: z.coerce.date().optional()
      })
      .optional()
  })
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    status: z.enum(["draft", "published"]),
    tags: z.array(z.string()),
    github_url: z.string().url().optional(),
    live_url: z.string().url().optional(),
    tech_stack: z.array(z.string()),
    role: z.string(),
  }),
});

const now = defineCollection({
  type: "content",
  schema: z.object({
    updated: z.coerce.date(),
  }),
});

export const collections = { blog, projects, now };
