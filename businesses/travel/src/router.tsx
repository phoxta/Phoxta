import { createBrowserRouter, Outlet } from "react-router-dom";
import { createElement, type ComponentType } from "react";
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
import HomeExperience from "@/app/(app)/(home-pages)/(listing-type)/experience/page";
import ExperienceListing from "@/app/(app)/(listings)/experience-listings/[handle]/page";
import ExperienceSearch from "@/app/(app)/(search-pages)/experience-search/page";
import ExperienceCategories from "@/app/(app)/(categories)/experience-categories/[[...handle]]/page";
// Other pages
import About from "@/app/(app)/(other-pages)/about/page";
import Contact from "@/app/(app)/(other-pages)/contact/page";
import Blog from "@/app/(app)/(other-pages)/blog/page";
import BlogDetail from "@/app/(app)/(other-pages)/blog/[handle]/page";
import Authors from "@/app/(app)/(other-pages)/authors/page";
import AuthorDetail from "@/app/(app)/(other-pages)/authors/[handle]/page";
import Checkout from "@/app/(app)/(other-pages)/checkout/page";
import PayDone from "@/app/(app)/(other-pages)/pay-done/page";
import Subscription from "@/app/(app)/(other-pages)/subscription/page";
import ManageBooking from "@/app/(app)/(other-pages)/manage-booking/page";
// Account
import Account from "@/app/(account)/account/page";
import AccountBilling from "@/app/(account)/account-billing/page";
import AccountPassword from "@/app/(account)/account-password/page";
import AccountSavelists from "@/app/(account)/account-savelists/page";
// Auth
import Login from "@/app/(auth)/login/page";
import Signup from "@/app/(auth)/signup/page";
import ForgotPassword from "@/app/(auth)/forgot-password/page";

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
            r("/subscription", page(Subscription, [OtherPagesLayout])),
            r("/manage-booking", page(ManageBooking, [OtherPagesLayout])),
            // Account
            r("/account", page(Account, [AccountLayout])),
            r("/account-billing", page(AccountBilling, [AccountLayout])),
            r("/account-password", page(AccountPassword, [AccountLayout])),
            r("/account-savelists", page(AccountSavelists, [AccountLayout])),
            // Auth
            r("/login", page(Login, [AuthLayout])),
            r("/signup", page(Signup, [AuthLayout])),
            r("/forgot-password", page(ForgotPassword, [AuthLayout])),
        ],
    },
]);
