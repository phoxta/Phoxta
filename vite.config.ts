import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Canonical shared chat code. The storefronts vendor this file (they deploy
      // from their own folder and cannot see the repo root); the platform SPA
      // builds FROM the root, so it imports the original instead of a copy.
      "@shared-chat": path.resolve(__dirname, "./packages/shared-chat/src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Split out the large, React-free libs into cacheable chunks (these have
        // no dependency back into the app/React graph, so no circular chunks).
        manualChunks(id) {
          // Only split out large, React-free vendor libs. Do NOT manually chunk
          // app/section code — grouping it created a circular chunk graph that
          // left React's JSX runtime undefined at runtime (blank page). The
          // generated registry uses static imports to keep the chunk count sane.
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("gsap")) return "vendor-gsap";
          return undefined;
        },
      },
    },
  },
});

