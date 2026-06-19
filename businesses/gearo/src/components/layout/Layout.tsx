import type { ReactNode } from "react";
import Topbar from "@/components/layout/Topbar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// Shared page chrome: topbar + header + page content + footer, inside the
// template's #wrapper. ScrollToTop is mounted once at the router root.
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div id="wrapper">
            <Topbar />
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}
