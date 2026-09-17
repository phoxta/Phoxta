/** The 11-character id from any YouTube URL shape (watch, share, embed) or a bare id. */
export function youtubeId(url: string): string | null {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/) ?? url.match(/^([A-Za-z0-9_-]{11})$/);
    return m ? m[1] : null;
}

export const youtubeThumb = (id: string): string => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** Bundled images are site-relative (`/images/…`); a phone needs the full URL. Absolute and data URLs pass through. */
export function mediaUrl(src: string | undefined, base: string): string | undefined {
    if (!src) return undefined;
    if (/^(https?:|data:|blob:|file:)/.test(src)) return src;
    return base.replace(/\/$/, "") + (src.startsWith("/") ? src : `/${src}`);
}
