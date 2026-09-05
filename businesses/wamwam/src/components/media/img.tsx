import type { CSSProperties, ImgHTMLAttributes, Ref } from "react";

/**
 * The app's image element. Accepts either a URL string or a static import
 * object from the staticImageObjects plugin, and maps `fill` to an
 * absolutely-positioned cover image the way the design system's layouts
 * expect.
 *
 * Property-for-property contract, because ~90 call sites depend on it:
 * - `fill` → position:absolute; inset:0; width/height 100%; object-fit:cover,
 *   with the caller's `style` spread AFTER so it can override.
 * - Under `fill`, width/height attributes are dropped (the box is CSS-sized).
 * - `loading` defaults to "eager" when `priority` is set, else "lazy".
 * - Remaining props spread LAST so the caller always wins.
 */

export type ImgSource = string | StaticImage | { default?: StaticImage; src?: string } | null | undefined;

export interface ImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
    src: ImgSource;
    width?: number | string;
    height?: number | string;
    /** Stretch to fill the nearest positioned ancestor. */
    fill?: boolean;
    /** Above-the-fold hint: eager-load and mark as high fetch priority. */
    priority?: boolean;
    ref?: Ref<HTMLImageElement>;
}

export function resolveImgSrc(src: ImgSource): string {
    if (!src) return "";
    if (typeof src === "string") return src;
    if ("src" in src && typeof src.src === "string") return src.src;
    if ("default" in src && src.default) return src.default.src ?? "";
    return "";
}

const FILL_STYLE: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
};

export default function Img({
    src,
    alt = "",
    width,
    height,
    fill,
    style,
    priority,
    loading,
    ref,
    ...rest
}: ImgProps) {
    return (
        <img
            ref={ref}
            src={resolveImgSrc(src)}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            style={fill ? { ...FILL_STYLE, ...style } : style}
            loading={loading ?? (priority ? "eager" : "lazy")}
            fetchPriority={priority ? "high" : undefined}
            {...rest}
        />
    );
}
