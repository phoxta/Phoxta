import { Link } from "react-router-dom";
import { IconClose } from "@/lib/icons";
import { useAccount } from "@/state/account";
import { useUi } from "@/state/ui";

export type NavLink = { to: string; label: string; count?: number };

/** The mobile menu. Same links as the desktop bar, plus the two the desktop
 *  header shows as icons — account and help — so nothing is unreachable on a
 *  phone. */
export default function MenuDrawer({ links }: { links: NavLink[] }) {
    const { overlay, close } = useUi();
    const { email } = useAccount();

    return (
        <aside className={`drawer left${overlay === "menu" ? " open" : ""}`} aria-hidden={overlay !== "menu"}>
            <div className="d-head">
                <b>Menu</b>
                <button type="button" className="icon-btn" onClick={close} aria-label="Close menu">
                    <IconClose />
                </button>
            </div>
            <div className="d-body">
                <nav className="mnav">
                    {links.map((l) => (
                        <Link key={l.to + l.label} to={l.to} onClick={close}>
                            {l.label}
                            <small>{l.count ?? ""}</small>
                        </Link>
                    ))}
                    <Link to="/account" onClick={close}>
                        {email ? "My account" : "Sign in"}
                        <small />
                    </Link>
                    <Link to="/contact" onClick={close}>
                        Help &amp; FAQ
                        <small />
                    </Link>
                </nav>
            </div>
        </aside>
    );
}
