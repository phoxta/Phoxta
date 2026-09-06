import { useEffect } from "react";
import { BRAND } from "@/config/brand";
import { useCatalog } from "@/state/catalog";

/**
 * Per-route title and description.
 *
 * The brand half of the title is the TENANT's name where one resolved — every
 * buyer of this storefront runs it under their own name, and a browser tab that
 * says "Ferne" on someone else's shop is a bug the owner sees on day one.
 */
export default function PageMeta({ title, description }: { title: string; description?: string }) {
    const { businessName } = useCatalog();
    const brand = businessName || BRAND.name;

    useEffect(() => {
        document.title = title ? `${title} — ${brand}` : brand;
    }, [title, brand]);

    useEffect(() => {
        if (!description) return;
        let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (!tag) {
            tag = document.createElement("meta");
            tag.name = "description";
            document.head.appendChild(tag);
        }
        tag.content = description;
    }, [description]);

    return null;
}
