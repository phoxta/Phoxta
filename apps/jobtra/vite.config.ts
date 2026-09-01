import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// Jobtra is a self-contained app served under /jobtra on femi.phoxta.com. It is
// built separately from the Phoxta SPA (its own Tailwind bundle) and emitted
// into the Phoxta dist so Vercel serves it as static files at /jobtra/.
export default defineConfig({
    root: __dirname,
    // Read env from the repo root so VITE_SUPABASE_* are shared with the main app
    // (locally via .env.local; on Vercel they come from process.env either way).
    envDir: path.resolve(__dirname, "../.."),
    base: "/jobtra/",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { "@": path.resolve(__dirname, ".") },
    },
    build: {
        outDir: path.resolve(__dirname, "../../dist/jobtra"),
        emptyOutDir: true,
    },
});
