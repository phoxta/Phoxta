import AppLink from "@/lib/nav/link";
import { BRAND } from "@/config/brand";

interface LogoProps {
    className?: string;
}

/**
 * The wordmark. Keeps the design system's original 96×35 logo box and its
 * `w-22 sm:w-24` sizing, so header, drawer and footer layout are unchanged.
 *
 * `textLength` pins the rendered width to the viewBox instead of leaving it to
 * font metrics: the brand name is configurable and the webfont loads late, so
 * without it the text overflows the box (and clips) for any name wider than the
 * fallback font predicts. `spacingAndGlyphs` keeps it inside the box whatever
 * the name is.
 *
 * `data-brand-name` lets a tenant's saved brand replace the text at runtime —
 * see applyBrandChrome in src/integration/live-edit.ts.
 */
export default function Logo({ className = "w-22 sm:w-24" }: LogoProps) {
    return (
        <AppLink
            href="/"
            aria-label={`${BRAND.name} home`}
            className={`inline-block transition-colors duration-150 focus:ring-0 focus:outline-hidden ${className}`}
        >
            <svg
                width="96"
                height="35"
                viewBox="0 0 96 35"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-hidden="true"
            >
                <text
                    x="0"
                    y="25"
                    textLength="94"
                    lengthAdjust="spacingAndGlyphs"
                    fill="currentColor"
                    fontFamily="var(--brand-font-heading, var(--font-sans, Inter, system-ui, sans-serif))"
                    fontSize="22"
                    fontWeight="700"
                    data-brand-name
                >
                    {BRAND.name}
                </text>
            </svg>
        </AppLink>
    );
}
