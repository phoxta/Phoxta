import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send, Users } from "lucide-react";
import type { GroupPost } from "@/data/types";
import { relative } from "@/lib/format";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { PageTitle } from "@/components/shell/AppShell";
import { Avatar, Button, Card, EmptyState, Skeleton, Tag } from "@/components/ui/primitives";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/ui/icons";

/** Study groups: the social layer that keeps self-paced learning from feeling solitary. */
export function GroupsPage() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const mine = catalogue.groups.filter((g) => user.groupIds.includes(g.id));
    const others = catalogue.groups.filter((g) => !user.groupIds.includes(g.id));
    const GroupCard = ({ g }: { g: (typeof catalogue.groups)[number] }) => {
        const joined = user.groupIds.includes(g.id);
        return (
            <Card as="li" className="flex flex-col gap-3 overflow-hidden !p-0">
                {g.imageUrl && (
                    <Link to={`/groups/${g.id}`} className="block" aria-hidden="true" tabIndex={-1}>
                        <img src={g.imageUrl} alt="" width={960} height={600} loading="lazy" className="h-32 w-full object-cover" />
                    </Link>
                )}
                <div className="flex flex-1 flex-col gap-3 p-4 pt-0 first:pt-4">
                <Tag tone={g.categoryId} icon={<CategoryIcon id={g.categoryId} />}>{CATEGORY_LABEL[g.categoryId]}</Tag>
                <h3 className="text-[16px] font-semibold">
                    <Link to={`/groups/${g.id}`}>{g.name}</Link>
                </h3>
                <p className="text-[13px] leading-5 text-muted">{g.blurb}</p>
                <div className="mt-auto flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1.5 text-[12px] text-muted"><Users size={13} /> {(g.members + (joined ? 1 : 0)).toLocaleString()}</span>
                    <Button variant={joined ? "tonal" : "outline"} size="md" className="ml-auto !rounded-full" onClick={() => void mutate((r) => r.joinGroup(g.id)).then(() => toast(joined ? `Left ${g.name}` : `Joined ${g.name}`, joined ? "default" : "success"))}>
                        {joined ? "Joined" : "Join"}
                    </Button>
                </div>
                </div>
            </Card>
        );
    };
    return (
        <>
            <PageTitle title="Groups" sub="Study with people on the same path. Post what you built, ask what you're stuck on." />
            {mine.length > 0 && (
                <section className="mb-8" aria-labelledby="mine-h">
                    <h2 id="mine-h" className="mb-3 text-[18px] font-semibold">Your groups</h2>
                    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mine.map((g) => <GroupCard key={g.id} g={g} />)}</ul>
                </section>
            )}
            <section aria-labelledby="disc-h">
                <h2 id="disc-h" className="mb-3 text-[18px] font-semibold">{mine.length ? "Discover" : "All groups"}</h2>
                {others.length ? <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{others.map((g) => <GroupCard key={g.id} g={g} />)}</ul> : <EmptyState title="You're in every group" body="That's dedication." />}
            </section>
        </>
    );
}

export function GroupDetailPage() {
    const { id } = useParams();
    const { catalogue, user, repo, mutate } = useData();
    // Posts store only a name; the portrait lives on whoever that is (you, a mentor, a friend).
    const photoByName = (name: string) => (name === user.profile.name ? user.profile.photoUrl : (catalogue.mentors.find((m) => m.name === name)?.photoUrl ?? user.friends.find((f) => f.name === name)?.photoUrl));
    const { toast } = useToast();
    const group = catalogue.groups.find((g) => g.id === id);
    const joined = Boolean(id && user.groupIds.includes(id));
    const [posts, setPosts] = useState<GroupPost[] | null>(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let active = true;
        setPosts(null);
        if (id) void repo.loadGroupPosts(id).then((p) => active && setPosts(p)).catch(() => active && setPosts([]));
        return () => {
            active = false;
        };
    }, [id, repo]);

    if (!group) return <EmptyState title="Group not found" action={<Link to="/groups" className="font-semibold text-brand underline">All groups</Link>} />;

    const post = async () => {
        const body = draft.trim();
        if (!body) return;
        setBusy(true);
        try {
            const p = await repo.postToGroup(group.id, body);
            setPosts((prev) => [p, ...(prev ?? [])]);
            setDraft("");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't post", "danger");
        }
        setBusy(false);
    };

    return (
        <>
            <Link to="/groups" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} /> Groups
            </Link>
            {group.imageUrl && <img src={group.imageUrl} alt="" width={960} height={600} className="mb-5 h-44 w-full rounded-xl object-cover max-md:h-32" />}
            <div className="mb-5 flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                    <Tag tone={group.categoryId} icon={<CategoryIcon id={group.categoryId} />}>{CATEGORY_LABEL[group.categoryId]}</Tag>
                    <h1 className="mt-2 text-[24px] font-semibold leading-8">{group.name}</h1>
                    <p className="mt-1 text-[14px] text-muted">{group.blurb}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-caption"><Users size={13} /> {(group.members + (joined ? 1 : 0)).toLocaleString()} members</p>
                </div>
                <Button variant={joined ? "tonal" : "brand"} onClick={() => void mutate((r) => r.joinGroup(group.id)).then(() => toast(joined ? "Left the group" : "Welcome in", joined ? "default" : "success"))}>
                    {joined ? "Leave group" : "Join group"}
                </Button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex flex-col gap-3">
                    {joined ? (
                        <Card as="section" aria-label="New post">
                            <div className="flex gap-3">
                                <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="md" />
                                <div className="flex-1">
                                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Share what you built, or what you're stuck on…" className="w-full resize-y rounded-md border border-line-strong px-3.5 py-2.5 text-[14px] outline-none placeholder:text-caption focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]" />
                                    <div className="mt-2 flex justify-end">
                                        <Button size="md" loading={busy} disabled={!draft.trim()} onClick={() => void post()}>
                                            <Send size={14} /> Post
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <p className="rounded-md bg-brand-soft px-4 py-3 text-[13px] text-brand-ink">Join the group to post. You can read along either way.</p>
                    )}
                    {posts === null ? (
                        <>
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                        </>
                    ) : posts.length === 0 ? (
                        <EmptyState title="No posts yet" body="Be the first to say hello." />
                    ) : (
                        posts.map((p) => (
                            <Card key={p.id} as="article">
                                <div className="flex items-center gap-3">
                                    <Avatar name={p.authorName} hue={p.authorHue} src={p.authorPhotoUrl ?? photoByName(p.authorName)} size="sm" />
                                    <div>
                                        <div className="text-[14px] font-medium">{p.authorName} {p.mine && <span className="ml-1 rounded-xs bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink">YOU</span>}</div>
                                        <div className="text-[12px] text-caption">{relative(p.createdAt)}</div>
                                    </div>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6">{p.body}</p>
                            </Card>
                        ))
                    )}
                </div>
                <Card as="aside" className="self-start">
                    <h2 className="mb-2 text-[15px] font-semibold">Ground rules</h2>
                    <ul className="flex flex-col gap-2 text-[13px] leading-5 text-muted">
                        <li>Be specific. "It doesn't work" helps nobody; a screenshot and the error do.</li>
                        <li>Critique the work, never the person.</li>
                        <li>Say thanks when something unblocks you — it's how people know to keep answering.</li>
                    </ul>
                </Card>
            </div>
        </>
    );
}
