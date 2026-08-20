import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@/styles/tailwind.css";
import "rc-slider/assets/index.css";
import { router } from "@/router";
import { AccountProvider } from "@/util/account";
import { initLiveEdit } from "@/lib/liveEdit";
import AIAssistant from "@/components/AIAssistant";
import AccountButton from "@/components/AccountButton";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AccountProvider>
            <RouterProvider router={router} />
        </AccountProvider>
        {/* Site-wide assistant: talks to this tenant's own Phoxta agent and
            lands in their operating console Inbox. */}
        <AIAssistant />
        <AccountButton />
    </StrictMode>,
);

initLiveEdit();
