import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const r = (p: string) => path.resolve(__dirname, p);

// next/* imports are aliased to local shims so the template's component/page code
// runs unchanged on Vite + React Router (see src/shims/*).
export default defineConfig({
    plugins: [react(), tailwindcss()],
    // The template reads process.env.NEXT_PUBLIC_THEME_DIR at runtime (RTL/LTR);
    // `process` doesn't exist in the browser under Vite, so inline it as LTR.
    define: {
        "process.env.NEXT_PUBLIC_THEME_DIR": JSON.stringify("ltr"),
        "process.env": "{}",
    },
    resolve: {
        alias: [
            { find: /^next\/image$/, replacement: r("./src/shims/image.tsx") },
            { find: /^next\/link$/, replacement: r("./src/shims/link.tsx") },
            { find: /^next\/navigation$/, replacement: r("./src/shims/navigation.ts") },
            { find: /^next\/form$/, replacement: r("./src/shims/form.tsx") },
            { find: /^next\/font\/google$/, replacement: r("./src/shims/font.ts") },
            { find: /^next\/font\/local$/, replacement: r("./src/shims/font.ts") },
            { find: /^next\/script$/, replacement: r("./src/shims/script.tsx") },
            { find: /^next\/og$/, replacement: r("./src/shims/og.ts") },
            { find: /^server-only$/, replacement: r("./src/shims/empty.ts") },
            { find: /^next$/, replacement: r("./src/shims/next.ts") },
            { find: "@", replacement: r("./src") },
        ],
    },
    server: { port: 3011, open: true },
});
