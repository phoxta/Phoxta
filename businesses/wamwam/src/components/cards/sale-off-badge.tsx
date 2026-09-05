export interface SaleOffBadgeProps {
    className?: string;
    desc?: string;
}

export default function SaleOffBadge({ className = "", desc = "-10% today" }: SaleOffBadgeProps) {
    return (
        <div
            className={`nc-SaleOffBadge flex items-center justify-center rounded-full bg-red-700 px-3 py-0.5 text-xs text-red-50 ${className}`}
        >
            {desc}
        </div>
    );
}
