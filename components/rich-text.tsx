// filename: components/rich-text.tsx
import { createElement, type ReactNode } from "react";
import { parseDocument, type RichNode } from "@/modules/catalog/document";
export function RichText({ value }: { value: string }) {
  function render(n: RichNode, key: number): ReactNode {
    if (n.type === "text") {
      let content: ReactNode = n.text;
      for (const m of n.marks || [])
        content = createElement(
          (
            {
              bold: "strong",
              italic: "em",
              strike: "s",
              code: "code",
              underline: "u",
            } as Record<string, string>
          )[m.type],
          null,
          content,
        );
      return <span key={key}>{content}</span>;
    }
    const tags: Record<string, string> = {
      doc: "div",
      paragraph: "p",
      heading: n.attrs?.level === 3 ? "h3" : "h2",
      bulletList: "ul",
      orderedList: "ol",
      listItem: "li",
      blockquote: "blockquote",
      codeBlock: "pre",
      hardBreak: "br",
      horizontalRule: "hr",
    };
    return createElement(
      tags[n.type],
      { key },
      ...(n.content || []).map(render),
    );
  }
  return <div className="prose">{render(parseDocument(value), 0)}</div>;
}
