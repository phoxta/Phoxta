// The email layout lives in packages/email so BOTH sides can import it: the
// edge functions that send mail, and the console that previews them. It cannot
// live here — .vercelignore excludes supabase/ from the SPA build, so an
// import from the app into this directory fails on Vercel while succeeding
// locally, which is exactly how it failed the first time.
//
// This file stays as the path every function already imports.
export * from "../../../packages/email/src/render.ts";
