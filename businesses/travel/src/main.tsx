import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@/styles/tailwind.css";
import "rc-slider/assets/index.css";
import { router } from "@/router";
import { initLiveEdit } from "@/lib/liveEdit";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);

initLiveEdit();
