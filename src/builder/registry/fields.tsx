import { useMemo, useState } from "react";
import type { Field } from "@measured/puck";
import { ASSET_IMAGES } from "@/builder/assets";

/**
 * Reusable Puck field configs for section manifests.
 *
 * `imageField` is a custom field: a URL input with a live thumbnail preview plus
 * a "Browse" grid over the project's /public/assets/imgs library (filterable).
 * The AI/voice agents set the same string value, so all three editing surfaces
 * share one representation.
 */

type CustomRenderProps = {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--puck-color-grey-09, #ddd)",
  borderRadius: 6,
  fontSize: 13,
  background: "var(--puck-color-white, #fff)",
};

export function ImageFieldControl({ value, onChange, readOnly }: CustomRenderProps) {
  const [browsing, setBrowsing] = useState(false);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? ASSET_IMAGES.filter((p) => p.toLowerCase().includes(q)) : ASSET_IMAGES;
    return list.slice(0, 120);
  }, [query]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          style={INPUT_STYLE}
          placeholder="/assets/imgs/… or https://…"
          value={value ?? ""}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
        {!readOnly && (
          <button
            type="button"
            onClick={() => setBrowsing((v) => !v)}
            style={{ ...INPUT_STYLE, width: "auto", whiteSpace: "nowrap", cursor: "pointer" }}
          >
            {browsing ? "Close" : "Browse"}
          </button>
        )}
      </div>

      {value ? (
        <img
          src={value}
          alt=""
          style={{ marginTop: 8, width: "100%", height: 96, objectFit: "cover", borderRadius: 6, display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}

      {browsing && !readOnly && (
        <div style={{ marginTop: 8, border: "1px solid var(--puck-color-grey-09, #ddd)", borderRadius: 6, padding: 8 }}>
          <input
            type="text"
            style={{ ...INPUT_STYLE, marginBottom: 8 }}
            placeholder="Filter (e.g. avatar, img-1, logo)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {matches.map((src) => (
              <button
                key={src}
                type="button"
                title={src}
                onClick={() => {
                  onChange(src);
                  setBrowsing(false);
                }}
                style={{ padding: 0, border: src === value ? "2px solid #111" : "1px solid #eee", borderRadius: 4, cursor: "pointer", background: "none" }}
              >
                <img src={src} alt="" loading="lazy" style={{ width: "100%", height: 52, objectFit: "cover", borderRadius: 3, display: "block" }} />
              </button>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--puck-color-grey-05, #888)" }}>
            Showing {matches.length} of {ASSET_IMAGES.length}. Type to filter.
          </div>
        </div>
      )}
    </div>
  );
}

export function imageField(label = "Image"): Field {
  return {
    type: "custom",
    label,
    render: (props: CustomRenderProps) => <ImageFieldControl {...props} />,
  } as Field;
}
