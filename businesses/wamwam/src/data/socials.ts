import { Facebook01Icon, InstagramIcon, Mail01Icon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface SocialLink {
    name: string;
    icon: IconSvgElement;
    href: string;
}

/**
 * The default social links. One source for the footer list, the compact list
 * and the share row; the compact variant takes the first three.
 * (InstagramFreeIcons and InstagramIcon are the same exported glyph.)
 */
export const SOCIALS: SocialLink[] = [
    { name: "Facebook", href: "#", icon: Facebook01Icon },
    { name: "Email", href: "#", icon: Mail01Icon },
    { name: "Twitter", href: "#", icon: NewTwitterIcon },
    { name: "Instagram", href: "#", icon: InstagramIcon },
];

export const SOCIALS_COMPACT: SocialLink[] = SOCIALS.slice(0, 3);
