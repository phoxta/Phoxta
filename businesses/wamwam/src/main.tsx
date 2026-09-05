import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@/styles/tailwind.css";
import "rc-slider/assets/index.css";
import { router } from "@/router";
import { AccountProvider } from "@/integration/account-context";
import { initLiveEdit } from "@/integration/live-edit";
import AIAssistant from "@/components/chrome/ai-assistant";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AccountProvider>
            <RouterProvider router={router} />
        </AccountProvider>
        {/* Site-wide assistant. Mounted beside the router, not inside it, so it
            paints over the catalogue loading gate and its transcript survives
            SPA navigation. */}
        <AIAssistant />
    </StrictMode>,
);

initLiveEdit();
