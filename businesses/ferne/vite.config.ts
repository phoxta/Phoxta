import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Each storefront owns a port so several can run side by side in dev.
    // 3009 carento · 3010 gearo · 3011 travel · 3012 wamwam · 3013 ferne.
    port: 3013,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Only React-free vendor code is split out. supabase-js is large and has
        // no dependency back into the app graph, so it chunks cleanly; react and
        // react-dom deliberately stay in the entry (splitting them produces a
        // circular chunk graph and an undefined JSX runtime — a blank page).
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@supabase")) return "vendor-supabase";
          return undefined;
        },
      },
    },
  },
});
