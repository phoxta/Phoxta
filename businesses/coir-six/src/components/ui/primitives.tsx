import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import type { CategoryId, Theme } from "@/data/types";
import { cn } from "@/lib/cn";
import { initials, type Hue } from "@/lib/format";

/**
 * The Coir Six component library, straight from the design system: five button
 * variants, one input, category tags, avatars on a deterministic tint, cards
 * with inset panels, a 3px progress bar. Everything is a plain element with
 * the right ARIA, so keyboard and screen-reader behaviour comes for free.
 */

// ---- Buttons ----------------------------------------------------------------

type Variant = "primary" | "brand" | "tonal" | "outline" | "ghost" | "danger";
type Size = "lg" | "md" | "sm" | "xs";

const VARIANT: Record<Variant, string> = {
    primary: "bg-ink text-white hover:bg-[#2a2a35]",
    brand: "bg-brand text-white hover:bg-brand-hover",
    tonal: "bg-subtle text-brand-ink hover:bg-[#e1def5]",
    outline: "bg-card text-ink border border-line-strong hover:border-ink",
    ghost: "bg-transparent text-ink hover:bg-subtle",
    danger: "bg-danger-soft text-danger-ink hover:bg-[#f9dcd2]",
};
const SIZE: Record<Size, string> = {
    lg: "h-11 px-5 text-[14px]",
    md: "h-9 px-4 text-[13px]",
    sm: "h-7 px-3 text-[12px]",
    /** The design's 32px outline row action (Follow). */
    xs: "h-8 px-3 text-[12px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    block?: boolean;
    /** The ink "Join Now" style: label + white circle chevron. */
    tail?: boolean;
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "brand", size = "lg", block, tail, loading, className, children, disabled, ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type={rest.type ?? "button"}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(
                "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:opacity-45 disabled:cursor-not-allowed",
                variant === "tonal" ? "rounded-sm" : "rounded-full",
                tail && "pl-5 pr-2",
                VARIANT[variant],
                SIZE[size],
                block && "w-full",
                className,
            )}
            {...rest}
        >
            {loading && <Spinner />}
            {children}
            {tail && (
                <span className="grid size-[26px] place-items-center rounded-full bg-white text-ink">
                    <ChevronRight size={13} strokeWidth={2.4} aria-hidden="true" />
                </span>
            )}
        </button>
    );
});

export function Spinner({ className }: { className?: string }) {
    return (
        <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 20" />
        </svg>
    );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    size?: "lg" | "md" | "sm";
    tone?: "default" | "brand" | "outline-brand";
    dot?: boolean;
}

/** A circular icon control. `label` is mandatory: an icon alone is not a name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { label, size = "lg", tone = "default", dot, className, children, ...rest },
    ref,
) {
    const dim = size === "lg" ? "size-11" : size === "md" ? "size-8" : "size-7";
    const look =
        tone === "brand"
            ? "bg-brand text-white border-brand hover:bg-brand-hover"
            : tone === "outline-brand"
              ? "bg-card text-brand border-brand hover:bg-brand-soft"
              : "bg-card text-ink border-line-strong hover:border-ink";
    return (
        <button ref={ref} type="button" aria-label={label} title={label} className={cn("grid shrink-0 place-items-center rounded-full border transition-colors", dot && "relative", dim, look, className)} {...rest}>
            {children}
            {dot && <span className="absolute right-[11px] top-[11px] size-[7px] rounded-full border-[1.5px] border-white bg-danger" aria-hidden="true" />}
        </button>
    );
});

// ---- Inputs -----------------------------------------------------------------

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string | null;
    leading?: ReactNode;
    /** Pill on desktop toolbars, 14px radius in forms. */
    shape?: "pill" | "soft";
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, leading, shape = "soft", className, id, ...rest }, ref) {
    const inputId = id ?? (label ? `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined);
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && (
                <label htmlFor={inputId} className="text-[12px] font-medium tracking-[0.06em] text-muted uppercase">
                    {label}
                </label>
            )}
            <div
                className={cn(
                    "flex h-[46px] items-center gap-2.5 border bg-card px-4 text-[14px] transition-shadow focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]",
                    shape === "pill" ? "rounded-full" : "rounded-md",
                    error ? "border-danger" : "border-line-strong",
                )}
            >
                {leading && <span className="shrink-0 text-ink">{leading}</span>}
                <input ref={ref} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={error && inputId ? `${inputId}-err` : undefined} className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-caption" {...rest} />
            </div>
            {error ? (
                <p id={inputId ? `${inputId}-err` : undefined} className="text-[12px] text-danger-ink">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[12px] text-caption">{hint}</p>
            ) : null}
        </div>
    );
});

export function SearchBox({ value, onChange, onSubmit, placeholder = "Search your course…", className, autoFocus }: { value: string; onChange: (v: string) => void; onSubmit?: () => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
    return (
        <form
            role="search"
            className={cn("flex h-[46px] items-center gap-2.5 rounded-full border border-line-strong bg-card px-4 text-[14px] focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)] max-md:h-12 max-md:rounded-md", className)}
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
            }}
        >
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            {/* Opt-in only: the caller focuses the box it just opened for a keyboard shortcut. */}
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input type="search" value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="Search courses" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-caption" />
        </form>
    );
}

// ---- Tags, badges -----------------------------------------------------------

const TAG: Record<CategoryId | "ok" | "warn" | "danger" | "neutral", string> = {
    fe: "bg-fe-soft text-fe-ink",
    ux: "bg-ux-soft text-ux-ink",
    br: "bg-br-soft text-br-ink",
    ok: "bg-mint-soft text-mint",
    warn: "bg-peach-soft text-peach",
    danger: "bg-danger-soft text-danger-ink",
    neutral: "bg-page text-muted",
};

export function Tag({ tone, children, className, icon }: { tone: keyof typeof TAG; children: ReactNode; className?: string; icon?: ReactNode }) {
    return (
        <span className={cn("inline-flex w-max items-center gap-1.5 rounded-xs px-2.5 py-[5px] text-[11px] font-semibold uppercase tracking-[0.02em]", TAG[tone], className)}>
            {icon}
            {children}
        </span>
    );
}

export function Badge({ children, tone = "brand", className }: { children: ReactNode; tone?: "brand" | "danger" | "ink"; className?: string }) {
    return <span className={cn("inline-grid min-w-5 place-items-center rounded-full px-2 py-1 text-[11px] font-semibold leading-none text-white", tone === "brand" ? "bg-brand" : tone === "danger" ? "bg-danger" : "bg-ink", className)}>{children}</span>;
}

// ---- Avatar -----------------------------------------------------------------

const HUE: Record<Hue, string> = {
    lilac: "bg-brand-soft text-brand-ink",
    sky: "bg-fe-soft text-fe-ink",
    peach: "bg-peach-soft text-peach",
    rose: "bg-br-soft text-br-ink",
    mint: "bg-mint-soft text-mint",
    plum: "bg-plum-soft text-plum",
};
const AV_SIZE = { xs: "size-8 text-[11px]", sm: "size-[34px] text-[12px]", md: "size-11 text-[15px]", lg: "size-[50px] text-[16px]", xl: "size-[110px] text-[36px]" } as const;

export function Avatar({ name, hue, src, size = "sm", plus, className }: { name: string; hue: Hue; src?: string; size?: keyof typeof AV_SIZE; plus?: boolean; className?: string }) {
    return (
        <span className={cn("relative grid shrink-0 place-items-center overflow-visible rounded-full font-semibold tracking-[0.02em] select-none", AV_SIZE[size], HUE[hue], className)} aria-hidden="true">
            {src ? <img src={src} alt="" className="size-full rounded-full object-cover" loading="lazy" /> : initials(name)}
            {plus && (
                <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-white bg-ink text-white">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </span>
            )}
        </span>
    );
}

// ---- Surfaces ---------------------------------------------------------------

export function Card({ children, className, as: As = "div", ...rest }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" | "aside" } & HTMLAttributes<HTMLElement>) {
    return (
        <As className={cn("rounded-xl bg-card p-4", className)} {...rest}>
            {children}
        </As>
    );
}

/** An inset panel inside a card: page tint, 16px radius. */
export function Inset({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("rounded-lg bg-page p-4", className)}>{children}</div>;
}

export function SectionHead({ title, action, className, as: As = "h2" }: { title: ReactNode; action?: ReactNode; className?: string; as?: "h1" | "h2" | "h3" }) {
    return (
        <div className={cn("mb-3.5 flex items-center gap-3", className)}>
            <As className={cn("flex-1 font-semibold", As === "h1" ? "text-[22px] leading-7" : "text-[20px] leading-[26px] max-md:text-[18px]")}>{title}</As>
            {action}
        </div>
    );
}

export function SeeAll({ to, children = "See all" }: { to: string; children?: ReactNode }) {
    return (
        <Link to={to} className="text-[13px] font-medium text-brand underline underline-offset-4">
            {children}
        </Link>
    );
}

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div className={cn("h-[3px] w-full overflow-hidden rounded-[2px] bg-line", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
            <span className="block h-full rounded-[2px] bg-brand transition-[width] duration-500" style={{ width: `${v}%` }} />
        </div>
    );
}

export function Overline({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("text-[11px] font-medium uppercase tracking-[0.08em] text-caption", className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-md bg-line", className)} aria-hidden="true" />;
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col items-center gap-2 rounded-xl bg-card px-6 py-12 text-center", className)}>
            {icon && <span className="mb-1 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>}
            <h3 className="text-[18px] font-semibold">{title}</h3>
            {body && <p className="max-w-sm text-[14px] text-muted">{body}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

/** Cover art for a course card: the design's gradient per theme, no photo. */
const COVER: Record<Theme, string> = {
    fe: "from-[#4A8FE0] to-[#2E6DB4]",
    ux: "from-[#8A7BE6] to-[#6C5DD3]",
    br: "from-[#E77FC8] to-[#C24A9A]",
    mint: "from-[#5FB88F] to-[#2B8A61]",
    peach: "from-[#E8A46B] to-[#C0692B]",
};
/** A photo under the theme gradient at low opacity keeps the category colour
 *  readable across every card; the gradient alone when there is no photo. */
export function Cover({ theme, src, className, children }: { theme: Theme; src?: string; className?: string; children?: ReactNode }) {
    return (
        <div className={cn("relative overflow-hidden rounded-md bg-gradient-to-br", COVER[theme], className)} aria-hidden="true">
            {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />}
            {src && <span className={cn("absolute inset-0 bg-gradient-to-br opacity-55 mix-blend-multiply", COVER[theme])} />}
            <Sparkle className="absolute -right-6 -top-8 w-24 opacity-30" />
            {children}
        </div>
    );
}

export function Sparkle({ className, fill = "#fff" }: { className?: string; fill?: string }) {
    return (
        <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 0C52 30 70 48 100 50 70 52 52 70 50 100 48 70 30 52 0 50 30 48 48 30 50 0z" fill={fill} />
        </svg>
    );
}

export function Kbd({ children }: { children: ReactNode }) {
    return <kbd className="rounded-[4px] border border-line-strong px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">{children}</kbd>;
}
