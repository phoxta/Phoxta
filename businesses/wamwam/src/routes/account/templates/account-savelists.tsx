import StayCard2 from "@/components/cards/stay-card2";
import { Button } from "@/components/primitives/button";
import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import { getStayListings } from "@/data/listings";
import type { RouteProps } from "@/app/route-renderer";

/** Design-system saved-listings template — ported, unrouted and unwired. */
export default function Page(_props: RouteProps) {
    const stayListings = getStayListings();

    const renderSection1 = () => {
        return (
            <div>
                <Heading level={1}>
                    Saved <span data-slot="italic">listings</span>
                </Heading>

                <Divider className="my-8 w-14!" />

                <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                    {stayListings.slice(0, 8).map((stay) => (
                        <StayCard2 key={stay.id} data={stay} />
                    ))}
                </div>
                <div className="mt-16 flex items-center justify-center">
                    <Button>Show me more</Button>
                </div>
            </div>
        );
    };

    return renderSection1();
}
