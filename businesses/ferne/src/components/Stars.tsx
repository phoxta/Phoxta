import { stars } from "@/lib/format";

/** A star row. The glyphs are decorative; the rating is announced as text so a
 *  screen reader hears "4.9 out of 5" rather than eight identical symbols. */
export default function Stars({ rating, className = "stars" }: { rating: number; className?: string }) {
    return (
        <span className={className}>
            <span aria-hidden="true">{stars(rating)}</span>
            <span className="sr-only">{rating.toFixed(1)} out of 5</span>
        </span>
    );
}
