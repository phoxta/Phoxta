import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { AccountProvider } from "@/util/account";
import { FleetProvider } from "@/util/fleet";
import { initLiveEdit } from "@/lib/liveEdit";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AccountProvider>
            <FleetProvider>
            <RouterProvider router={router} />
        </FleetProvider>
            </AccountProvider>
    </StrictMode>
);

initLiveEdit();
