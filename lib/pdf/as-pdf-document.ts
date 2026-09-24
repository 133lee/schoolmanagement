import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

/**
 * `renderToStream` only accepts an element typed as react-pdf's `<Document>`,
 * but `React.createElement(SomePdfComponent, props)` is typed as that
 * component's own element — even though it renders a <Document> at the root.
 * TypeScript can't see through the component, so this is the one place that
 * states that fact, instead of an `as any` at every call site.
 */
export function asPdfDocument(element: ReactElement): ReactElement<DocumentProps> {
  return element as ReactElement<DocumentProps>;
}
