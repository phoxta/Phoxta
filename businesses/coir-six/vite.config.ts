import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// Coir Six is one of the businesses sold on the Phoxta marketplace: its own
// Vercel project serving every buyer at <tenant>.coir-six.phoxta.com, on the
// shared backend. Builds standalone from this folder.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
        // Each business owns a port so several can run side by side in dev.
        // 3009 carento · 3010 gearo · 3012 wamwam · 3013 ferne · 3014 coir-six.
        port: 3014,
        strictPort: true,
    },
    build: {
        rollupOptions: {
            output: {
                // Only React-free vendor code is split out; react stays in the
                // entry (splitting it produces a circular chunk graph).
                manualChunks(id: string) {
                    if (!id.includes("node_modules")) return undefined;
                    if (id.includes("@supabase")) return "vendor-supabase";
                    return undefined;
                },
            },
        },
    },
});
