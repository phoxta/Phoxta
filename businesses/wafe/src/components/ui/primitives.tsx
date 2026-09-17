import {
    forwardRef,
    type ButtonHTMLAttributes,
    type HTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { Theme } from "@/data/core";
import { cn } from "@/lib/cn";
import { initials, type Hue } from "@/lib/format";
import { Illustration, type IllustrationName } from "@/components/ui/Illustration";

/**
 * The Wàfè component library.
 *
 * Anatomy and finish come from Coir Six, the sister product: controls are
 * pills, surfaces are white on a tinted ground with a radius that grows with
 * the size of the thing, tags are small uppercase chips on a soft tint, and
 * progress is a 3px hairline rather than a bar competing with the content.
 *
 * The colour ramps are Untitled UI's, so every tint ships with an ink dark
 * enough to sit on it, and every state has one. Motion is Carbon's: the
 * durations and easings are tokens, never hand-picked numbers.
 *
 * Everything is a plain element with the right ARIA, so keyboard and
 * screen-reader behaviour comes for free.
 */

// ---- Buttons ----------------------------------------------------------------

type Variant = "primary" | "brand" | "tonal" | "outline" | "ghost" | "danger";
type Size = "lg" | "md" | "sm" | "xs";

const VARIANT: Record<Variant, string> = {
    /** Neutral solid — the second-loudest thing on a screen. */
    primary: "bg-ink text-white hover:bg-[#33352e]",
    /** Primary. */
    brand: "bg-brand text-white hover:bg-brand-hover",
    /** Secondary brand — a tinted fill, no border. */
    tonal: "bg-brand-soft text-brand-ink hover:bg-[#e3e8df]",
    /** Secondary neutral — the workhorse. */
    outline: "bg-card text-ink border border-line-strong hover:border-ink",
    /** Tertiary — no chrome until you touch it. */
    ghost: "bg-transparent text-muted hover:bg-subtle hover:text-ink",
    /** Destructive. */
    danger: "bg-danger-soft text-danger-ink hover:bg-[#fbe3e0]",
};
const SIZE: Record<Size, string> = {
    lg: "h-11 px-5 text-md",
    md: "h-9 px-4 text-sm",
    sm: "h-7 px-3 text-xs",
    /** The 32px row action (Follow, Add). */
    xs: "h-8 px-3 text-xs",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    block?: boolean;
    /** Label + a white circle chevron, for the one call to action on a screen. */
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
                "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
                // A tinted button is a panel, not a pill: the one exception to
                // the round rule, so a secondary action never mimics a primary.
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
            ? "border-brand bg-brand text-white hover:bg-brand-hover"
            : tone === "outline-brand"
              ? "border-brand bg-card text-brand hover:bg-brand-soft"
              : "border-line-strong bg-card text-ink hover:border-ink";
    return (
        <button
            ref={ref}
            type="button"
            aria-label={label}
            title={label}
            className={cn("grid shrink-0 place-items-center rounded-full border transition-colors", dot && "relative", dim, look, className)}
            {...rest}
        >
            {children}
            {dot && <span className="absolute right-[11px] top-[11px] size-[7px] rounded-full border-[1.5px] border-card bg-danger" aria-hidden="true" />}
        </button>
    );
});

// ---- Inputs -----------------------------------------------------------------

/**
 * The focus treatment, written once. Nine separate files had grown their own
 * copy of this recipe; a control that does not use it will not match its
 * neighbours the next time the ring changes.
 */
const FOCUS = "focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]";
const FOCUS_ERROR = "border-danger focus-within:shadow-[0_0_0_3px_var(--color-danger-soft)]";

/** The shared chrome of a labelled control: label above, message below. */
function FieldFrame({
    label,
    hint,
    error,
    inputId,
    className,
    children,
}: {
    label?: string;
    hint?: string;
    error?: string | null;
    inputId?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && (
                <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                    {label}
                </label>
            )}
            {children}
            {error ? (
                <p id={inputId ? `${inputId}-err` : undefined} className="text-xs text-danger-ink">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-caption">{hint}</p>
            ) : null}
        </div>
    );
}

/** Turns a label into a stable id, so the label actually points at the control. */
const idFrom = (label?: string, id?: string) => id ?? (label ? `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined);

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string | null;
    leading?: ReactNode;
    /** Pill on toolbars, 14px radius in forms. */
    shape?: "pill" | "soft";
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, leading, shape = "soft", className, id, ...rest }, ref) {
    const inputId = idFrom(label, id);
    return (
        <FieldFrame label={label} hint={hint} error={error} inputId={inputId} className={className}>
            <div
                className={cn(
                    "flex h-[46px] items-center gap-2.5 border bg-card px-4 text-md transition-shadow",
                    shape === "pill" ? "rounded-full" : "rounded-md",
                    error ? FOCUS_ERROR : cn("border-line-strong", FOCUS),
                )}
            >
                {leading && <span className="shrink-0 text-ink">{leading}</span>}
                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error && inputId ? `${inputId}-err` : undefined}
                    className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-caption"
                    {...rest}
                />
            </div>
        </FieldFrame>
    );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    hint?: string;
    error?: string | null;
    children: ReactNode;
}

/**
 * A select on the same chrome as a field.
 *
 * There was no primitive for this, so a hundred and twenty-odd selects across
 * the app had each grown their own copy of the same six utilities — which is
 * why they drifted. The native control is kept and simply dressed: it keeps
 * the platform's keyboard behaviour and its mobile picker.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, className, id, children, ...rest }, ref) {
    const inputId = idFrom(label, id);
    return (
        <FieldFrame label={label} hint={hint} error={error} inputId={inputId} className={className}>
            <div className={cn("relative flex h-[46px] items-center border bg-card text-md transition-shadow rounded-md", error ? FOCUS_ERROR : cn("border-line-strong", FOCUS))}>
                <select
                    ref={ref}
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error && inputId ? `${inputId}-err` : undefined}
                    className="min-w-0 flex-1 appearance-none truncate bg-transparent py-0 pl-4 pr-10 text-ink outline-none"
                    {...rest}
                >
                    {children}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3.5 text-muted" aria-hidden="true" />
            </div>
        </FieldFrame>
    );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    hint?: string;
    error?: string | null;
}

/** A multi-line field, on the same chrome. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, className, id, rows = 4, ...rest }, ref) {
    const inputId = idFrom(label, id);
    return (
        <FieldFrame label={label} hint={hint} error={error} inputId={inputId} className={className}>
            <div className={cn("flex border bg-card px-4 py-3 text-md transition-shadow rounded-md", error ? FOCUS_ERROR : cn("border-line-strong", FOCUS))}>
                <textarea
                    ref={ref}
                    id={inputId}
                    rows={rows}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error && inputId ? `${inputId}-err` : undefined}
                    className="min-w-0 flex-1 resize-y bg-transparent text-ink outline-none placeholder:text-caption"
                    {...rest}
                />
            </div>
        </FieldFrame>
    );
});

export function SearchBox({
    value,
    onChange,
    onSubmit,
    placeholder = "Search the family…",
    className,
    autoFocus,
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}) {
    return (
        <form
            role="search"
            className={cn(
                "flex h-[46px] items-center gap-2.5 rounded-full border border-line-strong bg-card px-4 text-md focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)] max-md:h-12 max-md:rounded-md",
                className,
            )}
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
            }}
        >
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            {/* Opt-in only: the caller focuses the box it just opened for a keyboard shortcut. */}
            <input
                type="search"
                value={value}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={autoFocus}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label="Search"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-caption"
            />
        </form>
    );
}

// ---- Tags, badges -----------------------------------------------------------

/** A soft tint, its own ink, and an optional leading dot for the five areas. */
const TAG = {
    brand: { fill: "bg-brand-soft text-brand-ink", dot: "bg-brand" },
    home: { fill: "bg-home-soft text-home-ink", dot: "bg-home" },
    family: { fill: "bg-family-soft text-family-ink", dot: "bg-family" },
    grow: { fill: "bg-grow-soft text-grow-ink", dot: "bg-grow" },
    execute: { fill: "bg-execute-soft text-execute-ink", dot: "bg-execute" },
    live: { fill: "bg-live-soft text-live-ink", dot: "bg-live" },
    create: { fill: "bg-create-soft text-create-ink", dot: "bg-create" },
    ok: { fill: "bg-mint-soft text-mint", dot: "bg-mint" },
    warn: { fill: "bg-peach-soft text-peach", dot: "bg-peach" },
    danger: { fill: "bg-danger-soft text-danger-ink", dot: "bg-danger" },
    neutral: { fill: "bg-subtle text-muted", dot: "bg-caption" },
} as const;

export function Tag({ tone, children, className, icon, dot }: { tone: keyof typeof TAG; children: ReactNode; className?: string; icon?: ReactNode; dot?: boolean }) {
    const t = TAG[tone];
    return (
        <span className={cn("inline-flex w-max items-center gap-1.5 rounded-xs px-2.5 py-[5px] text-2xs font-semibold uppercase tracking-[0.02em]", t.fill, className)}>
            {dot && <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden="true" />}
            {icon}
            {children}
        </span>
    );
}

export function Badge({ children, tone = "brand", className }: { children: ReactNode; tone?: "brand" | "danger" | "ink"; className?: string }) {
    return (
        <span
            className={cn(
                "inline-grid min-w-5 place-items-center rounded-full px-2 py-1 text-2xs font-semibold leading-none text-white",
                tone === "brand" ? "bg-brand" : tone === "danger" ? "bg-danger" : "bg-ink",
                className,
            )}
        >
            {children}
        </span>
    );
}

// ---- Avatar -----------------------------------------------------------------

const HUE: Record<Hue, string> = {
    lilac: "bg-lilac-soft text-lilac",
    sky: "bg-sky-soft text-sky",
    peach: "bg-peach-soft text-peach",
    rose: "bg-rose-soft text-rose",
    mint: "bg-mint-soft text-mint",
    plum: "bg-plum-soft text-plum",
};
const AV_SIZE = { xs: "size-8 text-2xs", sm: "size-[34px] text-xs", md: "size-11 text-base", lg: "size-[50px] text-lg", xl: "size-[110px] text-[36px]" } as const;

export function Avatar({ name, hue, src, size = "sm", plus, className }: { name: string; hue: Hue; src?: string; size?: keyof typeof AV_SIZE; plus?: boolean; className?: string }) {
    return (
        <span className={cn("relative grid shrink-0 place-items-center overflow-visible rounded-full font-semibold tracking-[0.02em] select-none", AV_SIZE[size], HUE[hue], className)} aria-hidden="true">
            {src ? <img src={src} alt="" className="size-full rounded-full object-cover" loading="lazy" /> : initials(name)}
            {/* A hairline keeps a photograph from bleeding into a white card. */}
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-ink/8" aria-hidden="true" />
            {plus && (
                <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-card bg-ink text-white">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </span>
            )}
        </span>
    );
}

// ---- Surfaces ---------------------------------------------------------------

/**
 * White on the tinted ground. The hairline and the lift are added by the
 * `bg-card` rule in `index.css`, so a card written here and a card written by
 * hand on a page look the same.
 */
export function Card({ children, className, as: As = "div", ...rest }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" | "aside" } & HTMLAttributes<HTMLElement>) {
    return (
        <As className={cn("rounded-xl bg-card p-4", className)} {...rest}>
            {children}
        </As>
    );
}

/** An inset panel inside a card: the page tint, no border, 16px radius. */
export function Inset({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("rounded-lg bg-page p-4", className)}>{children}</div>;
}

export function SectionHead({ title, action, className, as: As = "h2" }: { title: ReactNode; action?: ReactNode; className?: string; as?: "h1" | "h2" | "h3" }) {
    return (
        <div className={cn("mb-3.5 flex items-center gap-3", className)}>
            <As className={cn("flex-1 font-display font-semibold", As === "h1" ? "text-3xl leading-7" : "text-2xl leading-[26px] max-md:text-xl")}>{title}</As>
            {action}
        </div>
    );
}

export function SeeAll({ to, children = "See all" }: { to: string; children?: ReactNode }) {
    return (
        <Link to={to} className="text-sm font-medium text-brand underline underline-offset-4">
            {children}
        </Link>
    );
}

/**
 * A 3px hairline. `wf-grow` makes it draw itself when the card it sits in is
 * revealed, so progress reads as progress rather than as a static fill.
 */
export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div className={cn("h-[3px] w-full overflow-hidden rounded-[2px] bg-line", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
            <span className="wf-grow block h-full rounded-[2px] bg-brand transition-[width] duration-500" style={{ width: `${v}%` }} />
        </div>
    );
}

export function Overline({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("text-2xs font-medium uppercase tracking-[0.08em] text-caption", className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-md bg-subtle", className)} aria-hidden="true" />;
}

export function EmptyState({
    icon,
    art,
    title,
    body,
    action,
    className,
}: {
    icon?: ReactNode;
    /** A drawing instead of an icon disc. An empty screen is the one place with
     *  room for one, and the one place a person most needs the encouragement. */
    art?: IllustrationName;
    title: string;
    body?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col items-center gap-2 rounded-xl bg-card px-6 py-12 text-center", className)}>
            {art ? (
                <span className="mb-1 w-full max-w-[260px]" data-shown="true">
                    <Illustration name={art} />
                </span>
            ) : (
                icon && <span className="mb-1 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>
            )}
            <h3 className="text-xl font-semibold">{title}</h3>
            {body && <p className="max-w-sm text-md text-muted">{body}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

/** Cover art for a card: the area gradient, with a photo under it if there is one. */
const COVER: Record<Theme, string> = {
    home: "from-[#5A6B53] to-[#3E4A3A]",
    family: "from-[#5A6B53] to-[#3E4A3A]",
    grow: "from-[#17B26A] to-[#067647]",
    execute: "from-[#F38744] to-[#B93815]",
    live: "from-[#FAC515] to-[#A15C07]",
    create: "from-[#B692F6] to-[#6941C6]",
    terra: "from-[#F38744] to-[#B93815]",
    ochre: "from-[#FAC515] to-[#A15C07]",
    plum: "from-[#B692F6] to-[#6941C6]",
    sage: "from-[#717BBC] to-[#3E4784]",
    mint: "from-[#32D583] to-[#079455]",
};

export function Cover({ theme, src, className, children }: { theme: Theme; src?: string; className?: string; children?: ReactNode }) {
    return (
        <div className={cn("wf-zoom relative overflow-hidden rounded-md bg-gradient-to-br", COVER[theme], className)} aria-hidden="true">
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
    return <kbd className="rounded-[4px] border border-line-strong px-1.5 py-0.5 font-sans text-2xs font-semibold text-muted">{children}</kbd>;
}
