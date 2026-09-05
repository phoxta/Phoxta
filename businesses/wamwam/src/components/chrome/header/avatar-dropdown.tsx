import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
    FavouriteIcon,
    Idea01Icon,
    Logout01Icon,
    Notification01Icon,
    Task01Icon,
    UserCircle02Icon,
    UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Fragment, type ReactNode } from "react";
import Avatar from "@/components/primitives/avatar";
import { Divider } from "@/components/primitives/divider";
import ButtonCircle from "@/components/primitives/button-circle";
import { Link } from "@/components/chrome/link";
import SwitchDarkMode2 from "@/components/chrome/switch-dark-mode2";
import avatarImage from "@/assets/images/avatars/Image-1.png";

interface Props {
    className?: string;
    triggerButton?: ReactNode;
}

const menuItems = [
    { href: '/authors/john-doe', icon: UserIcon, label: 'Profile' },
    { href: '#', icon: Notification01Icon, label: 'Notifications' },
    { href: '/authors/john-doe', icon: Task01Icon, label: 'My listings' },
    { href: '/account-savelists', icon: FavouriteIcon, label: 'Wishlist' },
];

export default function AvatarDropdown({ className, triggerButton }: Props) {
    return (
        <div className={className}>
            <Popover>
                <PopoverButton as={Fragment}>
                    {triggerButton || (
                        <ButtonCircle color={'accent'} aria-label="Account menu">
                            <HugeiconsIcon icon={UserCircle02Icon} size={24} />
                        </ButtonCircle>
                    )}
                </PopoverButton>

                <PopoverPanel
                    transition
                    anchor={{ to: 'bottom end', gap: 12 }}
                    className="z-20 w-80 rounded-3xl shadow-lg-for-card bg-card transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0"
                >
                    <div className="relative grid grid-cols-1 gap-6 px-6 py-7">
                        <div className="flex items-center space-x-3">
                            <Avatar src={avatarImage.src} className="size-12" />

                            <div className="grow">
                                <h4 className="font-semibold">Eden Smith</h4>
                                <p className="mt-0.5 text-xs">Los Angeles, CA</p>
                            </div>
                        </div>

                        <Divider />

                        {menuItems.map((item, index) => (
                            <Link
                                key={index}
                                href={item.href}
                                className="-m-3 flex items-center rounded-lg p-2 transition-colors hover:bg-accent focus:outline-none"
                            >
                                <div className="flex shrink-0 items-center justify-center text-muted-foreground">
                                    <HugeiconsIcon icon={item.icon} size={20} />
                                </div>
                                <p className="ms-4 text-sm font-medium">{item.label}</p>
                            </Link>
                        ))}

                        <Divider />

                        <div className="-m-3 flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent focus:outline-none">
                            <div className="flex items-center">
                                <div className="flex shrink-0 items-center justify-center text-muted-foreground">
                                    <HugeiconsIcon icon={Idea01Icon} size={20} />
                                </div>
                                <p className="ms-4 text-sm font-medium">Dark mode</p>
                            </div>
                            <SwitchDarkMode2 />
                        </div>

                        <Link
                            href={'#'}
                            className="-m-3 flex items-center rounded-lg p-2 transition-colors hover:bg-accent focus:outline-none"
                        >
                            <div className="flex shrink-0 items-center justify-center text-muted-foreground">
                                <HugeiconsIcon icon={Logout01Icon} size={20} />
                            </div>
                            <p className="ms-4 text-sm font-medium">{'Log out'}</p>
                        </Link>
                    </div>
                </PopoverPanel>
            </Popover>
        </div>
    );
}
