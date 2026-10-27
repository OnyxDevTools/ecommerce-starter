// filename: modules/catalog/document.ts
import { z } from "zod";
export type RichNode = {
  type: string;
  text?: string;
  attrs?: { level?: number; start?: number };
  marks?: { type: string }[];
  content?: RichNode[];
};
const node: z.ZodType<RichNode> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        "doc",
        "paragraph",
        "text",
        "heading",
        "bulletList",
        "orderedList",
        "listItem",
        "blockquote",
        "codeBlock",
        "hardBreak",
        "horizontalRule",
      ]),
      text: z.string().max(10000).optional(),
      attrs: z
        .object({
          level: z.number().int().min(2).max(3).optional(),
          start: z.number().int().min(1).max(1000).optional(),
        })
        .strict()
        .optional(),
      marks: z
        .array(
          z
            .object({
              type: z.enum(["bold", "italic", "strike", "code", "underline"]),
            })
            .strict(),
        )
        .max(5)
        .optional(),
      content: z.array(node).max(100).optional(),
    })
    .strict(),
);
export function parseDocument(raw: string) {
  const value = node.parse(JSON.parse(raw));
  let count = 0;
  const visit = (n: RichNode, depth: number) => {
    if (++count > 250 || depth > 8)
      throw new Error("Description exceeds limits.");
    if (n.type === "text" && (!n.text || n.content))
      throw new Error("Invalid text node.");
    for (const c of n.content || []) visit(c, depth + 1);
  };
  visit(value, 0);
  if (value.type !== "doc") throw new Error("A document is required.");
  return value;
}
export const description = (text: string) =>
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });
