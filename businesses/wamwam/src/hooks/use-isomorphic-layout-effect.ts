import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect in the browser, useEffect wherever there is no window (prerender). */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
