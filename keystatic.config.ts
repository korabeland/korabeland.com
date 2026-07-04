import { collection, config, fields } from "@keystatic/core";

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
  },
});
