import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { FleetProvider } from "@/util/fleet";
import { initLiveEdit } from "@/lib/liveEdit";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <FleetProvider>
            <RouterProvider router={router} />
        </FleetProvider>
    </StrictMode>
);

initLiveEdit();
