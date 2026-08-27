import { useEffect, useRef } from "react";
import { DesignSvg } from "@/lib/designs/render";
import type { DesignDoc } from "@/lib/designs/types";

/**
 * The slides of a carousel, as a rail beside the canvas.
 *
 * A carousel is a post with more than one page, so the rail is a column of the
 * pages themselves rather than a list of names — you pick the slide you can
 * see. Every slide is an ordinary design, which is why nothing below the rail
 * had to change to support them.
 *
 * DOWN THE LEFT, NOT ALONG THE BOTTOM. The canvas is the artboard exactly:
 * there is no ground under it for a strip to stand on, and anything that stood
 * there would be stealing height from a portrait design that is always
 * height-bound. The column beside it has width to spare, which is why every
 * other editor puts its pages there.
 *
 * It renders for a single-slide post too, with one thumbnail and an add
 * button. Hiding it until there are two would mean the way to make a carousel
 * is invisible until you already have one.
 */
export function SlideStrip({ slides, current, onSelect, onAdd, onBlank, onRemove, onMove }: {
  slides: DesignDoc[];
  current: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onBlank: () => void;
  onRemove: () => void;
  onMove: (to: number) => void;
}) {
  const many = slides.length > 1;
  const on = useRef<HTMLButtonElement>(null);

  /* A rail bounded by the stage's height shows about seven pages, so from the
     eighth onward the selected one can be off the top or the bottom of the
     list — including all the way through an export, which walks the selection
     across every slide. Instantly rather than smoothly: a smooth scroll would
     still be animating when the next slide is rasterised. */
  useEffect(() => {
    const btn = on.current;
    const row = btn?.parentElement;
    if (!btn || !row) return;
    // Scrolled by hand rather than with scrollIntoView, which walks EVERY
    // scrollable ancestor including the document: an export steps the selection
    // through all N slides, and any of those hops could scroll the page itself
    // out from under the pointer. This moves the rail and nothing else.
    const top = btn.offsetTop - row.offsetTop;
    const above = top < row.scrollTop;
    const below = top + btn.offsetHeight > row.scrollTop + row.clientHeight;
    if (above) row.scrollTop = top;
    else if (below) row.scrollTop = top + btn.offsetHeight - row.clientHeight;
    // The same rail is a horizontal row below the breakpoint.
    const left = btn.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft) row.scrollLeft = left;
    else if (left + btn.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = left + btn.offsetWidth - row.clientWidth;
    }
  }, [current]);

  return (
    <aside className="dsn-slides" aria-label="Slides">
      <p className="dsn-slides__h">{many ? `${slides.length} slides` : "Slides"}</p>

      <div className="dsn-slides__row">
        {slides.map((s, i) => (
          <button
            key={i}
            type="button"
            ref={i === current ? on : undefined}
            className={`dsn-slide${i === current ? " is-on" : ""}`}
            aria-label={`Slide ${i + 1} of ${slides.length}`}
            aria-current={i === current}
            onClick={() => onSelect(i)}
          >
            <span className="dsn-slide__art"><DesignSvg doc={s} width={64} /></span>
            <span className="dsn-slide__n">{i + 1}</span>
          </button>
        ))}

        <div className="dsn-slides__add">
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={onAdd}
                  title="Copy this slide — carousel slides share a look, so copying and editing beats rebuilding">
            + Slide
          </button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={onBlank}
                  title="Add an empty slide on the same layout — two pages or more make the post a carousel">
            + Blank
          </button>
        </div>
      </div>

      {/* Lifted out of the scroller and pinned to the foot: below twenty
          thumbnails these would be unreachable without scrolling to the end of
          a list they do not belong to. Glyphs rather than words because the
          list runs down the page now — "← Move" would be describing the wrong
          axis, and neither label fits the rail. */}
      {many && (
        <div className="dsn-slides__ops">
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={current === 0}
                  onClick={() => onMove(current - 1)}
                  title="Move this slide earlier" aria-label="Move this slide earlier">↑</button>
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={current === slides.length - 1}
                  onClick={() => onMove(current + 1)}
                  title="Move this slide later" aria-label="Move this slide later">↓</button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={onRemove}
                  title="Delete this slide" aria-label="Delete this slide">✕</button>
        </div>
      )}
    </aside>
  );
}
