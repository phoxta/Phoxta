import { HotAirBalloonFreeIcons } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { ComponentType } from "react";
import type { ListingType } from "@/types/domain";
import { ExperiencesSearchForm } from "./experiences-search-form";
import type { FieldStyle } from "./fields/field-styles";

export interface HeroSearchFormTab {
    name: ListingType;
    icon: IconSvgElement;
    href: string;
    formComponent: ComponentType<{ formStyle: FieldStyle }>;
}

// This business offers a single service — Experiences — so there's one search tab.
export const heroSearchFormTabsData: HeroSearchFormTab[] = [
    { name: "Experiences", icon: HotAirBalloonFreeIcons, href: "/", formComponent: ExperiencesSearchForm },
];
