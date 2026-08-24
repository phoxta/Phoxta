import { createBrowserRouter, Outlet } from "react-router-dom";
import AIAssistant from "@/components/AIAssistant";
import AccountButton from "@/components/AccountButton";
import ScrollToTop from "@/components/common/ScrollToTop";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Blog from "@/pages/Blog";
import BlogDetails from "@/pages/BlogDetails";
// The template shipped inert Login/MyAccount shells (onSubmit preventDefault,
// no data). Every account route now renders the working page, which handles
// sign in, register, reset, order history and profile.
import Faqs from "@/pages/Faqs";
import Wishlist from "@/pages/Wishlist";
import OrderTracking from "@/pages/OrderTracking";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/NotFound";
import Account from "@/pages/Account";

// Long-tail template variants reuse the converted pages above; only a few rarely
// linked layouts remain as styled placeholders.
const SHOP_VARIANTS = [
    "shop-default", "shop-list", "shop-full-grid", "shop-full-list",
    "shop-sidebar-left", "shop-sidebar-right", "shop-filter-sidebar",
    "shop-filter-canvas", "shop-filter-dropdown", "shop-pagination",
    "shop-load-button", "shop-infinite-scrolling", "search-result",
];
export const router = createBrowserRouter([
    {
        // AccountButton renders a <Link>, so it needs router context. Mounted
        // beside RouterProvider in main.tsx it read a null context and threw on
        // first render, which left #root empty and the whole site blank.
        element: (<><ScrollToTop /><Outlet /><AIAssistant /><AccountButton /></>),
        children: [
            { path: "/", element: <Home /> },
            ...SHOP_VARIANTS.map((p) => ({ path: `/${p}`, element: <Shop title="Shop" /> })),
            { path: "/product-detail", element: <ProductDetail /> },
            { path: "/product-style-01", element: <ProductDetail /> },
            { path: "/product-style-02", element: <ProductDetail /> },
            { path: "/product-style-03", element: <ProductDetail /> },
            { path: "/shopping-cart", element: <Cart /> },
            { path: "/checkout", element: <Checkout /> },
            { path: "/about", element: <About /> },
            { path: "/contact", element: <Contact /> },
            { path: "/blog-grid", element: <Blog /> },
            { path: "/blog-list", element: <Blog /> },
            { path: "/blog-details", element: <BlogDetails /> },
            { path: "/login", element: <Account /> },
            { path: "/register", element: <Account /> },
            { path: "/my-account", element: <Account /> },
            { path: "/my-account-orders", element: <Account /> },
            { path: "/my-account-address", element: <Account /> },
            { path: "/faqs", element: <Faqs /> },
            { path: "/wish-list", element: <Wishlist /> },
            { path: "/order", element: <OrderTracking /> },
            { path: "/term-of-use", element: <Terms /> },
            { path: "/account", element: <Account /> },
            { path: "*", element: <NotFound /> },
        ],
    },
]);
