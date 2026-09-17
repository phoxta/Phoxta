import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock, Compass, PartyPopper } from "lucide-react";
import { AREA_LABEL, type AgendaItem, type Area, type AttentionItem, type Capability, type WafeModule } from "@/data/core";
import { cn } from "@/lib/cn";
import { time } from "@/lib/format";
import { MODULES } from "@/modules";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import { AreaTag, MemberAvatar, Section } from "@/components/shared";
import { Illustration, type IllustrationName } from "@/components/ui/Illustration";
import { SplitLines } from "@/components/ui/motion";
import { Ring } from "@/components/ui/charts";
import { EmptyState, ProgressBar } from "@/components/ui/primitives";

/**
 * The area overview: what this part of the product is FOR, the doors into it,
 * and — so it is a page rather than a menu — the dashboard contributions that
 * belong to the area: what's on today, what needs a decision, what we're
 * building. Everything below the hero is filtered from `useData().dashboard`.
 */

const HERO: Record<Area, { line: string; sub: string; child: string }> = {
    home: { line: "For today. For tomorrow. For generations.", sub: "Everything the family is doing, in one place.", child: "Your day, your way." },
    grow: { line: "Nurture our faith, minds and relationships.", sub: "Learning, books, the Bible and the paths each of us is walking.", child: "Learn something new today." },
    execute: { line: "Plan, focus and get the important things done.", sub: "Tasks, goals, projects and the family calendar.", child: "Your jobs and your goals." },
    live: { line: "Manage our home, finances, health and lifestyle.", sub: "Money, trips, the wardrobe and how everyone is feeling.", child: "Your closet, your habits, our trips." },
    create: { line: "Imagine, express and enjoy the beauty of life.", sub: "The studio, moodboards and the memories we keep.", child: "Make something today." },
    family: { line: "Built for us. Built for our family.", sub: "Who we are, what we value, and who sees what.", child: "Our family." },
};

const SOFT: Record<Area, string> = {
    home: "bg-home-soft",
    grow: "bg-grow-soft",
    execute: "bg-execute-soft",
    live: "bg-live-soft",
    create: "bg-create-soft",
    family: "bg-family-soft",
};

const INK: Record<Area, string> = {
    home: "text-home-ink",
    grow: "text-grow-ink",
    execute: "text-execute-ink",
    live: "text-live-ink",
    create: "text-create-ink",
    family: "text-family-ink",
};

const ICON_BG: Record<Area, string> = {
    home: "bg-home text-white",
    grow: "bg-grow text-white",
    execute: "bg-execute text-white",
    live: "bg-live text-white",
    create: "bg-create text-white",
    family: "bg-family text-white",
};

const ATTENTION: Record<AttentionItem["tone"], string> = {
    danger: "border-danger/30 bg-danger-soft text-danger-ink",
    warn: "border-peach/30 bg-peach-soft text-peach",
    info: "border-brand/20 bg-brand-soft text-brand-ink",
    celebrate: "border-live/30 bg-live-soft text-live-ink",
};

function ModuleCard({ m, area }: { m: WafeModule; area: Area }) {
    const Icon = m.icon;
    return (
        <li>
            <Link to={m.path} className="group flex h-full items-start gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", ICON_BG[area])}>
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-lg font-semibold">
                        {m.name}
                        <ArrowRight size={15} className="text-caption transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{m.blurb}</span>
                </span>
            </Link>
        </li>
    );
}

function AgendaRow({ item }: { item: AgendaItem }) {
    return (
        <li>
            <Link to={item.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-page">
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", item.done ? "border-brand bg-brand text-white" : "border-line-strong text-transparent")} aria-hidden="true">
                    <Check size={13} strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-md font-medium", item.done && "text-muted line-through")}>{item.title}</span>
                    <span className="block text-xs text-caption">{item.meta}</span>
                </span>
                {item.at && (
                    <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
                        <Clock size={12} aria-hidden="true" /> {time(item.at)}
                    </span>
                )}
                <MemberAvatar memberId={item.memberId} size="xs" />
            </Link>
        </li>
    );
}

const AREA_ART: Record<Area, IllustrationName> = {
    home: "gather",
    family: "gather",
    grow: "learn",
    execute: "plan",
    live: "home",
    create: "create",
};

export default function AreaPage({ area }: { area: Area }) {
    const { can, role } = useSpace();
    const { dashboard, loading } = useData();
    const child = role === "child";
    const hero = HERO[area];

    const mods = (MODULES as WafeModule[]).filter((m) => m.area === area && m.visibleTo.some((c: Capability) => can(c)));
    const agenda = dashboard.agenda.filter((i) => i.area === area);
    const attention = dashboard.attention.filter((i) => i.area === area);
    const rings = dashboard.rings.filter((i) => i.area === area);
    const childCards = child ? dashboard.childCards.filter((i) => i.area === area) : [];
    const doneCount = agenda.filter((a) => a.done).length;

    return (
        <div>
            <header className={cn("paper mb-8 grid items-center gap-6 overflow-hidden rounded-xl px-6 py-7 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] md:px-9 md:py-10", SOFT[area])} data-shown="true">
                <div className="min-w-0">
                    <AreaTag area={area} />
                    <SplitLines
                        as="h1"
                        className={cn("mt-3 max-w-2xl font-display leading-[1.1]", child ? "text-[32px] md:text-[42px]" : "text-7xl md:text-[40px]", INK[area])}
                        text={child ? hero.child : hero.line}
                    />
                    {!child && <p className="mt-2.5 max-w-xl text-base leading-6 text-muted">{hero.sub}</p>}
                </div>
                <div className="justify-self-end max-md:hidden" aria-hidden="true">
                    <Illustration name={AREA_ART[area]} className="w-full max-w-[300px]" />
                </div>
            </header>

            <Section title={child ? "Your places" : `In ${AREA_LABEL[area]}`}>
                {mods.length ? (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {mods.map((m) => (
                            <ModuleCard key={m.id} m={m} area={area} />
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        icon={<Compass size={20} aria-hidden="true" />}
                        title={MODULES.length ? "Nothing you can open here yet" : "This area is on its way"}
                        body={MODULES.length ? "A parent can widen what you see from Family → People." : `${AREA_LABEL[area]} will fill up as its modules arrive.`}
                    />
                )}
            </Section>

            {!loading && attention.length > 0 && (
                <Section title={child ? "Heads up" : "Needs attention"}>
                    <ul className="grid gap-3 md:grid-cols-2">
                        {attention.map((a) => (
                            <li key={`${a.moduleId}:${a.id}`}>
                                <Link to={a.href} className={cn("flex h-full items-start gap-3 rounded-lg border px-4 py-3.5 transition-shadow hover:shadow-hover", ATTENTION[a.tone])}>
                                    {a.tone === "celebrate" && <PartyPopper size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
                                    <span className="min-w-0">
                                        <span className="block text-md font-semibold">{a.title}</span>
                                        <span className="mt-0.5 block text-sm leading-5 opacity-90">{a.body}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {!loading && agenda.length > 0 && (
                <Section title="Today" action={<span className="text-xs text-caption">{doneCount ? `${doneCount} of ${agenda.length} done` : `${agenda.length} to do`}</span>}>
                    <ul className="rounded-xl bg-card p-1.5">
                        {agenda.map((i) => (
                            <AgendaRow key={`${i.moduleId}:${i.id}`} item={i} />
                        ))}
                    </ul>
                </Section>
            )}

            {!loading && childCards.length > 0 && (
                <Section title="For you">
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {childCards.map((c) => (
                            <li key={`${c.moduleId}:${c.id}`}>
                                <Link to={c.href} className={cn("flex h-full items-start gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover", c.done && "opacity-70")}>
                                    <span className="text-6xl leading-none" aria-hidden="true">
                                        {c.emoji}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-lg font-semibold">{c.title}</span>
                                        <span className="mt-0.5 block text-md leading-5 text-muted">{c.body}</span>
                                        {typeof c.pct === "number" && <ProgressBar value={c.pct} className="mt-3" label={`${c.title} progress`} />}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {!loading && rings.length > 0 && (
                <Section title="What we're building">
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {rings.map((r) => (
                            <li key={`${r.moduleId}:${r.id}`}>
                                <Link to={r.href} className="flex h-full items-center gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                    <Ring pct={r.pct} size={64} stroke={3} label={`${r.label}: ${r.pct}%`}>
                                        <span className="text-sm font-semibold tabular-nums">{r.pct}%</span>
                                    </Ring>
                                    <span className="min-w-0">
                                        <span className="block truncate text-md font-semibold">{r.label}</span>
                                        <span className="block text-xs text-muted">{r.sub}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
}
