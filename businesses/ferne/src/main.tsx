import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { initLiveEdit } from "@/lib/liveEdit";
import { AccountProvider } from "@/state/account";
import { CartProvider } from "@/state/cart";
import { CatalogProvider } from "@/state/catalog";
import { UiProvider } from "@/state/ui";
import { WishlistProvider } from "@/state/wishlist";
import "@/styles/ferne.css";

// Provider order matters: the cart re-prices itself against the catalogue, so
// CatalogProvider has to be outside it.
ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <CatalogProvider>
                <AccountProvider>
                    <CartProvider>
                        <WishlistProvider>
                            <UiProvider>
                                <App />
                            </UiProvider>
                        </WishlistProvider>
                    </CartProvider>
                </AccountProvider>
            </CatalogProvider>
        </BrowserRouter>
    </React.StrictMode>,
);

// In-context editing from the Studio iframe. A no-op for ordinary visitors.
initLiveEdit();
