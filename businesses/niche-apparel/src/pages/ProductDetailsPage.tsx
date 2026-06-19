import Section1 from "@/shared/sections/product-details/Section1";
import Section2 from "@/shared/sections/product/Section3";
import Section3 from "@/shared/sections/product-details/Section2";
import Section4 from "@/shared/sections/product-details/Section3";
import ProductReviews from "@/shared/sections/product-details/ProductReviews";

// Exact replica of the platform's ProductDetailsPage composition.
export default function ProductDetailsPage() {
    return (
        <>
            <Section1 />
            <Section2 classList="bg-neutral-0" />
            <Section3 />
            <ProductReviews />
            <Section4 />
        </>
    );
}
