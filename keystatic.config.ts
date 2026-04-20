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
          directory: "src/content/projects",
          publicPath: "/src/content/projects/",
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
  singletons: {
    siteMeta: singleton({
      label: "Site meta",
      path: "src/content/site-meta/",
      format: { data: "json" },
      schema: {
        tagline: fields.text({
          label: "Tagline",
          description: "Italic line under the masthead.",
          validation: { isRequired: true },
        }),
        slotsAvailable: fields.integer({
          label: "Client slots available",
          defaultValue: 2,
        }),
        todaysEntry: fields.object(
          {
            date: fields.text({
              label: "Date line",
              description:
                'e.g. "thu · apr 18 · 9:42am" — shown verbatim above the body.',
              validation: { isRequired: true },
            }),
            body: fields.text({
              label: "Body",
              multiline: true,
              validation: { isRequired: true },
            }),
            signoff: fields.text({
              label: "Signoff",
              description: 'e.g. "— k.e."',
              validation: { isRequired: true },
            }),
          },
          { label: "Today's entry" },
        ),
      },
    }),
  },
});
