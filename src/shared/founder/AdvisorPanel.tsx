import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { askAdvisor, contextFromVenture, type AdvisorCitation, type AdvisorTurn } from "@/lib/founder/advisor";
import { useVenture } from "@/lib/founder/ventureContext";
import { ALL_TOOLS } from "@/lib/founder/tools";

const SPARK = (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
            d="M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6L10 2z"
            fill="currentColor"
        />
    </svg>
);

const CLOSE = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

interface Message {
    role: "user" | "assistant";
    content: string;
    citations?: AdvisorCitation[];
    tools?: string[];
    followUps?: string[];
}

const OPENERS = [
    "How do I know if my idea is any good?",
    "How much money do I need to start?",
    "When should I hire my first salesperson?",
    "What is my business worth?",
];

/**
 * The adviser. Grounded on the same reference material as the tools, and it
 * says where each answer came from. It runs anonymously with a daily
 * allowance, so nothing here needs an account.
 */
export default function AdvisorPanel({ stage }: { stage?: string }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const { venture } = useVenture();
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (open) endRef.current?.scrollIntoView({ block: "end" });
    }, [messages, open]);

    async function send(question: string) {
        const q = question.trim();
        if (!q || busy) return;
        setError(null);
        setBusy(true);
        setInput("");
        const history: AdvisorTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
        setMessages((m) => [...m, { role: "user", content: q }]);

        const { reply, error: err } = await askAdvisor({
            task: "chat",
            question: q,
            history,
            context: contextFromVenture(venture, stage),
        });

        setBusy(false);
        if (err || !reply) {
            setError(err ?? "The adviser could not answer that one.");
            return;
        }
        setRemaining(reply.remaining);
        setMessages((m) => [
            ...m,
            {
                role: "assistant",
                content: reply.answer,
                citations: reply.citations,
                tools: reply.suggestedTools,
                followUps: reply.followUps,
            },
        ]);
    }

    return (
        <>
            {/* An inline invitation rather than a third floating button: MainLayout
                already puts a voice widget and a site chat widget on every page. */}
            <section className="fd-invite">
                <div className="container">
                    <div className="fd-invite__inner">
                        <div>
                            <h2 className="fd-h2">Stuck on something specific?</h2>
                            <p>
                                Ask the adviser. It answers only from the handbook and the 2026 research, tells you which
                                source each answer came from, and says so plainly when the research does not cover your
                                question.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="fd-btn"
                            onClick={() => setOpen(true)}
                            aria-expanded={open}
                            aria-controls="fd-advisor-panel"
                        >
                            {SPARK}
                            <span>Ask the adviser</span>
                        </button>
                    </div>
                </div>
            </section>

            <aside
                id="fd-advisor-panel"
                className={`fd-advisor${open ? " is-open" : ""}`}
                aria-hidden={!open}
                aria-label="Founder adviser"
            >
                <header className="fd-advisor__head">
                    <div>
                        <strong>The adviser</strong>
                        <span className="fd-advisor__sub">
                            Answers only from the handbook and the 2026 research, with sources
                        </span>
                    </div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Close the adviser">
                        {CLOSE}
                    </button>
                </header>

                <div className="fd-advisor__body">
                    {messages.length === 0 ? (
                        <div className="fd-advisor__empty">
                            <p>
                                Ask anything about starting or growing a business. If the research does not cover it, the
                                adviser will say so rather than guess.
                            </p>
                            <div className="fd-advisor__openers">
                                {OPENERS.map((o) => (
                                    <button key={o} type="button" onClick={() => void send(o)}>
                                        {o}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {messages.map((m, i) => (
                        <div key={i} className={`fd-msg fd-msg--${m.role}`}>
                            <div className="fd-msg__text">{m.content}</div>

                            {m.citations?.length ? (
                                <div className="fd-msg__cites">
                                    <span>Based on</span>
                                    {m.citations.map((c) => (
                                        <span key={c.ref} className="fd-msg__cite">
                                            {c.label}
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            {m.tools?.length ? (
                                <div className="fd-msg__tools">
                                    {m.tools.map((slug) => {
                                        const tool = ALL_TOOLS.find((t) => t.slug === slug);
                                        if (!tool) return null;
                                        return (
                                            <Link key={slug} to={`/founder/tool/${tool.slug}`} onClick={() => setOpen(false)}>
                                                Open the {tool.title.toLowerCase()}
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : null}

                            {m.followUps?.length ? (
                                <div className="fd-msg__follow">
                                    {m.followUps.map((f) => (
                                        <button key={f} type="button" onClick={() => void send(f)}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ))}

                    {busy ? <div className="fd-msg fd-msg--assistant fd-msg--busy">Reading the research…</div> : null}
                    {error ? <div className="fd-advisor__error">{error}</div> : null}
                    <div ref={endRef} />
                </div>

                <form
                    className="fd-advisor__form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Ask about your business…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={busy}
                        aria-label="Your question"
                    />
                    <button type="submit" className="fd-advisor__send" disabled={busy || !input.trim()}>
                        Ask
                    </button>
                </form>

                <p className="fd-advisor__foot">
                    {remaining !== null ? `${remaining} questions left today. ` : ""}
                    General guidance only, not legal, tax or investment advice.
                </p>
            </aside>
        </>
    );
}
