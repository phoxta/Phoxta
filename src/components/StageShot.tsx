/**
 * A stage photograph, and the Pexels licence rendered.
 *
 * `image` is the real one, searched against the stage's own subject and stored
 * on the row by the generator; `fallback` is the curated set, used when the
 * search has not run or found nothing.
 *
 * The credit is not decoration. Pexels licenses on the condition that the
 * photographer is named wherever the photograph appears, so the credit renders
 * from the SAME object as the URL — there is no path through this component
 * that shows the picture and forgets the attribution. That guarantee is the
 * whole reason this lives in one file instead of being written out twice: a
 * second hand-rolled `<img src={image.url}>` somewhere else is exactly how it
 * gets lost.
 *
 * `prefix` picks which slide design system's classes to wear. Both stylesheets
 * define the same three class names under their own prefix, so one component
 * serves both surfaces without either importing the other's CSS.
 */

/** What the generator stored after searching Pexels (see _shared/stock.ts). */
export type StageImage = {
  url?: string;
  alt?: string;
  photographer?: string;
  photographerUrl?: string;
};

export function StageShot({
  image,
  fallback,
  tall,
  prefix = "idv",
}: {
  image: StageImage;
  fallback: string;
  tall?: boolean;
  /** "idv" — the Idea Validator's slides. "bdx" — the business dossier's. */
  prefix?: "idv" | "bdx";
}) {
  return (
    <figure className={`${prefix}-shot-wrap${tall ? ` ${prefix}-shot-wrap--tall` : ""} mb-0`}>
      <img
        className={`${prefix}-shot${tall ? ` ${prefix}-shot--tall` : ""}`}
        src={image.url || fallback}
        alt={image.alt ?? ""}
        width={720}
        height={tall ? 340 : 280}
        loading="lazy"
      />
      {image.url && image.photographer && (
        <a
          className={`${prefix}-shot__credit`}
          href={image.photographerUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {image.photographer} / Pexels
        </a>
      )}
    </figure>
  );
}
