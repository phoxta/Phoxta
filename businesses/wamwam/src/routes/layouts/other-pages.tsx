import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import Header from "@/components/chrome/header/header";
import { ApplicationLayout } from "@/routes/layouts/app-shell";

/**
 * Content pages (about, contact, blog, authors, checkout, 404). Unlike the home
 * routes these pass the header explicitly so it keeps its bottom border — there
 * is no hero image behind it to separate it from the page.
 */
export default function OtherPagesLayout({ children }: RouteProps & { children: ReactNode }) {
    return <ApplicationLayout header={<Header hasBorderBottom={true} />}>{children}</ApplicationLayout>;
}
