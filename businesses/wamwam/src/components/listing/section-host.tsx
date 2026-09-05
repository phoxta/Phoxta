import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
    Award04Icon,
    Calendar01Icon,
    Flag03Icon,
    LanguageCircleIcon,
    Medal01Icon,
    Navigation03Icon,
    Timer01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import HostAvatar from "@/components/cards/host-avatar";
import StartRating from "@/components/cards/start-rating";
import { Link } from "@/components/chrome/link";
import SocialsShare from "@/components/chrome/socials-share";
import ButtonSecondary from "@/components/primitives/button-secondary";
import { Divider } from "@/components/primitives/divider";
import type { Host } from "@/types/listings";

/** Detail pages spread the whole Host in; only these fields are rendered. */
type SectionHostProps = Pick<
    Host,
    | "avatarUrl"
    | "displayName"
    | "handle"
    | "rating"
    | "reviewsCount"
    | "listingsCount"
    | "description"
    | "joinedDate"
    | "responseTime"
>;

export default function SectionHost({
    avatarUrl,
    description,
    displayName,
    handle,
    joinedDate,
    rating,
    responseTime,
    reviewsCount,
    listingsCount,
}: SectionHostProps) {
    return (
        <div className="listingSection__wrap rounded-2xl shadow-lg-for-card bg-card p-4 sm:p-8">
            {/* host */}
            <div className="flex items-center gap-x-5">
                <HostAvatar avatarUrl={avatarUrl} />
                <div>
                    <Link className="text-xl font-medium" href={"/authors/" + handle}>
                        {displayName}
                    </Link>
                    <div className="mt-1.5 flex items-center text-sm">
                        <StartRating point={rating} reviewCount={reviewsCount} />
                        <span className="mx-2">·</span>
                        <span>{listingsCount} listings</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-x-1.5">
                    <HugeiconsIcon icon={Medal01Icon} size={20} color="currentColor" strokeWidth={1.5} />
                    Expert guide
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex items-center gap-x-1.5">
                    <HugeiconsIcon icon={Award04Icon} size={20} color="currentColor" strokeWidth={1.5} />
                    2+ years
                </div>
            </div>

            {/* desc */}
            <p className="leading-relaxed text-card-foreground">{description}</p>

            {/* info */}
            <div className="flex flex-col gap-y-3 text-muted-foreground">
                <div className="flex items-center gap-x-4">
                    <HugeiconsIcon icon={Calendar01Icon} size={24} />
                    <span>Joined in {joinedDate}</span>
                </div>
                <div className="flex items-center gap-x-4">
                    <HugeiconsIcon icon={LanguageCircleIcon} size={24} />
                    <span>Speaks English and Thai</span>
                </div>
                <div className="flex items-center gap-x-4">
                    <HugeiconsIcon icon={Timer01Icon} size={24} />

                    <span>Responds {responseTime}</span>
                </div>
            </div>

            {/* == */}
            <div className="flex gap-2">
                <ButtonSecondary href={"/authors/" + handle}>Meet your guide</ButtonSecondary>
                <Popover className="relative">
                    <PopoverButton as={ButtonSecondary} outline>
                        Share
                        <HugeiconsIcon icon={Navigation03Icon} size={20} className="mb-px" />
                    </PopoverButton>
                    <PopoverPanel
                        anchor={{
                            to: "bottom start",
                            gap: 12,
                        }}
                        className="relative z-10"
                    >
                        <SocialsShare />
                    </PopoverPanel>
                </Popover>
            </div>
            <Divider />
            <div className="flex items-center gap-x-2 text-sm text-gray-700 dark:text-gray-300">
                <HugeiconsIcon icon={Flag03Icon} size={16} color="currentColor" strokeWidth={1.5} />
                <span>Ask about this guide</span>
            </div>
        </div>
    );
}
