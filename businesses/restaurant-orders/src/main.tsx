import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CartProvider } from "@/util/cart";
import { MenuProvider } from "@/util/menu";
import { router } from "@/router";
import { initLiveEdit } from "@/lib/liveEdit";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MenuProvider>
            <CartProvider>
                <RouterProvider router={router} />
            </CartProvider>
        </MenuProvider>
    </StrictMode>,
);

initLiveEdit();
