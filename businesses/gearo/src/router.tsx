import { createBrowserRouter, Outlet } from "react-router-dom";
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
import Login from "@/pages/Login";
import MyAccount from "@/pages/MyAccount";
import Faqs from "@/pages/Faqs";
import Wishlist from "@/pages/Wishlist";
import OrderTracking from "@/pages/OrderTracking";
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";

// Long-tail template variants reuse the converted pages above; only a few rarely
// linked layouts remain as styled placeholders.
const SHOP_VARIANTS = [
    "shop-default", "shop-list", "shop-full-grid", "shop-full-list",
    "shop-sidebar-left", "shop-sidebar-right", "shop-filter-sidebar",
    "shop-filter-canvas", "shop-filter-dropdown", "shop-pagination",
    "shop-load-button", "shop-infinite-scrolling", "search-result",
];
const PLACEHOLDERS: [string, string][] = [
    ["store-list", "Our Stores"],
    ["term-of-use", "Terms of Use"],
];

export const router = createBrowserRouter([
    {
        element: (<><ScrollToTop /><Outlet /></>),
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
            { path: "/login", element: <Login mode="login" /> },
            { path: "/register", element: <Login mode="register" /> },
            { path: "/my-account", element: <MyAccount /> },
            { path: "/my-account-orders", element: <MyAccount /> },
            { path: "/my-account-address", element: <MyAccount /> },
            { path: "/faqs", element: <Faqs /> },
            { path: "/wish-list", element: <Wishlist /> },
            { path: "/order", element: <OrderTracking /> },
            ...PLACEHOLDERS.map(([p, t]) => ({ path: `/${p}`, element: <Placeholder title={t} /> })),
            { path: "*", element: <NotFound /> },
        ],
    },
]);
