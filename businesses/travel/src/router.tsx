import { createBrowserRouter, Outlet } from "react-router-dom";
import { createElement, lazy, type ComponentType } from "react";
import RootProviders from "@/app-react/RootProviders";
import ErrorBoundary from "@/app-react/ErrorBoundary";
import { page } from "@/app-react/AsyncRoute";

// Layouts
import ListingTypeLayout from "@/app/(app)/(home-pages)/(listing-type)/layout";
import OtherPagesLayout from "@/app/(app)/(other-pages)/layout";
import AccountLayout from "@/app/(account)/layout";
import AuthLayout from "@/app/(auth)/layout";
import ExperienceListingsLayout from "@/app/(app)/(listings)/experience-listings/layout";
import ExperienceSearchLayout from "@/app/(app)/(search-pages)/experience-search/layout";
import ExperienceCategoriesLayout from "@/app/(app)/(categories)/experience-categories/layout";

// Experiences (the single service this business offers)
// Other pages
// Account
// Auth
// One component covers sign in, register and password reset.

// Pages are code-split: the whole app was one 2.6 MB chunk that had to parse
// before anything rendered. Layouts above stay eager so the header and footer
// paint immediately; AsyncRoute holds a Suspense boundary inside the layout.
const HomeExperience = lazy(() => import("@/app/(app)/(home-pages)/(listing-type)/experience/page"));
const ExperienceListing = lazy(() => import("@/app/(app)/(listings)/experience-listings/[handle]/page"));
const ExperienceSearch = lazy(() => import("@/app/(app)/(search-pages)/experience-search/page"));
const ExperienceCategories = lazy(() => import("@/app/(app)/(categories)/experience-categories/[[...handle]]/page"));
const About = lazy(() => import("@/app/(app)/(other-pages)/about/page"));
const Contact = lazy(() => import("@/app/(app)/(other-pages)/contact/page"));
const Blog = lazy(() => import("@/app/(app)/(other-pages)/blog/page"));
const BlogDetail = lazy(() => import("@/app/(app)/(other-pages)/blog/[handle]/page"));
const Authors = lazy(() => import("@/app/(app)/(other-pages)/authors/page"));
const AuthorDetail = lazy(() => import("@/app/(app)/(other-pages)/authors/[handle]/page"));
const Checkout = lazy(() => import("@/app/(app)/(other-pages)/checkout/page"));
const PayDone = lazy(() => import("@/app/(app)/(other-pages)/pay-done/page"));
const ManageBooking = lazy(() => import("@/app/(app)/(other-pages)/manage-booking/page"));
const Account = lazy(() => import("@/pages/Account"));
const Login = lazy(() => import("@/pages/Account"));
const Signup = lazy(() => import("@/pages/Account"));
const ForgotPassword = lazy(() => import("@/pages/Account"));

const r = (path: string, Comp: ComponentType) => ({ path, element: createElement(Comp) });

export const router = createBrowserRouter([
    {
        element: (<RootProviders><Outlet /></RootProviders>),
        errorElement: (<RootProviders><ErrorBoundary /></RootProviders>),
        children: [
            // Home (experiences)
            r("/", page(HomeExperience, [ListingTypeLayout])),
            r("/experience", page(HomeExperience, [ListingTypeLayout])),
            r("/experience-listings/:handle", page(ExperienceListing, [ExperienceListingsLayout])),
            r("/experience-search", page(ExperienceSearch, [ExperienceSearchLayout])),
            r("/experience-categories", page(ExperienceCategories, [ExperienceCategoriesLayout])),
            r("/experience-categories/:handle", page(ExperienceCategories, [ExperienceCategoriesLayout])),
            // Other pages
            r("/about", page(About, [OtherPagesLayout])),
            r("/contact", page(Contact, [OtherPagesLayout])),
            r("/blog", page(Blog, [OtherPagesLayout])),
            r("/blog/:handle", page(BlogDetail, [OtherPagesLayout])),
            r("/authors", page(Authors, [OtherPagesLayout])),
            r("/authors/:handle", page(AuthorDetail, [OtherPagesLayout])),
            r("/checkout", page(Checkout, [OtherPagesLayout])),
            r("/pay-done", page(PayDone, [OtherPagesLayout])),
            r("/manage-booking", page(ManageBooking, [OtherPagesLayout])),
            // Account
            r("/account", page(Account, [AccountLayout])),
            r("/account-billing", page(Account, [AccountLayout])),
            r("/account-password", page(Account, [AccountLayout])),
            r("/account-savelists", page(Account, [AccountLayout])),
            // Auth
            r("/login", page(Login, [AuthLayout])),
            r("/signup", page(Signup, [AuthLayout])),
            r("/forgot-password", page(ForgotPassword, [AuthLayout])),
        ],
    },
]);
