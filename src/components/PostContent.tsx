import { DocumentRenderer } from "@keystatic/core/renderer";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof DocumentRenderer>;

export function PostContent({ document }: Props) {
  return <DocumentRenderer document={document} />;
}
