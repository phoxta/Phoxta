import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/util/cart";
import { CatalogProvider } from "@/util/catalog";
import { initLiveEdit } from "@/lib/liveEdit";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <CatalogProvider>
                <CartProvider>
                    <App />
                </CartProvider>
            </CatalogProvider>
        </BrowserRouter>
    </React.StrictMode>,
);

initLiveEdit();
