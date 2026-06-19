import { forwardRef, type CSSProperties } from "react";

// next/image shim → plain <img>. Handles both string srcs and imported-asset
// objects ({ src }), and maps `fill` to an absolutely-positioned cover image.
// deno-lint-ignore no-explicit-any
type Props = any;

const Image = forwardRef<HTMLImageElement, Props>(function Image(
    { src, alt = "", width, height, fill, className, style, sizes, priority, quality, placeholder, blurDataURL, loading, unoptimized, fetchPriority, onLoad, onError, ...rest },
    ref,
) {
    const resolved = typeof src === "object" && src ? (src.src ?? src.default?.src ?? "") : src;
    const fillStyle: CSSProperties | undefined = fill
        ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...(style as CSSProperties) }
        : (style as CSSProperties);
    return (
        <img
            ref={ref}
            src={resolved}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            className={className}
            style={fillStyle}
            sizes={sizes}
            loading={loading ?? (priority ? "eager" : "lazy")}
            onLoad={onLoad}
            onError={onError}
            {...rest}
        />
    );
});

export default Image;
