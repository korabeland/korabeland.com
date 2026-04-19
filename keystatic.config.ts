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
        content: fields.markdoc({ label: "Content" }),
      },
    }),
  },
});
