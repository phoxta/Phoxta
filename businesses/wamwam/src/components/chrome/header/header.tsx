import clsx from "clsx";
import { Button } from "@/components/primitives/button";
import Logo from "@/components/chrome/logo";
import AvatarDropdown from "./avatar-dropdown";
import CurrLangDropdown from "./curr-lang-dropdown";
import HamburgerBtnMenu from "./hamburger-btn-menu";
import { HeaderNavigation } from "./header-navigation";

interface Props {
    hasBorderBottom?: boolean;
    className?: string;
}

export default function Header({ hasBorderBottom = true, className }: Props) {
    return (
        <header className={clsx('relative', className)}>
            <div
                className={clsx(
                    'relative border-border bg-background',
                    hasBorderBottom && 'border-b',
                    !hasBorderBottom && 'has-[.header-popover-full-panel]:border-b'
                )}
            >
                <div className="container flex h-20 justify-between">
                    <div className="flex flex-1 items-center lg:hidden">
                        <HamburgerBtnMenu />
                    </div>

                    <div className="flex items-center lg:flex-1">
                        <Logo />
                    </div>

                    <div className="mx-4 flex flex-2">
                        <HeaderNavigation />
                    </div>

                    <div className="flex flex-1 items-center justify-end gap-x-2.5">
                        <Button className="sm:text-sm" plain href={'/contact'}>
                            List your property
                        </Button>
                        <CurrLangDropdown />
                        <AvatarDropdown />
                    </div>
                </div>
            </div>
        </header>
    );
}
