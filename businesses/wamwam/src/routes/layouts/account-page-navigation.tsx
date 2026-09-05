import AppLink from "@/lib/nav/link";
import { usePathname } from "@/lib/nav/navigation";

const navigation = [
    {
        title: "Account",
        href: "/account",
    },
    {
        title: "Saved listings",
        href: "/account-savelists",
    },
    {
        title: "Password",
        href: "/account-password",
    },
    {
        title: "Payments & payouts",
        href: "/account-billing",
    },
];

/** Tab strip above the account pages; the active tab is whichever href the URL matches. */
export const PageNavigation = () => {
    const pathname = usePathname();

    return (
        <div className="container">
            <div className="hidden-scrollbar flex gap-x-8 overflow-x-auto md:gap-x-14">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <AppLink
                            key={item.title}
                            href={item.href}
                            className={`block shrink-0 border-b-2 py-5 capitalize md:py-8 ${
                                isActive ? "border-primary font-medium" : "border-transparent"
                            }`}
                        >
                            {item.title}
                        </AppLink>
                    );
                })}
            </div>
        </div>
    );
};
