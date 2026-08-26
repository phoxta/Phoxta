import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { LibraryImage } from "@/lib/db/designs";

/**
 * The graphics studio's asset library.
 *
 * Everything here goes through the org-member-gated `design-assets` edge
 * function — the browser never holds the Pexels or OpenAI key, and the org id
 * in the body is authorised server-side before a single byte is written.
 *
 * Three sources, ONE record. An upload, a generated picture and a stored asset
 * from six months ago are the same `DesignAsset`, so the library has one card,
 * one insert path and one delete path rather than three of each. Stock
 * photography is the exception and stays a `LibraryImage`: it is not stored, it
 * carries a photographer credit, and pretending it is an owned asset would
 * quietly drop the attribution the Pexels licence requires.
 */

export type DesignAsset = {
  /** Storage path, "<orgId>/<file>". The delete key — treat it as opaque. */
  path: string;
  /** Human label; also what the library searches on. */
  name: string;
  /** Permanent public URL, safe to store on a design. */
  url: string;
  size: number;
  createdAt: string;
  source: "upload" | "generated";
};

export type Orientation = "square" | "landscape" | "portrait";

/** Matches MAX_BYTES in supabase/functions/design-assets/index.ts. Checked in
 *  the browser too, so an oversized file fails instantly instead of after a
 *  10MB upload. */
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;

/** What the library will take. SVG is refused on purpose — see the function. */
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

/** The `accept` attribute for a file input, from the same list. */
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

/** An asset as the canvas wants it. Uploaded and generated pictures need no
 *  credit — the business owns them — so only the URL and a description travel. */
export function assetToImage(a: DesignAsset): LibraryImage {
  return { url: a.url, thumb: a.url, alt: a.name, source: a.source };
}

/* ── Transport ────────────────────────────────────────────────────────────── */

/** Invoke the function and unwrap the message it actually sent, rather than
 *  the transport's "non-2xx status code". Same idiom as helpCenter.ts. */
async function fn(
  body: Record<string, unknown>,
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("design-assets", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* keep the transport message */ }
    return { data: null, error: friendlyError(msg) ?? "That did not work." };
  }
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.error === "string") return { data: null, error: d.error };
  return { data: d, error: null };
}

/** File → bare base64 (no data-URI prefix), which is what the function decodes. */
function toBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

/* ── The library ──────────────────────────────────────────────────────────── */

/** Everything this business has stored, newest first. */
export async function listAssets(orgId: string): Promise<{ data: DesignAsset[]; error: string | null }> {
  const { data, error } = await fn({ action: "list", orgId });
  if (error || !data) return { data: [], error };
  return { data: (data.assets as DesignAsset[]) ?? [], error: null };
}

/**
 * Store one file.
 *
 * The type and size are checked here as well as on the server — not because
 * the client check is a security boundary (it is not) but because telling
 * someone their 40MB photograph is too big should not cost them a 40MB upload
 * first.
 */
export async function uploadAsset(orgId: string, file: File): Promise<{ data: DesignAsset | null; error: string | null }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { data: null, error: `${file.name} is not an image the library takes — use PNG, JPEG, WebP, GIF or AVIF.` };
  }
  if (file.size > MAX_ASSET_BYTES) {
    return { data: null, error: `${file.name} is larger than 10MB.` };
  }
  const b64 = await toBase64(file);
  if (!b64) return { data: null, error: `${file.name} could not be read.` };

  const { data, error } = await fn({ action: "upload", orgId, name: file.name, type: file.type, data: b64 });
  if (error || !data) return { data: null, error };
  return { data: (data.asset as DesignAsset) ?? null, error: null };
}

/** Remove one asset. The path is re-derived from the authorised org server-side,
 *  so this cannot reach another business's object however it is called. */
export async function deleteAsset(orgId: string, path: string): Promise<{ data: boolean; error: string | null }> {
  const { data, error } = await fn({ action: "delete", orgId, path });
  return { data: !!data?.ok, error };
}

/**
 * Draw a picture that does not exist yet.
 *
 * Slow by nature — most of a minute for a large one — and the caller is
 * expected to say so rather than spin silently. The bytes land in the same
 * bucket as an upload, so the answer is an ordinary asset: insertable at once,
 * still there tomorrow.
 */
export async function generateAsset(
  orgId: string, prompt: string, orientation: Orientation = "square",
): Promise<{ data: DesignAsset | null; error: string | null }> {
  const p = prompt.trim();
  if (!p) return { data: null, error: "Describe the picture you want." };
  const { data, error } = await fn({ action: "generate", orgId, prompt: p, orientation });
  if (error || !data) return { data: null, error };
  return { data: (data.asset as DesignAsset) ?? null, error: null };
}

/**
 * Free photography from Pexels, through the function so the key stays server-
 * side. The photographer's name and profile URL travel with every result and
 * must be rendered wherever the photograph appears — that is the licence, not
 * politeness.
 */
export async function searchStock(orgId: string, query: string): Promise<{ data: LibraryImage[]; error: string | null }> {
  const q = query.trim();
  if (!q) return { data: [], error: null };
  const { data, error } = await fn({ action: "stock", orgId, query: q });
  if (error || !data) return { data: [], error };
  return { data: (data.photos as LibraryImage[]) ?? [], error: null };
}
