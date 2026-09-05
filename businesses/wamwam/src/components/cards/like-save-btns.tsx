import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";
import { Share03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import { useState, type ReactNode } from "react";
import SocialsShare from "@/components/chrome/socials-share";
import { ButtonCircle } from "@/components/primitives/button";

/** Local-only heart toggle; nothing is persisted. */
export function LikeButton() {
    const [isLiked, setIsLiked] = useState(false);
    return (
        <ButtonCircle className="size-10!" outline onClick={() => setIsLiked((value) => !value)}>
            {isLiked ? <HeartIcon className={"size-5! text-red-400"} /> : <HeartIconOutline className="size-5!" />}
        </ButtonCircle>
    );
}

export function ShareButton({ className, children }: { className?: string; children?: ReactNode }) {
    return (
        <Popover className="relative">
            <PopoverButton className={clsx("size-10!", className)} as={ButtonCircle} outline>
                {children || <HugeiconsIcon icon={Share03Icon} size={20} />}
            </PopoverButton>
            <PopoverPanel
                anchor={{
                    to: "bottom end",
                    gap: 12,
                }}
                className="relative z-10"
            >
                <SocialsShare />
            </PopoverPanel>
        </Popover>
    );
}

export default function LikeSaveBtns({ className }: { className?: string }) {
    return (
        <div className={clsx("flex gap-2", className)}>
            <LikeButton />
            <ShareButton />
        </div>
    );
}
