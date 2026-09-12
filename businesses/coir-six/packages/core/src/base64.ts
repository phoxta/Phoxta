/** Base64 without btoa/atob or Buffer — Hermes, browsers and Node all lack a shared one for bytes. */
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < ABC.length; i++) LOOKUP[ABC.charCodeAt(i)] = i;

export function base64Encode(bytes: Uint8Array): string {
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
        const n = (a << 16) | (b << 8) | c;
        out += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63] + (i + 1 < bytes.length ? ABC[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? ABC[n & 63] : "=");
    }
    return out;
}

export function base64Decode(s: string): Uint8Array {
    const clean = s.replace(/[^A-Za-z0-9+/]/g, "");
    const len = Math.floor((clean.length * 3) / 4);
    const out = new Uint8Array(len);
    let p = 0;
    for (let i = 0; i < clean.length; i += 4) {
        const n = (LOOKUP[clean.charCodeAt(i)] << 18) | (LOOKUP[clean.charCodeAt(i + 1)] << 12) | (LOOKUP[clean.charCodeAt(i + 2)] << 6) | LOOKUP[clean.charCodeAt(i + 3)];
        if (p < len) out[p++] = (n >> 16) & 255;
        if (p < len) out[p++] = (n >> 8) & 255;
        if (p < len) out[p++] = n & 255;
    }
    return out;
}
