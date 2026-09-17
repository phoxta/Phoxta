/**
 * A tiny ZIP writer — enough to hand a family their whole archive.
 *
 * "Export produces a ZIP of JSON plus media" is an acceptance criterion, and
 * Wàfè adds no dependencies, so this writes the format by hand: stored
 * entries (method 0, no compression), local headers, a central directory and
 * an end-of-central-directory record. JSON compresses beautifully, but a
 * family archive is mostly photographs, which do not — so the honest trade is
 * eighty lines of code instead of a library.
 *
 * Everything is little-endian, filenames are UTF-8 with bit 11 set.
 */

export interface ZipFile {
    /** Path inside the archive, e.g. "media/member-ayo.jpg". */
    name: string;
    data: Uint8Array;
}

const CRC_TABLE: Uint32Array = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c >>> 0;
    }
    return t;
})();

function crc32(buf: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

/** MS-DOS date and time, which is what the format has always used. */
function dosStamp(at: Date): { time: number; date: number } {
    return {
        time: (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1),
        date: ((at.getFullYear() - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
    };
}

export function makeZip(files: ZipFile[], at: Date = new Date()): Blob {
    const { time, date } = dosStamp(at);
    const names = files.map((f) => utf8(f.name));
    const crcs = files.map((f) => crc32(f.data));

    const localSize = files.reduce((sum, f, i) => sum + 30 + names[i].length + f.data.length, 0);
    const centralSize = files.reduce((sum, _f, i) => sum + 46 + names[i].length, 0);
    const buf = new Uint8Array(localSize + centralSize + 22);
    const view = new DataView(buf.buffer);
    let at32 = 0;
    const u16 = (v: number) => {
        view.setUint16(at32, v, true);
        at32 += 2;
    };
    const u32 = (v: number) => {
        view.setUint32(at32, v >>> 0, true);
        at32 += 4;
    };
    const bytes = (b: Uint8Array) => {
        buf.set(b, at32);
        at32 += b.length;
    };

    const offsets: number[] = [];
    files.forEach((f, i) => {
        offsets.push(at32);
        u32(0x04034b50); // local file header
        u16(20); // version needed
        u16(0x0800); // flags: UTF-8 names
        u16(0); // method: stored
        u16(time);
        u16(date);
        u32(crcs[i]);
        u32(f.data.length); // compressed
        u32(f.data.length); // uncompressed
        u16(names[i].length);
        u16(0); // extra
        bytes(names[i]);
        bytes(f.data);
    });

    const centralStart = at32;
    files.forEach((f, i) => {
        u32(0x02014b50); // central directory header
        u16(20); // version made by
        u16(20); // version needed
        u16(0x0800);
        u16(0);
        u16(time);
        u16(date);
        u32(crcs[i]);
        u32(f.data.length);
        u32(f.data.length);
        u16(names[i].length);
        u16(0); // extra
        u16(0); // comment
        u16(0); // disk
        u16(0); // internal attrs
        u32(0); // external attrs
        u32(offsets[i]);
        bytes(names[i]);
    });

    // Capture the directory's size BEFORE the record that describes it: the
    // writer moves the cursor, so reading it inside the call is 14 bytes late.
    const centralSizeActual = at32 - centralStart;
    u32(0x06054b50); // end of central directory
    u16(0);
    u16(0);
    u16(files.length);
    u16(files.length);
    u32(centralSizeActual);
    u32(centralStart);
    u16(0);

    return new Blob([buf], { type: "application/zip" });
}

export const jsonFile = (name: string, value: unknown): ZipFile => ({ name, data: utf8(JSON.stringify(value, null, 2)) });

export const textFile = (name: string, text: string): ZipFile => ({ name, data: utf8(text) });

/** Pull one picture into the archive; a missing file is skipped, never fatal. */
export async function mediaFile(url: string, name?: string): Promise<ZipFile | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = new Uint8Array(await res.arrayBuffer());
        const derived = url.startsWith("data:") ? "" : url.split("?")[0].split("/").filter(Boolean).slice(-2).join("-");
        return { name: `media/${name || derived || "file"}`, data: buf };
    } catch {
        return null;
    }
}

/** Hand the archive to the browser. */
export function download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the download a moment to start before the URL stops resolving.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
