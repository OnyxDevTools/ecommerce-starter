"use client";
// filename: admin/editor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
export default function Editor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
    ],
    immediatelyRender: false,
    content: JSON.parse(value),
    editorProps: {
      attributes: { "aria-label": "Product description", class: "rich-editor" },
    },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });
  return (
    <div className="editor">
      <div className="toolbar">
        {[
          ["Bold", () => editor?.chain().focus().toggleBold().run()],
          ["Italic", () => editor?.chain().focus().toggleItalic().run()],
          [
            "Heading",
            () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
          ],
          ["List", () => editor?.chain().focus().toggleBulletList().run()],
          ["Quote", () => editor?.chain().focus().toggleBlockquote().run()],
          ["Undo", () => editor?.chain().focus().undo().run()],
          ["Redo", () => editor?.chain().focus().redo().run()],
        ].map(([name, run]) => (
          <Button
            key={String(name)}
            type="button"
            variant="outline"
            onClick={run as () => void}
          >
            {String(name)}
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
