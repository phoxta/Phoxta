import { CheckIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import Avatar from "@/components/primitives/avatar";

interface HostAvatarProps {
    className?: string;
    avatarUrl: string;
    isVerified?: boolean;
    avatarSize?: string;
    verifiedSize?: string;
    name?: string;
}

export default function HostAvatar({
    className,
    avatarSize = "size-14",
    avatarUrl,
    isVerified = true,
    verifiedSize = "size-6",
    name = "name",
}: HostAvatarProps) {
    return (
        <div className={clsx("relative", className)}>
            <Avatar src={avatarUrl} className={avatarSize} initials={name.charAt(0)} />
            {isVerified && (
                <div
                    className={clsx(
                        "absolute -end-px -bottom-px flex items-center justify-center rounded-full bg-green-600 text-white shadow-lg",
                        verifiedSize,
                    )}
                >
                    <CheckIcon className="h-4 w-4" />
                </div>
            )}
        </div>
    );
}
