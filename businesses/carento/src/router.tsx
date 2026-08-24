import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AIAssistant from "@/components/AIAssistant";
import AccountButton from "@/components/AccountButton";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import AboutUs from "@/pages/AboutUs";
import BlogDetails from "@/pages/BlogDetails";
import BlogGrid from "@/pages/BlogGrid";
import BlogList from "@/pages/BlogList";
import Calculator from "@/pages/Calculator";
import Vehicle from "@/pages/Vehicle";
import Inventory from "@/pages/Inventory";
import Contact from "@/pages/Contact";
import DealerDetails from "@/pages/DealerDetails";
import DealerListing from "@/pages/DealerListing";
import Faqs from "@/pages/Faqs";
import Services from "@/pages/Services";
import ShopDetails from "@/pages/ShopDetails";
import ShopList from "@/pages/ShopList";
import Term from "@/pages/Term";
// The template Login/Register pages were inert markup; both routes render the
// working account page instead.
import Account from "@/pages/Account";

// Car SALES, not rental: the template's duplicate list/detail variants, its
// alternate home pages, the rental subscription tiers and the rental booking
// lookup are all gone. One inventory list, one vehicle page.
/**
 * Site-wide chrome that needs router context.
 *
 * AccountButton renders a <Link>. Mounted beside RouterProvider in main.tsx it
 * read a null navigation context and threw on first render — React unmounted
 * the tree, #root stayed empty, and every page of the site was blank.
 */
function SiteChrome() {
    return (
        <>
            <Outlet />
            <AIAssistant />
            <AccountButton />
        </>
    );
}

export const router = createBrowserRouter([
    {
        element: <SiteChrome />,
        children: [
    { path: "/", element: <Home /> },
    { path: "/about-us", element: <AboutUs /> },
    { path: "/blog-details", element: <BlogDetails /> },
    { path: "/blog-grid", element: <BlogGrid /> },
    { path: "/blog-list", element: <BlogList /> },
    { path: "/calculator", element: <Calculator /> },
    { path: "/inventory", element: <Inventory /> },
    { path: "/vehicle/:id", element: <Vehicle /> },
    // /vehicle with nothing selected still shows the first car, as the template
    // did, so the bare path stays valid.
    { path: "/vehicle", element: <Vehicle /> },
    // The template's old paths, kept as redirects so existing links and
    // bookmarks land on the right page instead of 404ing.
    { path: "/cars-list-1", element: <Navigate to="/inventory" replace /> },
    { path: "/cars-details-1", element: <Navigate to="/vehicle" replace /> },
    { path: "/contact", element: <Contact /> },
    { path: "/dealer-details", element: <DealerDetails /> },
    { path: "/dealer-listing", element: <DealerListing /> },
    { path: "/faqs", element: <Faqs /> },
    { path: "/login", element: <Account /> },
    { path: "/register", element: <Account /> },
    { path: "/services", element: <Services /> },
    { path: "/shop-details", element: <ShopDetails /> },
    { path: "/shop-list", element: <ShopList /> },
    { path: "/term", element: <Term /> },
    { path: "/account", element: <Account /> },
    // Templates link to /404 explicitly as well as relying on the catch-all.
    { path: "/404", element: <NotFound /> },
    { path: "*", element: <NotFound /> },
        ],
    },
]);
