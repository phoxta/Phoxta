import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { clamp } from "@coir-six/core";
import { Dialog } from "@/components/ui/overlay";
import { Button, IconButton } from "@/components/ui/primitives";

/**
 * Pick the part of a photo that becomes the avatar.
 *
 * The photo sits behind a round window. Drag it to move it; pinch, scroll or
 * use the slider to zoom; the arrow keys nudge it and +/- zoom for keyboard
 * users. It always covers the window (zoom 1 = "just covers"), so the result
 * is never letterboxed. "Use photo" exports a 512px square JPEG.
 */

const VIEW = 280;
const OUT = 512;
const MAX_ZOOM = 4;

type Pt = { x: number; y: number };
/** Zoom and the drawn image's top-left corner, px, relative to the window. */
type View = { zoom: number; x: number; y: number };

export function PhotoCropper({ file, onCancel, onDone, onError }: { file: File | null; onCancel: () => void; onDone: (blob: Blob) => Promise<void> | void; onError: (message: string) => void }) {
    const [url, setUrl] = useState("");
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const pointers = useRef(new Map<number, Pt>());
    const pinch = useRef<{ dist: number; zoom: number } | null>(null);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    // One object URL per picked file, revoked when it goes away.
    useEffect(() => {
        if (!file) {
            setUrl("");
            setImg(null);
            return;
        }
        const u = URL.createObjectURL(file);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [file]);

    // Load it, then centre it at the cover scale.
    useEffect(() => {
        if (!url) return;
        let active = true;
        const im = new Image();
        im.onload = () => {
            if (!active) return;
            const c = VIEW / Math.min(im.naturalWidth, im.naturalHeight);
            setImg(im);
            setView({ zoom: 1, x: (VIEW - im.naturalWidth * c) / 2, y: (VIEW - im.naturalHeight * c) / 2 });
        };
        im.onerror = () => {
            if (active) onErrorRef.current("That image couldn't be opened. Try a JPG, PNG or WebP.");
        };
        im.src = url;
        return () => {
            active = false;
        };
    }, [url]);

    // Geometry. `cover` is the scale at which the shorter side exactly fills the window.
    const cover = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
    const drawn = (z: number): Pt => ({ x: img ? img.naturalWidth * cover * z : 0, y: img ? img.naturalHeight * cover * z : 0 });
    /** Keep the image covering the window: no gaps on any side. */
    const fit = (v: View): View => {
        const d = drawn(v.zoom);
        return { zoom: v.zoom, x: clamp(v.x, VIEW - d.x, 0), y: clamp(v.y, VIEW - d.y, 0) };
    };
    /** Change zoom while keeping whatever is under the window's centre in place. */
    const zoomAround = (v: View, next: number): View => {
        const z = clamp(next, 1, MAX_ZOOM);
        const k = z / v.zoom;
        const c = VIEW / 2;
        return fit({ zoom: z, x: c - (c - v.x) * k, y: c - (c - v.y) * k });
    };
    const zoomTo = (z: number) => setView((v) => zoomAround(v, z));
    const zoomBy = (f: number) => setView((v) => zoomAround(v, v.zoom * f));

    // Scroll to zoom. Native listener: React's wheel events are passive, so
    // preventDefault (which keeps the sheet from scrolling) only works here.
    useEffect(() => {
        const el = box.current;
        if (!el || !img) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            zoomBy(Math.exp(-e.deltaY * 0.0015));
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [img]);

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!img) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom };
        }
        setDragging(true);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const prev = pointers.current.get(e.pointerId);
        if (!prev) return;
        const cur = { x: e.clientX, y: e.clientY };
        pointers.current.set(e.pointerId, cur);
        if (pointers.current.size >= 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            zoomTo(pinch.current.zoom * (d / pinch.current.dist));
            return;
        }
        setView((v) => fit({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }));
    };
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        if (pointers.current.size === 0) setDragging(false);
    };
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 24 : 8;
        const nudge: Record<string, Pt> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
        const n = nudge[e.key];
        if (n) {
            e.preventDefault();
            setView((v) => fit({ ...v, x: v.x + n.x, y: v.y + n.y }));
        } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            zoomBy(1.1);
        } else if (e.key === "-") {
            e.preventDefault();
            zoomBy(1 / 1.1);
        }
    };

    const use = async () => {
        if (!img || busy) return;
        setBusy(true);
        try {
            const s = cover * view.zoom;
            const canvas = document.createElement("canvas");
            canvas.width = OUT;
            canvas.height = OUT;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("This browser can't export the photo");
            ctx.fillStyle = "#fff"; // JPEG has no alpha: transparent PNGs get a white ground, not black
            ctx.fillRect(0, 0, OUT, OUT);
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, -view.x / s, -view.y / s, VIEW / s, VIEW / s, 0, 0, OUT, OUT);
            const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
            if (!blob) throw new Error("Couldn't export the photo");
            await onDone(blob);
        } catch (e) {
            onError(e instanceof Error ? e.message : "Couldn't save the photo");
        }
        setBusy(false);
    };

    const d = drawn(view.zoom);
    return (
        <Dialog open={Boolean(file)} onClose={onCancel} title="Adjust your photo">
            <p className="mb-4 text-[13px] leading-5 text-muted">Drag the photo until the part you want sits inside the circle. Pinch, scroll or use the slider to zoom.</p>
            {/* A drag surface with full keyboard equivalents (arrows nudge, +/- and the
                slider zoom), so the a11y rules about non-interactive roles don't apply. */}
            {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <div
                ref={box}
                role="img"
                aria-label="Photo position. Drag to move it, arrow keys to nudge, plus and minus to zoom."
                tabIndex={0}
                className={cn("relative mx-auto touch-none select-none overflow-hidden rounded-lg bg-ink outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2", dragging ? "cursor-grabbing" : "cursor-grab")}
                style={{ width: VIEW, height: VIEW }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
            >
                {img && <img src={url} alt="" draggable={false} className="absolute left-0 top-0 max-w-none" style={{ width: d.x, height: d.y, transform: `translate(${view.x}px, ${view.y}px)` }} />}
                {/* The round window: everything outside it is dimmed. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(27,27,35,0.62)] ring-2 ring-white/90" />
            </div>
            {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <div className="mt-4 flex items-center gap-3">
                <IconButton label="Zoom out" size="md" onClick={() => zoomBy(1 / 1.2)} disabled={!img || view.zoom <= 1}>
                    <Minus size={14} />
                </IconButton>
                <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={view.zoom} onChange={(e) => zoomTo(Number(e.target.value))} aria-label="Zoom" disabled={!img} className="min-w-0 flex-1 accent-brand" />
                <IconButton label="Zoom in" size="md" onClick={() => zoomBy(1.2)} disabled={!img || view.zoom >= MAX_ZOOM}>
                    <Plus size={14} />
                </IconButton>
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" size="md" onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
                <Button size="md" onClick={() => void use()} loading={busy} disabled={!img}>
                    Use photo
                </Button>
            </div>
        </Dialog>
    );
}
