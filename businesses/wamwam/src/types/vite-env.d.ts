/**
 * Ambient declarations for the Vite runtime and static asset imports.
 *
 * Deliberately NOT `/// <reference types="vite/client" />`: that declares
 * `*.png` etc. as plain `string` default exports, which contradicts the
 * `staticImageObjects` plugin in vite.config.ts. The plugin rewrites every
 * image import into an object so the ~50 `img.src` reads across the design
 * system resolve. These declarations describe that object shape.
 */

interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_ORG_ID?: string;
    /** Origin of the Phoxta Studio that may embed this storefront for live editing. */
    readonly VITE_STUDIO_ORIGIN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/** Shape emitted by the staticImageObjects Vite plugin for every image import. */
interface StaticImage {
    readonly src: string;
    toString(): string;
}

declare module "*.png" {
    const img: StaticImage;
    export default img;
}
declare module "*.jpg" {
    const img: StaticImage;
    export default img;
}
declare module "*.jpeg" {
    const img: StaticImage;
    export default img;
}
declare module "*.webp" {
    const img: StaticImage;
    export default img;
}
declare module "*.gif" {
    const img: StaticImage;
    export default img;
}
declare module "*.avif" {
    const img: StaticImage;
    export default img;
}
declare module "*.svg" {
    const img: StaticImage;
    export default img;
}
declare module "*.css";
