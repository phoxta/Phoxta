import clsx from "clsx";
import Img from "@/components/media/img";
import imgAds from "@/assets/images/ads.webp";

interface SectionAdsProps {
    className?: string;
}

export default function SectionAds({ className }: SectionAdsProps) {
    return (
        <div className={clsx(className)}>
            {/* Static imports carry no intrinsic size, so width/height are omitted — the CSS sizes it. */}
            <Img alt="ads" className="w-full" src={imgAds} />
        </div>
    );
}
