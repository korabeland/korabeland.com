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
