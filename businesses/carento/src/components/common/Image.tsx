import { forwardRef } from "react";
import type { ImgHTMLAttributes } from "react";

type NextImageLikeProps = Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src" | "width" | "height"
> & {
    src?: string | { src: string } | null;
    alt?: string;
    width?: number | string;
    height?: number | string;
    priority?: boolean;
    quality?: number | string;
    fill?: boolean;
    sizes?: string;
    placeholder?: string;
    blurDataURL?: string;
    loader?: (args: { src: string; width: number; quality?: number }) => string;
    unoptimized?: boolean;
};

const Image = forwardRef<HTMLImageElement, NextImageLikeProps>(function Image(
    {
        src,
        alt = "",
        width,
        height,
        priority: _priority,
        quality: _quality,
        fill,
        sizes,
        placeholder: _placeholder,
        blurDataURL: _blurDataURL,
        loader: _loader,
        unoptimized: _unoptimized,
        style,
        ...rest
    },
    ref
) {
    const resolvedSrc =
        typeof src === "string"
            ? src
            : src && typeof src === "object" && "src" in src
                ? src.src
                : "";

    const fillStyle = fill
        ? {
              position: "absolute" as const,
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover" as const,
              ...style,
          }
        : style;

    return (
        <img
            ref={ref}
            src={resolvedSrc}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            sizes={sizes}
            style={fillStyle}
            {...rest}
        />
    );
});

export default Image;
