import { useEffect, useReducer } from "react";
import { usePuck } from "@measured/puck";
import { getSlots, subscribeSlots } from "./editStore";
import type { SectionEdits } from "./edits";
import { ImageFieldControl } from "./registry/fields";

/**
 * The universal "Text & images" field shown for every section in Puck's side
 * panel. It reads the selected block's detected slots (from editStore, populated
 * when the section renders in the canvas) and lets you override each text/image.
 * The field value is the block's `_edits` object.
 */
function EditContentField({
  value,
  onChange,
}: {
  value?: SectionEdits;
  onChange: (value: SectionEdits) => void;
}) {
  const { selectedItem } = usePuck();
  const id = selectedItem?.props?.id as string | undefined;
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => (id ? subscribeSlots(id, force) : undefined), [id]);

  const slots = id ? getSlots(id) : undefined;
  const edits: SectionEdits = value ?? {};

  if (!slots || (slots.texts.length === 0 && slots.imgs.length === 0)) {
    return <div style={{ fontSize: 12, color: "#888" }}>This section has no detected text or images to edit.</div>;
  }

  const setText = (i: number, v: string) => onChange({ ...edits, text: { ...edits.text, [i]: v } });
  const setImg = (i: number, v: string) => onChange({ ...edits, img: { ...edits.img, [i]: v } });

  const labelStyle: React.CSSProperties = { fontSize: 11, color: "#888", display: "block", margin: "10px 0 4px" };
  const taStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid var(--puck-color-grey-09, #ddd)",
    borderRadius: 6,
    fontSize: 13,
    resize: "vertical",
  };

  return (
    <div>
      {slots.texts.map((original, i) => (
        <div key={`t${i}`}>
          <label style={labelStyle}>Text {i + 1}</label>
          <textarea
            style={taStyle}
            rows={Math.min(4, Math.max(1, Math.ceil((edits.text?.[i] ?? original).length / 42)))}
            value={edits.text?.[i] ?? original}
            placeholder={original}
            onChange={(e) => setText(i, e.target.value)}
          />
        </div>
      ))}
      {slots.imgs.map((original, i) => (
        <div key={`i${i}`}>
          <label style={labelStyle}>Image {i + 1}</label>
          <ImageFieldControl name={`img${i}`} value={edits.img?.[i] ?? original} onChange={(v) => setImg(i, v)} />
        </div>
      ))}
    </div>
  );
}

export default EditContentField;
