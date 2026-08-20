import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { AccountProvider } from "@/util/account";
import { CartProvider } from "@/util/cart";
import { WishlistProvider } from "@/util/wishlist";
import { CatalogProvider } from "@/util/catalog";
import { initLiveEdit } from "@/lib/liveEdit";
import AIAssistant from "@/components/AIAssistant";
import AccountButton from "@/components/AccountButton";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AccountProvider>
            <CatalogProvider>
            <CartProvider>
                <WishlistProvider>
                    <RouterProvider router={router} />
                    {/* Site-wide assistant: talks to this tenant's own Phoxta
                        agent and lands in their operating console Inbox. */}
                    <AIAssistant />
                    <AccountButton />
                </WishlistProvider>
            </CartProvider>
        </CatalogProvider>
            </AccountProvider>
    </StrictMode>,
);

initLiveEdit();
