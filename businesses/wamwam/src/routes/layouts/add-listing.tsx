import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useEffect, type ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import ButtonPrimary from "@/components/primitives/button-primary";
import ButtonSecondary from "@/components/primitives/button-secondary";
import { usePathname } from "@/lib/nav/navigation";

/** Step pages are `/add-listing/1` … `/add-listing/10`; anything else counts as step 1. */
function useStepIndex() {
    const pathname = usePathname();
    const match = pathname.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 1;
}

export default function AddListingLayout({ children }: RouteProps & { children: ReactNode }) {
    const index = useStepIndex();

    // The layout persists across the ten steps, so this only fires when the
    // wizard is first entered — deliberately, as in the source.
    useEffect(() => {
        document.documentElement.scrollTo({
            top: 0,
            behavior: "instant",
        });
    }, []);

    return (
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-24 sm:pt-16 lg:pb-32">
            <PageHeading index={index} />
            <div className="mt-8 listingSection__wrap">{children}</div>
            <Pagination index={index} />
        </div>
    );
}

function PageHeading({ index }: { index: number }) {
    return (
        <div>
            <span className="text-5xl font-medium">{index}</span>
            <span className="text-lg text-muted-foreground"> / 10</span>
        </div>
    );
}

function Pagination({ index }: { index: number }) {
    // On the last step the primary button navigates to the finished listing;
    // on every other step it only submits the form, which pushes the next step.
    const nextHref = index < 10 ? undefined : "/stay-listings/preview-stay-84763232";
    const backHref = index > 1 ? `/add-listing/${index - 1}` : `/add-listing/${1}`;

    const nextBtnText = index > 9 ? "Publish listing" : "Next step " + (index + 1);
    const backBtnText = index > 1 ? "Go back" : "Back to home";

    return (
        <div className="mt-10 flex flex-wrap justify-end gap-3">
            <ButtonSecondary type="button" href={backHref}>
                {backBtnText}
            </ButtonSecondary>
            <ButtonPrimary type="submit" form="add-listing-form" {...(nextHref ? { href: nextHref } : {})}>
                {nextBtnText}
                <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
            </ButtonPrimary>
        </div>
    );
}
