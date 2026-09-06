import { Link } from "react-router-dom";
import { IconArrow } from "@/lib/icons";
import PageMeta from "@/components/PageMeta";

export default function NotFoundPage() {
    return (
        <div className="page">
            <PageMeta title="Page not found" />
            <div className="wrap">
                <div className="empty" style={{ padding: "120px 20px" }}>
                    {/* A real heading, not a styled <b> — every page owes a
                        screen reader and a crawler one h1. */}
                    <h1 className="serif">We can&rsquo;t find that page</h1>
                    It may have moved, or the link may be out of date.
                    <br />
                    <br />
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        <Link className="btn sm" to="/shop">
                            Shop all products
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </Link>
                        <Link className="btn sm plain ghost" to="/">
                            Back home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
