import { useState } from "react";
import { IconArrow, IconCheck } from "@/lib/icons";
import { isEmail } from "@/lib/format";
import { submitContact } from "@/lib/phoxta";
import { useCatalog } from "@/state/catalog";

/**
 * The Sunday letter sign-up.
 *
 * There is no separate subscriber list to write to, so a sign-up is submitted as
 * a contact — it lands in the owner's Inbox and CRM as a real person with a real
 * email, which is the whole point of asking. A store with no tenant resolved
 * (local dev) acknowledges without pretending anything was sent.
 */
export default function Newsletter() {
    const { orgId } = useCatalog();
    const [email, setEmail] = useState("");
    const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

    async function subscribe(e: React.FormEvent) {
        e.preventDefault();
        if (state === "busy") return;
        if (!isEmail(email)) {
            setState("error");
            return;
        }
        setState("busy");
        if (orgId) {
            const ok = await submitContact(
                orgId,
                email.split("@")[0],
                email.trim(),
                "Newsletter sign-up",
                "Signed up for the Sunday letter from the storefront footer.",
            );
            setState(ok ? "done" : "error");
            return;
        }
        setState("done");
    }

    return (
        <section className="news">
            <div className="wrap">
                <div className="box">
                    <svg
                        className="leaf"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth={0.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M12 21c0-6 3-11 8-13-1 7-4 11-8 13z" />
                        <path d="M12 21c0-6-3-11-8-13 1 7 4 11 8 13z" />
                        <path d="M12 21V9" />
                    </svg>
                    <div>
                        <div className="eyebrow">The Sunday letter</div>
                        <h2 className="serif">
                            Ten percent off your first order, and a note <em>worth</em> opening.
                        </h2>
                        <p>One email a week — a harvest update, one honest product tip, no discount spam.</p>
                    </div>
                    <div>
                        {state === "done" ? (
                            <div style={{ padding: "12px 18px", fontWeight: 600, display: "flex", gap: 8 }}>
                                <IconCheck /> You&rsquo;re in — check {email} for your code.
                            </div>
                        ) : (
                            <form onSubmit={subscribe} noValidate>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    placeholder="you@email.com"
                                    aria-label="Email"
                                    aria-invalid={state === "error"}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (state === "error") setState("idle");
                                    }}
                                />
                                <button className="btn" disabled={state === "busy"}>
                                    {state === "busy" ? "Signing up…" : "Subscribe"}
                                    <span className="arr">
                                        <IconArrow />
                                    </span>
                                </button>
                            </form>
                        )}
                        <small>
                            {state === "error"
                                ? "That didn't go through — check the address and try again."
                                : "By subscribing you agree to our privacy policy."}
                        </small>
                    </div>
                </div>
            </div>
        </section>
    );
}
