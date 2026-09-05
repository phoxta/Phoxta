import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/primitives/navigation-menu";
import AppLink from "@/lib/nav/link";
import { getMegaMenuItems, getTravelersMenu } from "@/data/navigation";

const megaMenuItems = getMegaMenuItems();
const travelers = getTravelersMenu();

export function HeaderNavigation() {
    return (
        <NavigationMenu>
            <NavigationMenuList className="rounded-full shadow-md-for-card px-2 py-1.5">
                <NavigationMenuItem>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <AppLink href="/">Home</AppLink>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuTrigger>Travelers</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        {/* Not a <ul>: its children are links, not list items. */}
                        <div className="grid w-80 grid-cols-1 gap-5 p-4">
                            {travelers.map((item, index) => (
                                <AppLink
                                    key={index}
                                    href={item.href}
                                    className="group/traveler -m-2 flex items-center rounded-lg p-2 text-sm text-accent-foreground transition-colors hover:bg-accent focus:outline-none"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent transition-colors group-hover/traveler:bg-card sm:size-12 dark:group-hover/traveler:bg-card/30">
                                        <HugeiconsIcon icon={item.icon} size={28} />
                                    </div>
                                    <div className="ms-4 space-y-0.5">
                                        <p className="font-medium">{item.title}</p>
                                        <p className="line-clamp-1 text-muted-foreground">{item.description}</p>
                                    </div>
                                </AppLink>
                            ))}
                        </div>
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem className="hidden md:flex">
                    <NavigationMenuTrigger>Explore</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        {/* Not a <ul>: its children are column wrappers, not list items. */}
                        <div className="grid w-[400px] flex-1 grid-cols-3 gap-x-5 gap-y-10 p-5 text-sm md:w-[500px] lg:w-[600px]">
                            {megaMenuItems.map((megaMenuItem, index) => (
                                <div key={index}>
                                    <p className="font-medium">{megaMenuItem.title}</p>
                                    <ul className="mt-4 grid space-y-4">
                                        {megaMenuItem.children?.map((menuItem, childIndex) => (
                                            <li key={childIndex} className={clsx('menu-item')}>
                                                <AppLink className="font-normal hover:underline" href={menuItem.href || '#'}>
                                                    {menuItem.title}
                                                </AppLink>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <AppLink href="/experience-search">Search</AppLink>
                    </NavigationMenuLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    );
}
