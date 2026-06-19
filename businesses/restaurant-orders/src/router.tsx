import { createBrowserRouter } from "react-router-dom";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import Reservations from "@/pages/Reservations";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Checkout from "@/pages/Checkout";
import OrderTracking from "@/pages/OrderTracking";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

export const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    { path: "/menu", element: <Menu /> },
    { path: "/reservations", element: <Reservations /> },
    { path: "/about", element: <About /> },
    { path: "/contact", element: <Contact /> },
    { path: "/checkout", element: <Checkout /> },
    { path: "/track", element: <OrderTracking /> },
    { path: "/dashboard", element: <Dashboard /> },
    { path: "*", element: <NotFound /> },
]);
