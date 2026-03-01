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

export const collections = { blog };

