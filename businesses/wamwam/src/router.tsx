import { createBrowserRouter, Outlet } from "react-router-dom";
import { lazy, type ComponentType } from "react";
import RootProviders from "@/app/root-providers";
import ErrorBoundary from "@/app/error-boundary";
import { page, type LayoutComponent, type PageComponent } from "@/app/route-renderer";
import { ROUTES, type LayoutKey, type PageKey } from "@/routes/route-manifest";

// Layouts stay eager so header, nav and footer paint immediately; only the
// page body is code-split. A lazy layout would put the whole chrome behind
// the Suspense boundary and blank the screen on every navigation.
import ListingTypeLayout from "@/routes/layouts/listing-type";
import OtherPagesLayout from "@/routes/layouts/other-pages";
import AccountLayout from "@/routes/layouts/account";
import AuthLayout from "@/routes/layouts/auth";
import ExperienceListingsLayout from "@/routes/layouts/experience-listings";
import ExperienceSearchLayout from "@/routes/layouts/experience-search";
import ExperienceCategoriesLayout from "@/routes/layouts/experience-categories";

const LAYOUTS: Record<LayoutKey, LayoutComponent> = {
    "listing-type": ListingTypeLayout,
    "other-pages": OtherPagesLayout,
    account: AccountLayout,
    auth: AuthLayout,
    "experience-listings": ExperienceListingsLayout,
    "experience-search": ExperienceSearchLayout,
    "experience-categories": ExperienceCategoriesLayout,
};

// One lazy import per page module. Several URLs share the account module; each
// URL still gets its own element so navigating between them remounts and the
// sign-in / create-account mode does not leak across routes.
const PAGES: Record<PageKey, () => Promise<{ default: PageComponent }>> = {
    "home-experience": () => import("@/routes/home/experience"),
    "experience-detail": () => import("@/routes/listings/experience-detail"),
    "experience-search": () => import("@/routes/search/experience-search"),
    "experience-categories": () => import("@/routes/categories/experience-categories"),
    about: () => import("@/routes/pages/about"),
    contact: () => import("@/routes/pages/contact"),
    blog: () => import("@/routes/pages/blog"),
    "blog-detail": () => import("@/routes/pages/blog-detail"),
    authors: () => import("@/routes/pages/authors"),
    "author-detail": () => import("@/routes/pages/author-detail"),
    checkout: () => import("@/routes/pages/checkout"),
    "pay-done": () => import("@/routes/pages/pay-done"),
    "manage-booking": () => import("@/routes/pages/manage-booking"),
    account: () => import("@/routes/account/account"),
    "not-found": () => import("@/routes/pages/not-found"),
};

function routeElement(pageKey: PageKey, layoutKey: LayoutKey): ComponentType {
    const Page = lazy(PAGES[pageKey]);
    return page(Page as PageComponent, [LAYOUTS[layoutKey]]);
}

export const router = createBrowserRouter([
    {
        element: (
            <RootProviders>
                <Outlet />
            </RootProviders>
        ),
        errorElement: (
            <RootProviders>
                <ErrorBoundary />
            </RootProviders>
        ),
        children: ROUTES.map((r) => {
            const Element = routeElement(r.page, r.layout);
            return { path: r.path, element: <Element /> };
        }),
    },
]);
