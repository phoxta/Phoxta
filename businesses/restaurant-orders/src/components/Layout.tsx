import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import AIChat from "@/components/AIChat";

export default function Layout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return (
        <>
            <Nav />
            <main>{children}</main>
            <Footer />
            <CartDrawer />
            <AIChat />
        </>
    );
}
