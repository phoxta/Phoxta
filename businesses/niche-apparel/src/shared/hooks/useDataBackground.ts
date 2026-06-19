import { useEffect } from "react";

/**
 * Applies data-background URLs as inline background-image on the client.
 * Pass a value that changes per route (e.g. pathname) so backgrounds are
 * re-applied to freshly-mounted sections after SPA navigation, not just on
 * the initial hard load.
 */
export function useDataBackground(deps?: unknown) {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-background]");
    elements.forEach((element) => {
      const bgUrl = element.getAttribute("data-background");
      if (bgUrl) element.style.backgroundImage = `url(${bgUrl})`;
    });
  }, [deps]);
}

