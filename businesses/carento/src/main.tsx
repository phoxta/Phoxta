import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { AccountProvider } from "@/util/account";
import { FleetProvider } from "@/util/fleet";
import { initLiveEdit } from "@/lib/liveEdit";
import AIAssistant from "@/components/AIAssistant";
import AccountButton from "@/components/AccountButton";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AccountProvider>
            <FleetProvider>
            <RouterProvider router={router} />
            {/* Site-wide assistant: talks to this tenant's own Phoxta agent and
                lands in their operating console Inbox. */}
            <AIAssistant />
            <AccountButton />
        </FleetProvider>
            </AccountProvider>
    </StrictMode>
);

initLiveEdit();
