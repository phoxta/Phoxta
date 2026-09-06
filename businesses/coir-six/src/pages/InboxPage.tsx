import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Inbox, Send } from "lucide-react";
import type { Message, PeerKind } from "@/data/types";
import { cn } from "@/lib/cn";
import { relative, time } from "@/lib/format";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { PageTitle } from "@/components/shell/AppShell";
import { Avatar, Button, EmptyState } from "@/components/ui/primitives";
import type { Catalogue, Conversation, UserState } from "@/data/types";

/** A conversation stores only the peer's id; the portrait lives on the mentor or friend record. */
function peerPhoto(cat: Catalogue, user: UserState, c: Conversation): string | undefined {
    return c.peerKind === "mentor" ? cat.mentors.find((m) => m.id === c.peerId)?.photoUrl : user.friends.find((f) => f.id === c.peerId)?.photoUrl;
}

/**
 * Messages with mentors and friends. Two panes on desktop, one at a time on a
 * phone. The list is the learner's conversations; the thread loads on open
 * and marks itself read.
 */
export default function InboxPage() {
    const { id } = useParams();
    return (
        <div className="grid gap-6 md:h-[calc(100dvh-140px)] md:grid-cols-[320px_minmax(0,1fr)]">
            <div className={cn("min-w-0", id && "max-md:hidden")}>
                <ConversationList activeId={id} />
            </div>
            <div className={cn("min-w-0", !id && "max-md:hidden")}>{id ? <Thread id={id} /> : <EmptyState icon={<Inbox size={22} />} title="Pick a conversation" body="Or message a mentor from their profile." className="h-full justify-center max-md:hidden" />}</div>
        </div>
    );
}

function ConversationList({ activeId }: { activeId?: string }) {
    const { user, catalogue } = useData();
    return (
        <>
            <PageTitle title="Inbox" sub={`${user.conversations.length} conversation${user.conversations.length === 1 ? "" : "s"}`} />
            {user.conversations.length === 0 ? (
                <EmptyState icon={<Inbox size={22} />} title="No messages yet" body="Say hello to a mentor from their profile, or a friend from the sidebar." />
            ) : (
                <ul className="overflow-hidden rounded-xl bg-card">
                    {user.conversations.map((c) => (
                        <li key={c.id} className="border-b border-line last:border-b-0">
                            <Link to={`/inbox/${c.id}`} aria-current={c.id === activeId ? "page" : undefined} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-page", c.id === activeId && "bg-brand-soft")}>
                                <Avatar name={c.peerName} hue={c.peerHue} src={peerPhoto(catalogue, user, c)} size="md" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn("truncate text-[14px]", c.unread ? "font-semibold" : "font-medium")}>{c.peerName}</span>
                                        <span className="ml-auto shrink-0 text-[11px] text-caption">{relative(c.updatedAt)}</span>
                                    </div>
                                    <div className={cn("truncate text-[13px]", c.unread ? "text-ink" : "text-muted")}>{c.lastBody || c.peerRole}</div>
                                </div>
                                {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white">{c.unread}</span>}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

function Thread({ id }: { id: string }) {
    const { user, repo, refresh, catalogue } = useData();
    const { toast } = useToast();
    const conv = user.conversations.find((c) => c.id === id);
    const [messages, setMessages] = useState<Message[] | null>(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const bottom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        setMessages(null);
        void repo.loadMessages(id).then((m) => active && setMessages(m));
        void repo.markRead(id).then(refresh);
        const unsub = repo.subscribe(() => void repo.loadMessages(id).then((m) => active && setMessages(m)));
        return () => {
            active = false;
            unsub();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, repo]);
    useEffect(() => {
        bottom.current?.scrollIntoView({ block: "end" });
    }, [messages]);
    // A reply arriving after we opened the thread should read as read.
    useEffect(() => {
        if (conv?.unread) void repo.markRead(id).then(refresh);
    }, [conv?.unread, id, repo, refresh]);

    const send = async () => {
        const body = draft.trim();
        if (!body || busy) return;
        setBusy(true);
        try {
            const m = await repo.sendMessage(id, body);
            setMessages((prev) => [...(prev ?? []), m]);
            setDraft("");
            await refresh();
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't send", "danger");
        }
        setBusy(false);
    };

    if (!conv) return <EmptyState title="Conversation not found" action={<Link to="/inbox" className="font-semibold text-brand underline">Back to inbox</Link>} />;

    return (
        <section className="flex h-full flex-col overflow-hidden rounded-xl bg-card max-md:h-[calc(100dvh-200px)]" aria-label={`Conversation with ${conv.peerName}`}>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Link to="/inbox" className="md:hidden" aria-label="Back to inbox">
                    <ArrowLeft size={18} />
                </Link>
                <Avatar name={conv.peerName} hue={conv.peerHue} src={peerPhoto(catalogue, user, conv)} size="md" />
                <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">{conv.peerKind === "mentor" ? <Link to={`/mentors/${conv.peerId}`}>{conv.peerName}</Link> : conv.peerName}</div>
                    <div className="text-[12px] text-muted">{conv.peerRole}</div>
                </div>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
                {messages === null ? (
                    <p className="text-center text-[13px] text-caption">Loading…</p>
                ) : messages.length === 0 ? (
                    <p className="py-10 text-center text-[13px] text-caption">Say hello — {conv.peerName.split(" ")[0]} usually replies within a day.</p>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-5", m.fromMe ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-page text-ink")}>
                                <p className="whitespace-pre-wrap">{m.body}</p>
                                <time dateTime={m.createdAt} className={cn("mt-1 block text-[10px]", m.fromMe ? "text-white/70" : "text-caption")}>{time(m.createdAt)}</time>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottom} />
            </div>
            <form
                className="flex items-end gap-2 border-t border-line p-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                }}
            >
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                        }
                    }}
                    rows={1}
                    placeholder={`Message ${conv.peerName.split(" ")[0]}…`}
                    aria-label="Message"
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[22px] border border-line-strong px-4 py-2.5 text-[14px] outline-none placeholder:text-caption focus:border-brand"
                />
                <Button type="submit" size="lg" className="!size-11 !p-0" loading={busy} disabled={!draft.trim()} aria-label="Send">
                    {!busy && <Send size={16} />}
                </Button>
            </form>
        </section>
    );
}

/** /inbox/new/:kind/:peerId — opens (or creates) the thread and redirects to it. */
export function NewConversationPage() {
    const { kind, peerId } = useParams();
    const { repo, refresh } = useData();
    const navigate = useNavigate();
    useEffect(() => {
        if (!kind || !peerId) return;
        void repo
            .startConversation(kind as PeerKind, peerId)
            .then(async (c) => {
                await refresh();
                navigate(`/inbox/${c.id}`, { replace: true });
            })
            .catch(() => navigate("/inbox", { replace: true }));
    }, [kind, peerId, repo, refresh, navigate]);
    return <p className="text-[13px] text-caption">Opening conversation…</p>;
}
