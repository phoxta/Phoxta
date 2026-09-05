import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import ButtonPrimary from "@/components/primitives/button-primary";
import { Divider } from "@/components/primitives/divider";
import { Text } from "@/components/primitives/text";
import { Link } from "@/components/chrome/link";
import SocialsList from "@/components/chrome/socials-list";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import { getMegaMenuItems } from "@/data/navigation";
import CurrLangDropdown from "./curr-lang-dropdown";

const megaMenuItems = getMegaMenuItems();

type TMenuItem = (typeof megaMenuItems)[number];

export default function SidebarNavigation() {
    const handleClose = useClose();
    const router = useRouter();

    const handleSubmitForm = (formData: FormData) => {
        const searchQuery = String(formData.get("search") ?? "");
        handleClose();
        router.push("/experience-search" + (searchQuery ? `?location=${encodeURIComponent(searchQuery)}` : ""));
    };

    const renderMenuChild = (item: TMenuItem) => (
        <ul className="border-l border-border ps-4 pb-1">
            {item.children?.map((childMenu, index) => (
                <Disclosure key={index} as="li">
                    <Link
                        href={childMenu.href || '#'}
                        onClick={handleClose}
                        className={clsx('mt-0.5 flex rounded-lg px-3 text-sm font-[450] text-foreground hover:bg-accent')}
                    >
                        <p className={clsx('py-2.5', !childMenu.children && 'block w-full')}>{childMenu.title}</p>
                        {childMenu.children && (
                            <span className="flex grow items-center" onClick={(e) => e.preventDefault()}>
                                <DisclosureButton as="span" className="flex grow justify-end">
                                    <ChevronDownIcon className="ms-2 size-4 text-muted-foreground" aria-hidden="true" />
                                </DisclosureButton>
                            </span>
                        )}
                    </Link>
                    {childMenu.children && <DisclosurePanel>{renderMenuChild(childMenu)}</DisclosurePanel>}
                </Disclosure>
            ))}
        </ul>
    );

    const renderItem = (menu: TMenuItem) => (
        <Disclosure key={menu.title} as="li" className="text-foreground">
            <DisclosureButton className="flex w-full cursor-pointer rounded-lg px-3 text-start hover:bg-accent">
                <p className={clsx(!menu.children?.length && 'flex-1', 'block py-2.5 text-sm font-[450] uppercase')}>
                    {menu.title}
                </p>
                {menu.children?.length && (
                    <div className="flex flex-1 justify-end">
                        <ChevronDownIcon className="me-2 size-4 self-center text-muted-foreground" aria-hidden="true" />
                    </div>
                )}
            </DisclosureButton>
            {menu.children && <DisclosurePanel>{renderMenuChild(menu)}</DisclosurePanel>}
        </Disclosure>
    );

    return (
        <div>
            <Text className="text-muted-foreground">
                Discover the most outstanding articles on all topics of life. Write your stories and share them
            </Text>

            <SocialsList className="mt-5 gap-x-5 sm:gap-x-6" />

            <div className="mt-7">
                <QueryForm className="flex-1 text-foreground" action={handleSubmitForm}>
                    <div className="flex h-full items-center gap-x-2.5 rounded-xl bg-accent px-3 py-3">
                        <HugeiconsIcon icon={Search01Icon} size={24} />
                        <input
                            type="search"
                            name="search"
                            autoFocus
                            autoComplete="off"
                            aria-label="Search for articles"
                            data-autofocus
                            placeholder="Type and press enter"
                            className="w-full border-none bg-transparent focus:ring-0 focus:outline-hidden sm:text-sm"
                        />
                    </div>
                    <input type="submit" hidden value="" />
                </QueryForm>
            </div>

            <ul className="flex flex-col gap-y-1 px-2 py-6">{megaMenuItems?.map(renderItem)}</ul>
            <Divider className="mb-6" />

            <div className="flex items-center justify-between gap-x-2.5 py-6">
                <ButtonPrimary href="#" target="_blank" rel="noopener noreferrer">
                    Buy this template
                </ButtonPrimary>

                <CurrLangDropdown panelAnchor={{ to: 'top end', gap: 12 }} panelClassName="z-10 w-72 p-4!" />
            </div>
        </div>
    );
}
