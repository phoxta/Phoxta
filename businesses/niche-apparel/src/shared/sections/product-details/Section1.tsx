import { useParams } from "react-router-dom";
import Section1Server from "./Section1Server";
import { useProduct } from "@/util/catalog";

export default function Section1() {
    const { id } = useParams();
    const product = useProduct(id); // live per-tenant product (by uuid), falls back to first
    if (!product) return null;
    return <Section1Server product={product} />;
}
