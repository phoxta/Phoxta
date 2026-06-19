// `next` package shim — type-only imports (Metadata, Route, Viewport) used across
// the template. Provide permissive aliases so they compile under Vite/TS.
// deno-lint-ignore no-explicit-any
export type Metadata = any;
// deno-lint-ignore no-explicit-any
export type Viewport = any;
export type Route<T = string> = T;
// deno-lint-ignore no-explicit-any
export type NextPage<P = any> = (props: P) => any;
export default {};
