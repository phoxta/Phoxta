import { Link, useLocation } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Sprig } from "@/components/brand";

/** A wrong turn, gently handled: back home or into search. */
export default function NotFoundPage() {
    const { pathname } = useLocation();
    return (
        <div className="mx-auto max-w-md py-10 text-center md:py-16">
            <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
                <Sprig className="w-7" />
            </span>
            <h1 className="font-display text-7xl leading-9 md:text-[36px] md:leading-10">We couldn't find that page</h1>
            <p className="mt-3 text-md leading-6 text-muted">
                Nothing lives at <code className="rounded-xs bg-subtle px-1.5 py-0.5 text-sm text-ink">{pathname}</code>. It may have moved, or it may be a module that hasn't arrived yet.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
                <Link to="/" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                    <Home size={16} aria-hidden="true" /> Back home
                </Link>
                <Link to="/search" className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-5 text-md font-semibold text-ink hover:border-ink">
                    <Search size={16} aria-hidden="true" /> Search instead
                </Link>
            </div>
        </div>
    );
}
