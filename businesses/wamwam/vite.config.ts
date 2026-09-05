import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("./src", import.meta.url));

/**
 * Static image imports resolve to `{ src, width?, height?, toString() }` objects
 * rather than bare URL strings.
 *
 * The design system reads `img.src` in ~50 places (hero and why-us avatars, blog
 * authors, airline logos, listing galleries) and gates several renders on the
 * object's truthiness. Vite exports an asset as a plain string, so without this
 * transform every one of those reads is `undefined` and the image silently
 * disappears. The object still coerces to the URL, so `<img src={img}>` and
 * template literals keep working unchanged.
 *
 * `src/types/vite-env.d.ts` declares the matching module shape so `.src` reads
 * type-check; do NOT add `vite/client`'s asset declarations, which type the
 * default export as a string and contradict this plugin.
 */
const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
function staticImageObjects(): Plugin {
    return {
        name: "wamwam:static-image-objects",
        enforce: "post",
        transform(code, id) {
            const [file, query = ""] = id.split("?");
            if (!IMAGE_RE.test(file) || /(^|&)(raw|url|inline)(&|=|$)/.test(query)) return null;
            const m = code.match(/^\s*export default\s+([^\n;]+);?\s*$/m);
            if (!m) return null;
            return {
                code:
                    `const __src = ${m[1]};\n` +
                    `export default { src: __src, toString() { return __src; }, [Symbol.toPrimitive]() { return __src; } };`,
                map: null,
            };
        },
    };
}

export default defineConfig({
    plugins: [react(), tailwindcss(), staticImageObjects()],
    define: {
        // Some transitive dependencies still probe `process.env.X`; the browser
        // has no `process`, so define it away rather than crash at boot.
        "process.env": "{}",
    },
    resolve: {
        alias: [{ find: "@", replacement: SRC }],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    // Only large, React-free vendor libraries are split out. Grouping
                    // app or React code into named chunks produces a circular chunk
                    // graph and an undefined JSX runtime (blank page), so react and
                    // react-dom deliberately stay in the entry.
                    if (!id.includes("node_modules")) return undefined;
                    if (id.includes("maplibre-gl")) return "vendor-maplibre";
                    if (id.includes("@supabase")) return "vendor-supabase";
                    if (id.includes("date-fns")) return "vendor-datefns";
                    if (id.includes("@hugeicons")) return "vendor-icons";
                    return undefined;
                },
            },
        },
    },
    server: { port: 3012, strictPort: true },
});
