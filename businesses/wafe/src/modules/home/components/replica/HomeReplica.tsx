import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { AgeBand, Theme } from "@/data/core";
import { cn } from "@/lib/cn";
import { MemberAvatar } from "@/components/shared";
import { Reveal, SplitLines } from "@/components/ui/motion";
import { Menu } from "@/components/ui/overlay";
import { Cover, Tag } from "@/components/ui/primitives";
import { NextAction } from "../bits";

/**
 * Home's layout: a greeting, two stacked cards and a chat sheet.
 *
 * This is the reference design, measured (see styles/home.css), with none of
 * the words in it. Each of the four Homes decides what goes in the slots from
 * its own slice and its own rules — a parent's "Up next" is the diary, a
 * child's is the top of her list, a guest's is the one date she was named on
 * — and this file only lays them out. It knows nothing about roles beyond
 * the age band, which it writes onto the root so child mode's larger type
 * and 44px targets apply (index.css keys them off `data-band`).
 *
 * The surfaces are the app's own classes — `paper rounded-xl` for a tinted
 * panel, `bg-card rounded-lg` for a white one, `wf-lift` for a control that
 * rewards the pointer — so the cards carry the same hairline, shadow and
 * motion as every other card in the product. The stylesheet only sizes them.
 *
 * The one piece of behaviour here is the scale: the design is 1327 wide at
 * 1×, so `--s` is what fits, and every length in the stylesheet is in `--u`
 * (= `--s` px). Narrow screens stack the columns instead.
 */

/** The reference's width at 1×, without its icon rail. */
const DESIGN_WIDTH = 1327;

/**
 * One design pixel for a container `w` wide: 1 at full width, never below 0.8.
 * Only the left column is fixed-width; the chat sheet is the flexible one, so
 * a floor here costs the sheet a little room rather than overflowing the page.
 */
function scaleFor(w: number, wide: boolean): number {
    const raw = wide ? w / DESIGN_WIDTH : w / 440;
    const clamped = Math.min(1, Math.max(0.8, raw));
    return Math.round(clamped * 1000) / 1000;
}

function useScale(ref: RefObject<HTMLDivElement | null>): number {
    const [s, setS] = useState(1);
    // Measured before the first paint, so a narrow screen never flashes at 1×;
    // then kept current by the container's own size and by the breakpoint —
    // the observer alone would miss a media-query flip that leaves the width
    // unchanged.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const mq = window.matchMedia("(min-width: 1024px)");
        const calc = () => {
            const w = el.clientWidth;
            if (w) setS(scaleFor(w, mq.matches));
        };
        calc();
        const ro = new ResizeObserver(calc);
        ro.observe(el);
        mq.addEventListener("change", calc);
        return () => {
            ro.disconnect();
            mq.removeEventListener("change", calc);
        };
    }, [ref]);
    return s;
}

// ---- the small shared pieces ----------------------------------------------

export interface ReplicaButton {
    label: string;
    icon: ReactNode;
    href?: string;
    onClick?: () => void;
    /** Several verbs behind one round button. */
    menu?: Array<{ label: string; onSelect: () => void }>;
}

const ICON_BTN = "hr-iconbtn bg-card rounded-full wf-lift";

function IconBtn({ b, className }: { b: ReplicaButton; className?: string }) {
    if (b.menu) {
        return (
            <Menu
                align="end"
                items={b.menu}
                trigger={(p) => (
                    <button type="button" {...p} aria-label={b.label} title={b.label} className={cn(ICON_BTN, className)}>
                        {b.icon}
                    </button>
                )}
            />
        );
    }
    if (b.href) {
        return (
            <Link to={b.href} aria-label={b.label} title={b.label} className={cn(ICON_BTN, className)}>
                {b.icon}
            </Link>
        );
    }
    return (
        <button type="button" onClick={b.onClick} aria-label={b.label} title={b.label} className={cn(ICON_BTN, className)}>
            {b.icon}
        </button>
    );
}

/** Always a heading; a link inside it when the card has a page of its own. */
function Heading({ text, href }: { text: string; href?: string }) {
    return (
        <h2 className="hr-card__title">
            {href ? (
                <Link to={href} className="hr-card__title-link">
                    {text}
                </Link>
            ) : (
                text
            )}
        </h2>
    );
}

/** The "•" between the parts of a meta line. */
export function Dot() {
    return <span className="hr-dot" aria-hidden="true" />;
}

// ---- Up next ---------------------------------------------------------------

export interface ReplicaStat {
    value: ReactNode;
    label: string;
    /** Where the rest of that number lives — a capped count must lead somewhere. */
    href?: string;
}

export type TagTone = ComponentProps<typeof Tag>["tone"];

/**
 * What the card shows beside the words: an event's photograph through the
 * app's `Cover` (under its area colour, as every photo on a card is), or the
 * person the card is about, as their avatar.
 */
export type UpNextArt = { kind: "cover"; src?: string; theme: Theme } | { kind: "member"; memberId: string };

export interface UpNextProps {
    heading: string;
    headingHref?: string;
    button: ReplicaButton;
    /** What kind of thing, and when — the app's tags. */
    tags: Array<{ tone: TagTone; label: ReactNode; dot?: boolean }>;
    name: string;
    sub?: string;
    cta: { label: string; href?: string; onClick?: () => void };
    art?: UpNextArt;
    /** Three numbers under the words — or `null` for a Home with no counts. */
    stats: ReplicaStat[] | null;
    /** What a Home with no numbers puts there instead. */
    extra?: ReactNode;
    /** How many are behind this one. */
    deck: number;
    onNext?: () => void;
}

const CTA = "hr-up__cta rounded-full bg-brand text-white hover:bg-brand-hover";
const NEXT = "hr-up__cta rounded-full bg-transparent text-muted hover:bg-subtle hover:text-ink";

export function UpNextCard(p: UpNextProps) {
    return (
        <section className="hr-card hr-up paper rounded-xl" aria-label={p.heading}>
            <div className="hr-card__head">
                <Heading text={p.heading} href={p.headingHref} />
                <IconBtn b={p.button} />
            </div>
            <div className="hr-up__body">
                <div className="hr-up__text">
                    {p.tags.length > 0 && (
                        <div className="hr-up__tags">
                            {p.tags.map((t, i) => (
                                <Tag key={i} tone={t.tone} dot={t.dot}>
                                    {t.label}
                                </Tag>
                            ))}
                        </div>
                    )}
                    <h3 className="hr-up__name font-display">{p.name}</h3>
                    {p.sub && <p className="hr-up__sub">{p.sub}</p>}
                    <div className="hr-up__actions">
                        {p.cta.href ? (
                            <Link to={p.cta.href} className={CTA}>
                                {p.cta.label}
                            </Link>
                        ) : (
                            <button type="button" onClick={p.cta.onClick} className={CTA}>
                                {p.cta.label}
                            </button>
                        )}
                        {p.deck > 1 && p.onNext && (
                            <button type="button" onClick={p.onNext} className={NEXT} aria-label={`Next of ${p.deck}`}>
                                Next <ChevronRight strokeWidth={2.2} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
                {p.art &&
                    (p.art.kind === "cover" ? (
                        <Cover theme={p.art.theme} src={p.art.src} className="hr-up__art" />
                    ) : (
                        <div className="hr-up__art--member" aria-hidden="true">
                            <MemberAvatar memberId={p.art.memberId} size="xl" />
                        </div>
                    ))}
            </div>
            {p.stats ? (
                <div className="hr-up__stats">
                    {p.stats.map((s) =>
                        s.href ? (
                            <Link key={s.label} to={s.href} className="hr-stat hr-stat--link bg-card rounded-lg wf-lift">
                                <span className="hr-stat__v">{s.value}</span>
                                <span className="hr-stat__l">{s.label}</span>
                            </Link>
                        ) : (
                            <div key={s.label} className="hr-stat bg-card rounded-lg">
                                <span className="hr-stat__v">{s.value}</span>
                                <span className="hr-stat__l">{s.label}</span>
                            </div>
                        ),
                    )}
                </div>
            ) : p.extra ? (
                <div className="hr-up__extra bg-card rounded-lg">{p.extra}</div>
            ) : null}
        </section>
    );
}

// ---- The list --------------------------------------------------------------

export interface ListRow {
    id: string;
    icon: ReactNode;
    title: string;
    /** The small second line. Omitted on a Home that shows no counts. */
    meta?: ReactNode;
    href?: string;
    onClick?: () => void;
    /** A small control at the row's corner (Done, I'm praying). */
    action?: ReactNode;
}

export interface ListProps {
    heading: string;
    headingHref?: string;
    button: ReplicaButton;
    rows: ListRow[];
    /** The empty state: one honest line, and a single next action when there
     *  is a door this member holds a key to. Never a blank card. */
    empty?: { line: string; to?: string; cta?: string };
    foot?: { label: string; href?: string; onClick?: () => void };
}

function RowMain({ r, children }: { r: ListRow; children: ReactNode }) {
    if (r.href)
        return (
            <Link to={r.href} className="hr-row__main">
                {children}
            </Link>
        );
    if (r.onClick)
        return (
            <button type="button" onClick={r.onClick} className="hr-row__main">
                {children}
            </button>
        );
    return <div className="hr-row__main">{children}</div>;
}

export function ListCard(p: ListProps) {
    return (
        <section className="hr-card hr-list paper rounded-xl" aria-label={p.heading}>
            <div className="hr-card__head">
                <Heading text={p.heading} href={p.headingHref} />
                <IconBtn b={p.button} />
            </div>
            {p.rows.length > 0 ? (
                <ul className="hr-list__rows">
                    {p.rows.map((r) => (
                        <li key={r.id} className="hr-row bg-card rounded-lg">
                            <RowMain r={r}>
                                <span className="hr-row__icon" aria-hidden="true">
                                    {r.icon}
                                </span>
                                <span className="hr-row__body">
                                    <span className="hr-row__title">{r.title}</span>
                                    {r.meta !== undefined && <span className="hr-row__meta">{r.meta}</span>}
                                </span>
                            </RowMain>
                            {r.action}
                        </li>
                    ))}
                </ul>
            ) : (
                p.empty && (
                    <div className="hr-list__empty">
                        <NextAction line={p.empty.line} to={p.empty.to} cta={p.empty.cta} />
                    </div>
                )
            )}
            {p.foot && (
                <div className="hr-list__foot">
                    {p.foot.href ? (
                        <Link to={p.foot.href} className="hr-showall rounded-lg bg-card/50 hover:bg-card/80">
                            {p.foot.label}
                        </Link>
                    ) : (
                        <button type="button" onClick={p.foot.onClick} className="hr-showall rounded-lg bg-card/50 hover:bg-card/80">
                            {p.foot.label}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}

// ---- The page --------------------------------------------------------------

export function HomeReplica({
    greeting,
    greetingExtra,
    notice,
    upNext,
    list,
    sheet,
    band,
}: {
    greeting: string;
    greetingExtra?: ReactNode;
    notice?: ReactNode;
    upNext: UpNextProps;
    list: ListProps;
    sheet: ReactNode;
    /** The member's age band: child bands get larger type and 44px targets. */
    band?: AgeBand;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const s = useScale(ref);
    return (
        <div ref={ref} className="hr" data-band={band} style={{ "--s": s } as CSSProperties}>
            <div className="hr__left">
                <div className="hr__greeting">
                    <SplitLines as="h1" className="hr__greeting-text" text={greeting} />
                    {greetingExtra}
                </div>
                <div className="hr__notice">{notice}</div>
                {/* The app's entrance: each card settles in as the page is reached. */}
                <div className="hr__cards">
                    <Reveal>
                        <UpNextCard {...upNext} />
                    </Reveal>
                    <Reveal delay={70}>
                        <ListCard {...list} />
                    </Reveal>
                </div>
            </div>
            {sheet}
        </div>
    );
}
