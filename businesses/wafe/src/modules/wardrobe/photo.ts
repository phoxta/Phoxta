/**
 * Photo compression for closet items (AC 5).
 *
 * A parent photographs a coat on a hall floor with a modern phone and hands
 * the app a four-megabyte JPEG. That is fine on the sofa and ruinous on a
 * train, so nothing reaches storage — localStorage in the demo, the `catalog`
 * bucket live — until it is under 300 KB.
 *
 * The method is plain and has no dependencies: draw the picture into a canvas
 * at most `MAX_EDGE` on its longest side, then step the JPEG quality down
 * until the encoded result fits. If even the smallest quality is too big
 * (a panorama of a wardrobe, say), halve the canvas and try again. It always
 * terminates, and it always returns a data URL the caller can store or an
 * error the caller can show — never a silent half-success.
 */

/** The ceiling the acceptance criterion names. */
export const MAX_BYTES = 300 * 1024;
const MAX_EDGE = 1280;
const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42, 0.34];

export interface CompressedPhoto {
    /** `data:image/jpeg;base64,…` — under MAX_BYTES, guaranteed. */
    dataUrl: string;
    /** Bytes of the encoded image (not the base64 string). */
    bytes: number;
    width: number;
    height: number;
    /** Bytes of the file the person chose, for the "3.9 MB → 184 KB" line. */
    originalBytes: number;
}

export const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** "184 KB", "3.9 MB". */
export function fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Bytes carried by a base64 data URL, without decoding it. */
export function dataUrlBytes(dataUrl: string): number {
    const i = dataUrl.indexOf(",");
    if (i < 0) return 0;
    const b64 = dataUrl.slice(i + 1);
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("That file isn't an image this browser can open."));
        };
        img.src = url;
    });
}

/**
 * Compress `file` to a JPEG data URL of at most `MAX_BYTES`.
 * Throws with a sentence a person can act on; never returns something too big.
 */
export async function compressPhoto(file: File, maxBytes = MAX_BYTES): Promise<CompressedPhoto> {
    if (!file.type.startsWith("image/")) throw new Error("Choose a photo — a JPEG, PNG or HEIC from your phone.");
    const img = await loadImage(file);
    let edge = MAX_EDGE;

    for (let attempt = 0; attempt < 4; attempt++) {
        const scale = Math.min(1, edge / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const g = canvas.getContext("2d");
        if (!g) throw new Error("This browser wouldn't let us resize the photo.");
        // A white ground: a PNG with transparency would otherwise turn black as a JPEG.
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, w, h);
        g.drawImage(img, 0, 0, w, h);

        for (const q of QUALITIES) {
            const dataUrl = canvas.toDataURL("image/jpeg", q);
            const bytes = dataUrlBytes(dataUrl);
            if (bytes <= maxBytes) return { dataUrl, bytes, width: w, height: h, originalBytes: file.size };
        }
        edge = Math.round(edge / 2);
    }
    throw new Error("We couldn't get that photo under 300 KB. Try a closer, smaller picture.");
}
