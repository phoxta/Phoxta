import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { CartProvider } from "@/util/cart";
import { WishlistProvider } from "@/util/wishlist";
import { CatalogProvider } from "@/util/catalog";
import { initLiveEdit } from "@/lib/liveEdit";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <CatalogProvider>
            <CartProvider>
                <WishlistProvider>
                    <RouterProvider router={router} />
                </WishlistProvider>
            </CartProvider>
        </CatalogProvider>
    </StrictMode>,
);

initLiveEdit();
