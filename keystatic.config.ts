import { collection, config, fields, singleton } from "@keystatic/core";

export default config({
  storage: {
    kind: "local",
  },
  collections: {
    posts: collection({
      label: "Blog Posts",
      slugField: "slug",
      path: "src/content/posts/*/",
      format: { contentField: "content" },
      schema: {
        slug: fields.text({ label: "Slug", validation: { isRequired: true } }),
        title: fields.text({
          label: "Title",
          validation: { isRequired: true },
        }),
        description: fields.text({ label: "Description", multiline: true }),
        publishedAt: fields.date({ label: "Published At" }),
        heroImage: fields.image({
          label: "Hero image",
          directory: "public/notes",
          publicPath: "/notes/",
        }),
        heroImageAlt: fields.text({
          label: "Hero image alt text",
          description: "Describes the image for screen readers.",
        }),
        content: fields.markdoc({ label: "Content" }),
      },
    }),
    projects: collection({
      label: "Projects",
      slugField: "slug",
      path: "src/content/projects/*/",
      format: { contentField: "content" },
      schema: {
        slug: fields.text({
          label: "Slug",
          validation: { isRequired: true },
        }),
        title: fields.text({
          label: "Title",
          validation: { isRequired: true },
        }),
        description: fields.text({
          label: "Description",
          multiline: true,
        }),
        role: fields.text({ label: "Role" }),
        team: fields.text({ label: "Team" }),
        stack: fields.text({ label: "Stack" }),
        outcome: fields.text({ label: "Outcome (short)" }),
        startedAt: fields.date({ label: "Started at" }),
        shippedAt: fields.date({ label: "Shipped at" }),
        heroImage: fields.image({
          label: "Hero image",
          directory: "public/work",
          publicPath: "/work/",
        }),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          itemLabel: (props) => props.value,
        }),
        outcomeMetrics: fields.array(
          fields.object({
            value: fields.text({
              label: "Value",
              validation: { isRequired: true },
            }),
            label: fields.text({
              label: "Label",
              validation: { isRequired: true },
            }),
          }),
          {
            label: "Outcome metrics",
            itemLabel: (props) =>
              `${props.fields.value.value} — ${props.fields.label.value}`,
          },
        ),
        fieldLog: fields.array(
          fields.object({
            week: fields.text({
              label: "Week",
              description: 'e.g. "wk 01"',
              validation: { isRequired: true },
            }),
            title: fields.text({
              label: "Title",
              validation: { isRequired: true },
            }),
            body: fields.text({
              label: "Body",
              multiline: true,
              validation: { isRequired: true },
            }),
          }),
          {
            label: "Field log",
            itemLabel: (props) =>
              `${props.fields.week.value} — ${props.fields.title.value}`,
          },
        ),
        reflection: fields.text({
          label: "Reflection",
          multiline: true,
        }),
        nextProject: fields.text({
          label: "Next project slug",
          description: "Slug of the next project to link to at the bottom.",
        }),
        content: fields.markdoc({ label: "Content" }),
      },
    }),
    experience: collection({
      label: "Experience",
      slugField: "slug",
      // Trailing slash mirrors `projects` (locked decision) for index-mode
      // resolution. Data-only collection — no markdoc body.
      path: "src/content/experience/*/",
      schema: {
        slug: fields.text({
          label: "Slug",
          description: 'e.g. "keypath-cx-manager" — unique per role.',
          validation: { isRequired: true },
        }),
        company: fields.text({
          label: "Company",
          validation: { isRequired: true },
        }),
        role: fields.text({
          label: "Role / title",
          validation: { isRequired: true },
        }),
        location: fields.text({ label: "Location" }),
        startDate: fields.date({
          label: "Start date",
          validation: { isRequired: true },
        }),
        endDate: fields.date({
          label: "End date",
          description: "Leave empty if this is your current role.",
        }),
        achievements: fields.array(
          fields.object({
            text: fields.text({
              label: "Achievement",
              multiline: true,
              validation: { isRequired: true },
            }),
            metricValue: fields.text({
              label: "Highlight metric — value",
              description: 'Optional. Ranges only, e.g. "30–50%", "hundreds".',
            }),
            metricLabel: fields.text({
              label: "Highlight metric — label",
            }),
          }),
          {
            label: "Achievements",
            itemLabel: (props) => props.fields.text.value,
            validation: { length: { min: 1 } },
          },
        ),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          description: "Free-text, for the tailored-page agent's discovery.",
          itemLabel: (props) => props.value,
        }),
        testimonial: fields.object(
          {
            quote: fields.text({ label: "Quote", multiline: true }),
            attribution: fields.text({ label: "Attribution" }),
            sourceUrl: fields.url({ label: "Source URL" }),
          },
          {
            label: "Testimonial",
            description: "Optional. Leave the quote empty to omit entirely.",
          },
        ),
      },
    }),
    tailored: collection({
      label: "Tailored pages",
      slugField: "slug",
      path: "src/content/for/*/",
      schema: {
        slug: fields.text({
          label: "Slug",
          description:
            "URL slug (usually the company). The page is /for/<slug>.",
          validation: { isRequired: true },
        }),
        displayName: fields.text({
          label: "Display name",
          description: "Company or role name shown on the page.",
          validation: { isRequired: true },
        }),
        intro: fields.text({
          label: "Intro",
          description: "The bespoke opening — the only free-form copy.",
          multiline: true,
          validation: { isRequired: true },
        }),
        experienceRefs: fields.array(
          fields.relationship({
            label: "Experience",
            collection: "experience",
          }),
          {
            label: "Experience (ordered)",
            itemLabel: (props) => props.value ?? "—",
          },
        ),
        projectRefs: fields.array(
          fields.relationship({ label: "Case study", collection: "projects" }),
          {
            label: "Case studies (ordered)",
            itemLabel: (props) => props.value ?? "—",
          },
        ),
        skillCategories: fields.array(
          fields.text({ label: "Skill category name" }),
          {
            label: "Skill categories (by name)",
            itemLabel: (props) => props.value,
          },
        ),
      },
    }),
  },
  singletons: {
    skills: singleton({
      label: "Skills & certifications",
      path: "src/content/skills/",
      schema: {
        categories: fields.array(
          fields.object({
            name: fields.text({
              label: "Category",
              validation: { isRequired: true },
            }),
            skills: fields.array(fields.text({ label: "Skill" }), {
              label: "Skills",
              itemLabel: (props) => props.value,
            }),
          }),
          {
            label: "Skill categories",
            itemLabel: (props) => props.fields.name.value,
          },
        ),
        certifications: fields.array(
          fields.object({
            name: fields.text({
              label: "Name",
              validation: { isRequired: true },
            }),
            issuer: fields.text({ label: "Issuer" }),
            year: fields.text({ label: "Year" }),
            url: fields.url({ label: "URL" }),
          }),
          {
            label: "Certifications",
            itemLabel: (props) => props.fields.name.value,
          },
        ),
      },
    }),
  },
});
