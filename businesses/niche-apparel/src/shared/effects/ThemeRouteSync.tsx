import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Aurelia is light mode only — always pin the document to the light theme.
export default function ThemeRouteSync() {
    const pathname = useLocation().pathname;
    useEffect(() => {
        document.documentElement.setAttribute("data-bs-theme", "light");
    }, [pathname]);
    return null;
}
