import { DesignSvg } from "@/lib/designs/render";
import type { DesignDoc } from "@/lib/designs/types";

/**
 * The slides of a carousel.
 *
 * A carousel is a post with more than one page, so the strip is a row of the
 * pages themselves rather than a list of names — you pick the slide you can
 * see. Every slide is an ordinary design, which is why nothing below the strip
 * had to change to support them.
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

  return (
    <div className="dsn-slides">
      <div className="dsn-slides__row">
        {slides.map((s, i) => (
          <button
            key={i}
            type="button"
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
                  title="Add an empty slide on the same layout">
            + Blank
          </button>
        </div>
      </div>

      <div className="dsn-slides__ops">
        <span className="dsn-note mb-0">
          {many ? `Carousel · ${slides.length} slides` : "One slide — add another to make it a carousel"}
        </span>
        {many && (
          <>
            <button type="button" className="dsn-btn dsn-btn--sm" disabled={current === 0}
                    onClick={() => onMove(current - 1)} title="Move this slide earlier">← Move</button>
            <button type="button" className="dsn-btn dsn-btn--sm" disabled={current === slides.length - 1}
                    onClick={() => onMove(current + 1)} title="Move this slide later">Move →</button>
            <button type="button" className="dsn-btn dsn-btn--sm" onClick={onRemove}
                    title="Delete this slide">Delete slide</button>
          </>
        )}
      </div>
    </div>
  );
}
