import { createBrowserRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import AboutUs from "@/pages/AboutUs";
import BlogDetails from "@/pages/BlogDetails";
import BlogGrid from "@/pages/BlogGrid";
import BlogList from "@/pages/BlogList";
import Calculator from "@/pages/Calculator";
import CarsDetails1 from "@/pages/CarsDetails1";
import CarsDetails2 from "@/pages/CarsDetails2";
import CarsDetails3 from "@/pages/CarsDetails3";
import CarsDetails4 from "@/pages/CarsDetails4";
import CarsList1 from "@/pages/CarsList1";
import CarsList2 from "@/pages/CarsList2";
import CarsList3 from "@/pages/CarsList3";
import CarsList4 from "@/pages/CarsList4";
import Contact from "@/pages/Contact";
import ManageBooking from "@/pages/ManageBooking";
import DealerDetails from "@/pages/DealerDetails";
import DealerListing from "@/pages/DealerListing";
import Faqs from "@/pages/Faqs";
import Index2 from "@/pages/Index2";
import Index3 from "@/pages/Index3";
import Login from "@/pages/Login";
import Pricing from "@/pages/Pricing";
import Register from "@/pages/Register";
import Services from "@/pages/Services";
import ShopDetails from "@/pages/ShopDetails";
import ShopList from "@/pages/ShopList";
import Term from "@/pages/Term";

export const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    { path: "/about-us", element: <AboutUs /> },
    { path: "/blog-details", element: <BlogDetails /> },
    { path: "/blog-grid", element: <BlogGrid /> },
    { path: "/blog-list", element: <BlogList /> },
    { path: "/calculator", element: <Calculator /> },
    { path: "/cars-details-1", element: <CarsDetails1 /> },
    { path: "/cars-details-2", element: <CarsDetails2 /> },
    { path: "/cars-details-3", element: <CarsDetails3 /> },
    { path: "/cars-details-4", element: <CarsDetails4 /> },
    { path: "/cars-list-1", element: <CarsList1 /> },
    { path: "/cars-list-2", element: <CarsList2 /> },
    { path: "/cars-list-3", element: <CarsList3 /> },
    { path: "/cars-list-4", element: <CarsList4 /> },
    { path: "/contact", element: <Contact /> },
    { path: "/manage-booking", element: <ManageBooking /> },
    { path: "/dealer-details", element: <DealerDetails /> },
    { path: "/dealer-listing", element: <DealerListing /> },
    { path: "/faqs", element: <Faqs /> },
    { path: "/index-2", element: <Index2 /> },
    { path: "/index-3", element: <Index3 /> },
    { path: "/login", element: <Login /> },
    { path: "/pricing", element: <Pricing /> },
    { path: "/register", element: <Register /> },
    { path: "/services", element: <Services /> },
    { path: "/shop-details", element: <ShopDetails /> },
    { path: "/shop-list", element: <ShopList /> },
    { path: "/term", element: <Term /> },
    { path: "*", element: <NotFound /> },
]);
