import { createBrowserRouter } from "react-router-dom";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import SpecialOrders from "@/pages/SpecialOrders";
import Account from "@/pages/Account";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Checkout from "@/pages/Checkout";
import OrderTracking from "@/pages/OrderTracking";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

export const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    { path: "/menu", element: <Menu /> },
    { path: "/special-orders", element: <SpecialOrders /> },
    { path: "/account", element: <Account /> },
    // Old dine-in route: this is a digital-first kitchen now, so anyone landing
    // on it (a bookmark, an old link) is sent to the request form.
    { path: "/reservations", element: <SpecialOrders /> },
    { path: "/about", element: <About /> },
    { path: "/contact", element: <Contact /> },
    { path: "/checkout", element: <Checkout /> },
    { path: "/track", element: <OrderTracking /> },
    { path: "/dashboard", element: <Dashboard /> },
    { path: "*", element: <NotFound /> },
]);
