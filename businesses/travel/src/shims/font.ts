// next/font/google + next/font/local shim. The font functions just return an
// object with empty className/variable; fonts are loaded via index.html instead.
// deno-lint-ignore no-explicit-any
type FontResult = { className: string; variable: string; style: { fontFamily?: string } };
const make = () => (_opts?: any): FontResult => ({ className: "", variable: "", style: {} });

// Named exports for any Google font the template imports.
export const Google_Sans_Flex = make();
export const Playfair_Display = make();
export const Inter = make();
export const Poppins = make();
export const Roboto = make();
export const Open_Sans = make();
export const Montserrat = make();
export const Lato = make();
export const Nunito = make();

// next/font/local default export
export default make();
